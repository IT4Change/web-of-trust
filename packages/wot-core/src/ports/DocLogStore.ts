/**
 * DocLogStore — durable, append-only per-(deviceId, docId) log with a durable
 * seq counter. The crash-safe foundation under the CRDT sync layer (VE-2..VE-11
 * make Yjs/Automerge write and read log entries through this store).
 *
 * Engine-neutral: this port knows nothing about Yjs, Automerge, or the wire. It
 * stores opaque, already-encrypted-and-signed LogEntry JWS strings keyed by
 * (deviceId, seq), derives the next seq from the durably persisted maximum, and
 * serializes seq reservation across tabs via an injected {@link SeqLock}.
 *
 * ── Security invariants (Sync 002) ──────────────────────────────────────────
 *
 * 1. Crash-safe persistence BEFORE send (Sync 002 Z.207-211): the COMPLETE
 *    encrypted+signed log-entry JWS is durably persisted under its (deviceId,
 *    seq) BEFORE the first send attempt — not just a seq counter. After a crash,
 *    a reserved seq WITHOUT a persisted entry is NEVER re-assigned to fresh
 *    plaintext. Rationale: seq=k twice with divergent plaintext means reuse of
 *    (Key, nonce(deviceId, k)) — and the log-payload nonce is deterministic
 *    (SHA-256(deviceId | seq)[0:12]) — which breaks AES-GCM.
 *
 * 2. Cross-tab seq atomicity (Sync 002 Z.108): multiple tabs of the same origin
 *    share deviceId + Content-Key. {@link DocLogStore.appendLocalEntry} MUST be
 *    serialized across tabs. A plain IndexedDB readwrite transaction per tab is
 *    NOT enough: separate connections interleave between read and write,
 *    yielding a duplicate seq=k and therefore a nonce reuse. The atomicity
 *    boundary is the {@link SeqLock} (Web Locks across tabs), NOT the IDB txn —
 *    an IDB transaction does not survive an `await` across the async crypto
 *    `build()` phase (it auto-closes on the next microtask).
 *
 * ── How the API enforces invariant 1 structurally ───────────────────────────
 *
 * There is exactly ONE write primitive, {@link DocLogStore.appendLocalEntry},
 * taking a `build(seq)` callback that returns the entry JWS. There is NO public
 * `reserveSeq()`. A caller therefore CANNOT burn a seq without also persisting
 * the entry built for it: the store reserves seq = maxSeq + 1, calls build(seq)
 * (the async crypto), and persists the returned JWS — all inside the lock,
 * persisting before returning (and thus before any send). seq starts at 0.
 *
 * ── Crash-scenario analysis (see also IndexedDBDocLogStore) ──────────────────
 *
 * - Crash between readMaxSeq and persist: no entry persisted, seq NOT consumed
 *   (nothing was sent). The next start reads the SAME maxSeq, so the same seq
 *   with NEW plaintext is safe — no wire reuse occurred.
 * - Crash after persist, before send: entry sits as 'pending'. The retry sends
 *   the bit-identical JWS (the broker dedups via contentHash). NEVER rebuilt.
 *   Hence: 'pending' status + {@link DocLogStore.getPending} +
 *   {@link DocLogStore.markAcked}. The retry returns the STORED JWS unchanged.
 *
 * ── Out of scope for VE-1 (Phase 1) ─────────────────────────────────────────
 *
 * The reject-handling orchestration path (relay error SEQ_COLLISION_DETECTED →
 * mint new deviceId + device-revoke + restart at seq=0) needs send/messaging
 * and lands in Phase 2 / VE-4. This store only has to MAKE THAT MODEL POSSIBLE:
 * everything is keyed by deviceId, so "new deviceId, seq=0" is automatically a
 * fresh namespace with no collision against the old device's log.
 */

/** A persisted local or applied-remote log entry. */
export interface LocalLogEntry {
  /** The document this entry belongs to. */
  docId: string
  /** The authoring device. The per-device seq namespace is keyed by this. */
  deviceId: string
  /** Monotonic per-(deviceId, docId) sequence number, starting at 0. */
  seq: number
  /**
   * The complete encrypted+signed LogEntryPayload JWS (compact form). Stored
   * verbatim; never rebuilt. Optional only for applied-remote bookkeeping that
   * does not retain the wire bytes — local entries always carry it.
   */
  entryJws: string
  /**
   * 'pending' until the entry has been acknowledged by the broker; 'acked'
   * afterwards. Pending entries are replayed on reconnect with the SAME JWS.
   */
  status: 'pending' | 'acked'
  /** Local creation time (ms since epoch), used for stable pending ordering. */
  createdAt: number
}

/** Parameters for {@link DocLogStore.appendLocalEntry}. */
export interface AppendLocalEntryParams {
  deviceId: string
  docId: string
  /**
   * Builds the encrypted+signed entry JWS for the reserved seq. Invoked exactly
   * once, inside the seq lock, AFTER the seq has been reserved and BEFORE the
   * entry is persisted. This is where the adapter (later phase) derives the
   * deterministic nonce, encrypts the CRDT update, and signs the LogEntry — the
   * store never touches crypto itself. If build rejects, NO entry is persisted
   * and the seq stays free for the next attempt (see invariant 1 / crash case).
   */
  build: (seq: number) => Promise<string>
}

/** Remote-entry bookkeeping recorded after a successful apply. */
export interface RecordRemoteAppliedEntry {
  docId: string
  deviceId: string
  seq: number
  /** Optional: the remote wire JWS, if the caller wants it retained. */
  entryJws?: string
}

export interface DocLogStore {
  /** Open/initialize the backing store. Idempotent. */
  init(): Promise<void>

  /**
   * Atomically (under the SeqLock) reserve seq = maxSeq + 1 for (deviceId,
   * docId), call build(seq) (the async crypto), and durably persist the
   * returned JWS as a 'pending' entry BEFORE returning — and thus before any
   * send. Returns the persisted entry. seq starts at 0.
   */
  appendLocalEntry(params: AppendLocalEntryParams): Promise<LocalLogEntry>

  /**
   * Record an entry from another device after it has been successfully applied,
   * so heads stay correct and re-applies are idempotent. Recorded entries are
   * 'acked' (they are not part of our outbox) and are folded into heads.
   */
  recordRemoteApplied(entry: RecordRemoteAppliedEntry): Promise<void>

  /**
   * sync-request heads: the max known seq per device for a doc — own writes plus
   * applied-remote entries — as Record<deviceId, seq>. Empty for unknown docs.
   */
  getKnownHeads(docId: string): Promise<Record<string, number>>

  /** Fetch a single entry by its composite key, or null if absent. */
  getEntry(docId: string, deviceId: string, seq: number): Promise<LocalLogEntry | null>

  /**
   * All locally authored entries still awaiting ack, ascending by (deviceId,
   * seq) then createdAt — the reconnect retry order. Each carries its STORED
   * JWS, which the retry MUST send unchanged.
   */
  getPending(): Promise<LocalLogEntry[]>

  /** Mark a previously pending entry as acknowledged. No-op if already acked/absent. */
  markAcked(docId: string, deviceId: string, seq: number): Promise<void>

  /** Remove all entries. Test/reset helper. */
  clear(): Promise<void>
}
