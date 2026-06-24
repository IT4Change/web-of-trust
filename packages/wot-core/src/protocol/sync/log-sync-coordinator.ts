import type { ProtocolCryptoAdapter } from '../crypto/ports'
import type { DocLogStore, LocalLogEntry, PendingSpaceRotate } from '../../ports/DocLogStore'
import { decodeBase64Url } from '../crypto/encoding'
import {
  createLogEntryJwsWithSigner,
  createLogEntryMessage,
  parseLogEntryMessage,
  verifyLogEntryJws,
  type LogEntryMessage,
  type LogEntryPayload,
} from './log-entry'
import {
  createSyncRequestMessage,
  parseSyncResponseMessage,
  type SyncResponseMessage,
} from './sync-messages'
import { decryptLogPayload, encryptLogPayload } from './encryption'
import { classifyLocalBrokerSeqConsistency } from './seq-consistency'
import { classifyLogEntryKeyDisposition } from './log-entry-key-disposition'
import {
  createPresentCapabilityControlFrame,
} from './present-capability-control-frame'
import { ControlFrameRejectedError, type ControlFrame, type ControlFrameReceipt } from './control-frame-transport'
import { isKnownBrokerErrorCode, type BrokerErrorCode } from './broker-error'
import type { JcsEd25519SignFn } from '../crypto/jws'

/**
 * LogSyncCoordinator — engine-neutral orchestration of the Sync 002/003 log
 * path (VE-2/3/4/8/9, wot-sync@0.1).
 *
 * One coordinator instance is bound per docId. It owns:
 *  - the **first-publication state machine** (VE-2, Sync 002 §207): for a Space,
 *    space-register (VE-8) → present-capability (VE-9) → sync-request/head-abgleich
 *    → first log-entry; for a Personal-Doc, present-capability → sync-request →
 *    first log-entry.
 *  - **strictly sequential control frames per (socket, docId)** (VE-9): the relay
 *    correlates control-frame receipts by `messageId == docId`, which is NOT
 *    unique across families, so at most one docId-control-frame is in flight.
 *  - **capability sourcing / re-presentation** (VE-9) and the **reject-disposition
 *    table** (VE-4): CAPABILITY_* → re-present, DEVICE_REVOKED → restore-clone,
 *    DEVICE_NOT_REGISTERED → re-register, AUTHOR_MISMATCH → hard stop,
 *    SEQ_COLLISION_DETECTED → restore-clone.
 *  - the **write path** (VE-2): reserve seq atomically via DocLogStore.appendLocalEntry,
 *    build the encrypted+signed log-entry JWS for that exact seq, persist BEFORE
 *    send, then send as a `log-entry/1.0` plaintext envelope.
 *  - the **read path** (VE-3, LOOP-GUARD): verify → decrypt → applyRemote, record
 *    heads, NEVER write or re-broadcast. Engine-foreign payloads are skipped.
 *  - **catch-up** (VE-4): present read-capability, then sync-request(localHeads)
 *    → sync-response → idempotent apply.
 *
 * Engine specifics are injected via {@link LogSyncEngineHooks}; Yjs and the
 * future Automerge adapter reuse this class unchanged.
 */

/** Disposition the coordinator surfaces to the caller after a reject. */
export type RejectDisposition =
  | 'capability-re-present'
  | 'device-re-register'
  | 'restore-clone'
  | 'hard-stop'
  | 'retry'
  | 'unknown'

/** Maps a broker error code to its VE-4 client action (the disposition table). */
export function classifyRejectDisposition(code: BrokerErrorCode): RejectDisposition {
  switch (code) {
    case 'CAPABILITY_REQUIRED':
    case 'CAPABILITY_EXPIRED':
    case 'CAPABILITY_GENERATION_STALE':
    case 'CAPABILITY_INVALID':
      return 'capability-re-present'
    case 'DEVICE_NOT_REGISTERED':
      return 'device-re-register'
    case 'DEVICE_REVOKED':
      return 'restore-clone'
    case 'SEQ_COLLISION_DETECTED':
      return 'restore-clone'
    case 'AUTHOR_MISMATCH':
      return 'hard-stop'
    case 'DEVICE_ID_CONFLICT':
      return 'device-re-register'
    case 'NONCE_REPLAY':
    case 'RATE_LIMITED':
    case 'INTERNAL_ERROR':
      return 'retry'
    default:
      return 'unknown'
  }
}

/** Hard-stop signal for the AUTHOR_MISMATCH bug class (no retry). */
export class AuthorMismatchError extends Error {
  readonly docId: string
  readonly deviceId: string
  readonly authorKid: string
  constructor(docId: string, deviceId: string, authorKid: string) {
    super(
      `AUTHOR_MISMATCH for docId=${docId} deviceId=${deviceId} authorKid=${authorKid}: ` +
        'authorKid<->deviceId binding bug — hard stop, no retry',
    )
    this.name = 'AuthorMismatchError'
    this.docId = docId
    this.deviceId = deviceId
    this.authorKid = authorKid
  }
}

/**
 * A write-path reject the relay routed back as `{ type:'error', thid, code }`
 * after a SENT log-entry (P2-NIT-1, VE-4/VE-5). The coordinator classifies the
 * code and, for the actions whose *mechanism* is an adapter/runtime concern
 * (mint a new deviceId + device-revoke the old one + re-register), delegates to
 * {@link WriteRejectHandler}. Engine-neutral so Phase 4 (Automerge) reuses it.
 */
export interface WriteReject {
  /** The structured broker error code (matched on code, never free-text). */
  code: BrokerErrorCode
  /** The VE-4 disposition the code maps to. */
  disposition: RejectDisposition
  /** The docId the rejected write targeted. */
  docId: string
  /** The deviceId under which the rejected write was authored. */
  deviceId: string
}

/**
 * Adapter/runtime hook the coordinator calls on a write-path reject whose
 * resolution it cannot perform engine-internally (P2-NIT-1):
 *  - `restore-clone` (SEQ_COLLISION_DETECTED / DEVICE_REVOKED): mint a NEW
 *    deviceId, device-revoke the old one, restart the (deviceId,docId) log at
 *    seq=0, and re-write pending under the new deviceId. NEVER re-use the
 *    colliding seq with divergent plaintext.
 *  - `device-re-register` (DEVICE_NOT_REGISTERED / DEVICE_ID_CONFLICT): register
 *    a deviceId (challenge-response) before the next log-entry.
 * The coordinator handles `capability-re-present` itself and HARD-STOPS
 * `hard-stop` (AUTHOR_MISMATCH) before this hook is ever called.
 *
 * The handler returns the deviceId the coordinator MUST use for subsequent
 * writes (a NEW one for restore-clone; the same one for a pure re-register).
 * Returning a value re-binds the coordinator's seq namespace atomically.
 */
export type WriteRejectHandler = (reject: WriteReject) => Promise<{ deviceId: string } | void>

/** A control frame the coordinator sends and awaits a receipt for. */
export interface ControlFrameTransport {
  sendControlFrame(frame: ControlFrame): Promise<ControlFrameReceipt>
}

/** A `send`-envelope transport for `log-entry` / `sync-request`. */
export interface EnvelopeTransport {
  send(envelope: LogEntryMessage | SyncResponseMessage | object): Promise<unknown>
  onMessage?(callback: (message: unknown) => void | Promise<void>): () => void
}

/** Capability material the coordinator presents + re-issues for a docId. */
export interface CapabilitySource {
  /**
   * Returns a fresh, valid capability JWS for the docId (read+write). The
   * coordinator calls this before the first present-capability and again on a
   * CAPABILITY_* reject (re-issue / refresh). Space-docs return a Space-Capability
   * (`kid = wot:space:<spaceId>#cap-<generation>`); Personal-docs return a
   * self-issued Personal-Doc-Capability (`kid = <did>#<vm>`).
   */
  getCapabilityJws(): Promise<string>
}

/** Engine-specific encode/apply (Yjs/Automerge supply these). */
export interface LogSyncEngineHooks {
  /** The CRDT engine identifier carried for engine-foreign skip (VE-3). */
  readonly engine: string
  /** Encode the local CRDT update for the log payload plaintext. Identity for raw-bytes engines. */
  encodeUpdate(update: Uint8Array): Uint8Array
  /** Apply a decrypted remote update to the CRDT with origin='remote' (LOOP-GUARD). */
  applyRemoteUpdate(plaintext: Uint8Array): void | Promise<void>
}

export interface LogSyncCoordinatorConfig {
  docId: string
  /** The local device UUID (per-(deviceId,docId) seq namespace). */
  deviceId: string
  /** The local routing DID (envelope from/to for own-device multi-device sync). */
  ownDid: string
  /** The author key id (`did:key:...#...`); MUST match {@link signLogEntry}'s key. */
  authorKid: string
  crypto: ProtocolCryptoAdapter
  logStore: DocLogStore
  control: ControlFrameTransport
  envelopes: EnvelopeTransport
  capabilities: CapabilitySource
  hooks: LogSyncEngineHooks
  /** Signs the log-entry JWS signing input with the author Ed25519 key. */
  signLogEntry: JcsEd25519SignFn
  /**
   * The routing recipients for outgoing log-entry / sync-request envelopes — the
   * space's member DIDs (Personal-docs: just the own DID). Defaults to `[ownDid]`
   * (own-device multi-device). The relay broadcasts to every member's sockets.
   */
  getRecipients?: () => Promise<string[]> | string[]
  /** Resolves the current Space Content Key + generation for the docId. */
  getContentKey(): Promise<{ key: Uint8Array; generation: number } | null>
  /** Resolves a content key by generation for decrypting remote/historic entries. */
  getContentKeyByGeneration(generation: number): Promise<Uint8Array | null>
  /** Available key generations for blocked-by-key classification (VE-5 preview). */
  getAvailableKeyGenerations(): Promise<readonly number[]>
  /**
   * Sends the space-register control frame for the docId (VE-8), or returns
   * undefined for Personal-docs (no space-register). Idempotent re-registers are
   * first-writer-wins on the relay. The coordinator awaits its receipt before
   * present-capability.
   */
  sendSpaceRegister?: () => Promise<ControlFrameReceipt | undefined>
  /**
   * Write-path reject handler (P2-NIT-1, VE-4/VE-5). Called when the relay
   * rejects a SENT log-entry with a restore-clone / device-re-register
   * disposition; the handler performs the deviceId-minting / device-revoke /
   * re-register mechanism (an adapter/runtime concern) and returns the deviceId
   * the coordinator must use next. Omitted ⇒ the reject is surfaced via the
   * return of {@link LogSyncCoordinator.handleWriteReject} but no restore is
   * performed (the coordinator never mints a deviceId itself).
   */
  onWriteRejected?: WriteRejectHandler
  /**
   * Called after a restore-clone has re-bound the active deviceId (VE-4/VE-5),
   * with the NEW deviceId. The adapter re-writes the current CRDT state under the
   * new deviceId from seq=0 (e.g. one fresh log-entry carrying the full Yjs state)
   * — this is the "pending neu schreiben unter neuer deviceId" step. The colliding
   * seq under the OLD deviceId is abandoned (never re-used with divergent
   * plaintext). When omitted, the coordinator falls back to {@link resendPending}
   * (only safe when the store's pending entries were already re-keyed externally).
   */
  onAfterRestoreClone?: (newDeviceId: string) => Promise<void> | void
  /**
   * VE-10 observability: surfaces the outcome of a broker `space-rotate` (member
   * removal). `confirmed` — the broker advanced its generation (receipt) OR a
   * re-send was rejected as already-enforced (AUTH_INVALID / STALE), so the
   * pending intent is cleared. `broker-pending` — the send hit a transient error
   * (offline / timeout / reject other than already-enforced); the intent stays
   * DURABLE and is retried on the next (re)connect/publish. Lets the adapter log
   * the non-swallowed status without removeMember having to throw.
   */
  onSpaceRotateStatus?: (status: SpaceRotateStatus) => void
  /** Clock (testable). */
  now?: () => Date
}

/** Outcome of a durable broker space-rotate attempt (VE-10). */
export interface SpaceRotateStatus {
  docId: string
  newGeneration: number
  /**
   * - `confirmed`: broker advanced its generation (receipt) OR a re-send was
   *   rejected as already-enforced (AUTH_INVALID / CAPABILITY_GENERATION_STALE).
   *   The durable pending intent has been cleared.
   * - `broker-pending`: a transient failure (offline / timeout / other reject);
   *   the durable pending intent REMAINS and will be retried on reconnect/publish.
   */
  outcome: 'confirmed' | 'broker-pending'
}

/** Result of {@link LogSyncCoordinator.receiveLogEntry}. */
export type ReceiveLogEntryResult =
  | { disposition: 'applied'; deviceId: string; seq: number }
  | { disposition: 'idempotent-skip'; deviceId: string; seq: number }
  | { disposition: 'engine-foreign-skip'; reason: string }
  | { disposition: 'blocked-by-key'; keyGeneration: number }
  | { disposition: 'rejected'; reason: string }

export class LogSyncCoordinator {
  private readonly config: LogSyncCoordinatorConfig
  private readonly now: () => Date

  /**
   * The ACTIVE local deviceId for the seq namespace. Starts at `config.deviceId`
   * and is re-bound by a restore-clone (VE-4/VE-5): a SEQ_COLLISION /
   * DEVICE_REVOKED reject mints a NEW deviceId (via {@link WriteRejectHandler}),
   * and every subsequent write reserves seq from 0 under that new id. The
   * colliding seq is NEVER re-used with divergent plaintext.
   */
  private deviceId: string

  /**
   * Per-(socket,docId) control-frame serialization (VE-9). Because this
   * coordinator is bound to ONE docId on ONE messaging adapter (= one socket),
   * a single Promise tail enforces "never two docId-equal control frames
   * in-flight": every control frame chains onto the previous one.
   */
  private controlTail: Promise<unknown> = Promise.resolve()

  /** Idempotency guard for applied (deviceId,seq) — mirrors the durable store. */
  private readonly applied = new Set<string>()

  /** Whether space-register + present-capability have completed on this connection. */
  private published = false
  /** In-flight first-publication promise (deduped). */
  private publishing: Promise<void> | null = null

  /**
   * In-flight sync-requests awaiting their async sync-response, keyed by the
   * request id (= response thid). The relay answers a sync-request asynchronously
   * as a routed message, so {@link handleIncoming} resolves the matching waiter.
   */
  private readonly pendingSyncRequests = new Map<
    string,
    (response: SyncResponseMessage) => void
  >()

  /**
   * VE-5 blocked-by-key buffer: incoming log-entry envelopes whose keyGeneration
   * is not yet available locally. Keyed by `${deviceId} ${seq}` (the
   * authoring device's, NOT ours) so a re-buffer is idempotent and a re-applied
   * entry is dropped from the buffer. Replayed (origin='remote') after a key
   * import — NEVER through the local write path (LOOP-GUARD).
   */
  private readonly blockedByKey = new Map<string, LogEntryMessage>()

  /**
   * Sent log-entry messageId → the (deviceId, seq) it carried, so a routed
   * write-path reject (`{ type:'error', thid }`) correlates to the exact write
   * (P2-NIT-1). Bounded; entries are dropped on correlate or when the ring caps.
   */
  private readonly inFlightWrites = new Map<string, { deviceId: string; seq: number }>()

  /** Re-entrancy guard so a single reject triggers exactly one restore-clone. */
  private restoreCloneInFlight = false

  constructor(config: LogSyncCoordinatorConfig) {
    this.config = config
    this.now = config.now ?? (() => new Date())
    this.deviceId = config.deviceId
  }

  /** The current active local deviceId (re-bound by a restore-clone). */
  getDeviceId(): string {
    return this.deviceId
  }

  /**
   * Whether this coordinator has a SENT log-entry awaiting a receipt under the
   * given messageId. A multi-doc adapter uses this to route a routed write-path
   * `error` frame (`thid == messageId`) to the OWNING coordinator only, so an
   * error for doc A never triggers a (false) restore-clone on doc B's coordinator.
   */
  hasInFlightWrite(messageId: string): boolean {
    return this.inFlightWrites.has(messageId)
  }

  /** Reset connection-scoped state on (re)connect — a new socket = empty scope cache (VE-4/VE-9). */
  resetForReconnect(): void {
    this.published = false
    this.publishing = null
    this.controlTail = Promise.resolve()
    this.pendingSyncRequests.clear()
  }

  /**
   * Single inbound dispatcher (wire the messaging adapter's onMessage to this).
   * Routes `log-entry/1.0` to the LOOP-GUARD read path and `sync-response/1.0` to
   * the matching in-flight sync-request waiter. Anything else is ignored here.
   */
  async handleIncoming(message: unknown): Promise<void> {
    const type = (message as { type?: unknown })?.type
    if (type === 'https://web-of-trust.de/protocols/log-entry/1.0') {
      await this.receiveLogEntry(message)
      return
    }
    // P2-NIT-1: a routed write-path reject for a SENT log-entry. The relay
    // answers an ingest-gate failure with `{ type:'error', thid, code }` (NOT a
    // control-frame ControlFrameRejectedError, which only the control channel
    // throws). Correlate thid → the rejected (deviceId, seq) and drive the
    // reject-disposition action (VE-4/VE-5).
    if (type === 'error') {
      await this.onWritePathErrorFrame(message)
      return
    }
    if (type === 'https://web-of-trust.de/protocols/sync-response/1.0') {
      let response: SyncResponseMessage
      try {
        response = parseSyncResponseMessage(message)
      } catch {
        return
      }
      if (response.body.docId !== this.config.docId) return
      const waiter = this.pendingSyncRequests.get(response.thid)
      if (waiter) {
        this.pendingSyncRequests.delete(response.thid)
        waiter(response)
      } else {
        // Unsolicited / late sync-response: still apply idempotently (catch-up safety).
        await this.applySyncResponse(response)
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Control-frame serialization (VE-9)
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Enqueue a control frame so it runs strictly after every previously enqueued
   * control frame for this (socket, docId). Never two docId-equal control frames
   * in flight (VE-9 receipt-ambiguity guard).
   */
  private enqueueControlFrame(frame: ControlFrame): Promise<ControlFrameReceipt> {
    const run = this.controlTail.then(() => this.config.control.sendControlFrame(frame))
    // Keep the tail alive even if this frame rejects (next frame still serializes).
    this.controlTail = run.then(
      () => undefined,
      () => undefined,
    )
    return run
  }

  // ──────────────────────────────────────────────────────────────────────────
  // First-publication state machine (VE-2 §207) + present-capability (VE-9)
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Run the closed first-publication sequence exactly once per connection
   * (VE-2 §207):
   *   (1) [Space] space-register, await its receipt (VE-8)
   *   (2) present-capability(read+write), await its receipt (VE-9)
   *   (3) sync-request → broker head-abgleich (VE-4)
   *   (4) classifyLocalBrokerSeqConsistency → restore-clone if broker_seq>local_seq
   * Only after this may the first log-entry be sent. Idempotent + deduped.
   */
  async ensurePublished(): Promise<void> {
    if (this.published) return
    if (this.publishing) return this.publishing
    this.publishing = this.runFirstPublication()
    try {
      await this.publishing
      this.published = true
    } finally {
      this.publishing = null
    }
  }

  private async runFirstPublication(): Promise<void> {
    // (1) Space-register (VE-8). Personal-docs skip this. Idempotent re-register
    //     is first-writer-wins on the relay. A reject is run through the
    //     disposition table so AUTHOR_MISMATCH hard-stops here too (no swallow).
    if (this.config.sendSpaceRegister) {
      try {
        await this.config.sendSpaceRegister()
      } catch (err) {
        // dispositionForError throws AuthorMismatchError on a hard stop; other
        // codes are surfaced raw (SPACE_ALREADY_REGISTERED with a conflicting set
        // is a genuine error the caller must see).
        this.dispositionForError(err)
        throw err
      }
    }
    // (1.5) VE-10: re-drive any DURABLE space-rotate intent that did not get a broker
    //     receipt before (transient failure / app restart) — AFTER space-register (the
    //     space must be registered for the relay to accept a rotate) but BEFORE
    //     present-capability. Ordering matters: a pending rotate means our LOCAL
    //     generation is already ahead of the broker's, so our capability is the NEW
    //     generation; advancing the broker first lets the subsequent present-capability
    //     verify against the rotated key (otherwise it would fail against the broker's
    //     stale-generation key and throw before the retry could run). The publish path
    //     runs on first-publication AND on every reconnect re-publish (resetForReconnect
    //     → ensurePublished), so the broker invalidation is GUARANTEED eventually-
    //     consistent. Idempotent (broker gate); a fresh failure keeps the durable
    //     intent for the next reconnect. Never throws.
    await this.retryPendingSpaceRotates().catch(() => {})
    // (2) present-capability (VE-9), with the reject-disposition retry loop.
    await this.presentCapabilityWithRetry()
    // (3)+(4) sync-request head-abgleich + seq-consistency (VE-4). BLOCKER-1b
    //     defense-in-depth: a broker_seq>local_seq disposition is no longer dead
    //     code — it is acted on HERE (restore-clone BEFORE the first write), so a
    //     seq=0 is never re-entered under a broker-known deviceId.
    const result = await this.catchUpInternal({ presentCapabilityFirst: false })
    await this.actOnRestoreDisposition(result)
  }

  /**
   * Present the current capability and await its receipt. On a CAPABILITY reject
   * re-source the capability and re-present (VE-9 reject-semantics). Other reject
   * codes propagate (the caller maps DEVICE / AUTHOR_MISMATCH dispositions).
   */
  private async presentCapabilityWithRetry(maxAttempts = 3): Promise<void> {
    let lastError: unknown
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const capabilityJws = await this.config.capabilities.getCapabilityJws()
      const frame = createPresentCapabilityControlFrame({ capabilityJws })
      try {
        await this.enqueueControlFrame(frame)
        return
      } catch (err) {
        lastError = err
        const disposition = this.dispositionForError(err)
        if (disposition === 'capability-re-present') continue
        throw err
      }
    }
    throw lastError instanceof Error ? lastError : new Error('present-capability failed')
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Write path (VE-2)
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Write a local CRDT update through the log path (VE-2):
   *  - ensurePublished() first (no log-entry before present-capability receipt),
   *  - appendLocalEntry reserves seq atomically and persists the JWS BEFORE send,
   *  - send the `log-entry/1.0` plaintext envelope.
   * Returns the persisted entry, or null if there is no content key yet.
   *
   * LOOP-GUARD: this is the ONLY producer of outgoing log-entry envelopes. The
   * read path never calls it. One local edit → one log-entry envelope.
   */
  async writeLocalUpdate(update: Uint8Array): Promise<LocalLogEntry | null> {
    const content = await this.config.getContentKey()
    if (!content) return null

    await this.ensurePublished()

    const encoded = this.config.hooks.encodeUpdate(update)
    const { docId } = this.config
    // The active deviceId is mutable (a restore-clone re-binds it). authorKid is
    // the Identity-Key DID#vm — it does NOT change on a restore-clone (only the
    // per-device seq namespace is reset under the new deviceId).
    const deviceId = this.deviceId
    const authorKid = this.config.authorKid

    const entry = await this.config.logStore.appendLocalEntry({
      deviceId,
      docId,
      // build(seq) runs INSIDE the store's seq lock; the nonce binds (deviceId,seq)
      // and carries NO keyGeneration, so a generation switch can never collide a
      // seq (VE-2 invariant). Re-emission of a pending entry sends this exact JWS.
      build: async (seq: number) => {
        const payloadEncryption = await encryptLogPayload({
          crypto: this.config.crypto,
          spaceContentKey: content.key,
          deviceId,
          seq,
          plaintext: encoded,
        })
        const payload: LogEntryPayload = {
          seq,
          deviceId,
          docId,
          authorKid,
          keyGeneration: content.generation,
          data: payloadEncryption.blobBase64Url,
          timestamp: this.now().toISOString(),
        }
        return createLogEntryJwsWithSigner({ payload, sign: this.config.signLogEntry })
      },
    })

    await this.sendLogEntryEnvelope(entry.entryJws, entry.deviceId, entry.seq)
    return entry
  }

  /**
   * Re-send a pending entry's STORED JWS unchanged (reconnect retry, VE-2).
   *
   * CONCERN-1: filter to the ACTIVE deviceId. After a restore-clone re-bound the
   * deviceId, the OLD (revoked/colliding) deviceId's entries stay 'pending' in
   * the store (markAcked never ran for them — they were rejected, not accepted).
   * Re-emitting them on every reconnect would re-trigger DEVICE_REVOKED /
   * SEQ_COLLISION_DETECTED → a restore-clone reconnect loop (the same bug class as
   * the 5000+-outbox). The active-deviceId filter stops the loop: only entries the
   * relay can still accept are re-sent.
   */
  async resendPending(): Promise<void> {
    const pending = await this.config.logStore.getPending()
    for (const entry of pending) {
      if (entry.docId !== this.config.docId) continue
      if (entry.deviceId !== this.deviceId) continue
      await this.sendLogEntryEnvelope(entry.entryJws, entry.deviceId, entry.seq)
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VE-10: durable, idempotent broker space-rotate (member-removal revocation)
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Enqueue + drive a broker `space-rotate` (VE-10, Sync 003 capability-revoke-
   * über-rotation). Called by removeMember AFTER the local key rotation:
   *
   *  1. DURABLY persist the intent (spaceId, newGeneration, the SIGNED frame)
   *     BEFORE any send — so a transient relay failure / crash can never drop the
   *     broker-side capability revocation. This persist MUST complete before
   *     removeMember resolves (the reviewer MUST: "removeMember darf NICHT
   *     erfolgreich abschliessen, solange die Broker-Rotation weder bestätigt NOCH
   *     durabel für Retry persistiert ist").
   *  2. Attempt to send (idempotent — see {@link attemptSpaceRotate}).
   *
   * Decoupled from the LOCAL key rotation: removeMember rotates + signs ONCE; this
   * NEVER re-rotates or re-signs. A retry re-sends the STORED frame unchanged.
   *
   * Returns the outcome (confirmed | broker-pending). Does NOT throw on a transient
   * failure: the durable record + reconnect retry GUARANTEE eventual enforcement,
   * so removeMember can resolve with the intent safely persisted. AUTH_INVALID-on-
   * first-send (e.g. a non-admin / wrong key) is a genuine error and propagates.
   */
  async enqueueSpaceRotate(params: {
    newGeneration: number
    /** The complete signed `space-rotate` control frame `{ type, rotationJws }` (JSON-serializable). */
    rotationFrame: ControlFrame
  }): Promise<SpaceRotateStatus> {
    const record: PendingSpaceRotate = {
      docId: this.config.docId,
      newGeneration: params.newGeneration,
      rotationFrameJson: JSON.stringify(params.rotationFrame),
      createdAt: this.now().getTime(),
    }
    // (1) Durable-persist BEFORE the first send (the MUST). Even if the process
    //     dies right here, the next start retries from the durable store.
    await this.config.logStore.putPendingSpaceRotate(record)
    // (2) Best-effort immediate send; a transient failure leaves the record for
    //     the reconnect retry (never swallowed without persistence).
    return this.attemptSpaceRotate(record, { firstSend: true })
  }

  /**
   * Re-send every outstanding durable space-rotate intent for THIS doc (reconnect /
   * publish path). Idempotent: the broker gate accepts only newGeneration ===
   * current + 1; an already-applied rotate is rejected as already-enforced and the
   * intent is cleared (no endless retry). A still-transient failure keeps the
   * intent for the next attempt. Returns the number of intents that converged
   * (confirmed) on this pass.
   */
  async retryPendingSpaceRotates(): Promise<number> {
    const record = await this.config.logStore.getPendingSpaceRotate(this.config.docId)
    if (!record) return 0
    const status = await this.attemptSpaceRotate(record, { firstSend: false })
    return status.outcome === 'confirmed' ? 1 : 0
  }

  /**
   * Send one space-rotate frame and reconcile the durable intent with the outcome:
   *  - receipt → DELETE pending (broker advanced its generation), status confirmed.
   *  - reject AUTH_INVALID / CAPABILITY_GENERATION_STALE → the broker is ALREADY at
   *    (or past) newGeneration; the rotation is already enforced → DELETE pending,
   *    status confirmed. (Idempotency: a re-sent already-applied rotate fails the
   *    relay's `newGeneration === current + 1` gate with AUTH_INVALID.)
   *  - any other reject / transient error / timeout → KEEP pending (durable retry),
   *    status broker-pending. On the FIRST send, a hard AUTH_INVALID is a genuine
   *    authorization error and is re-thrown so the caller sees it; on a RETRY it is
   *    treated as already-enforced (the only way a previously accepted rotate now
   *    rejects is that it already landed).
   */
  private async attemptSpaceRotate(
    record: PendingSpaceRotate,
    opts: { firstSend: boolean },
  ): Promise<SpaceRotateStatus> {
    let frame: ControlFrame
    try {
      frame = JSON.parse(record.rotationFrameJson) as ControlFrame
    } catch {
      // A corrupt stored frame can never be enforced — drop it so it does not loop.
      await this.config.logStore.deletePendingSpaceRotate(record.docId)
      return this.reportSpaceRotate(record, 'confirmed')
    }
    try {
      await this.enqueueControlFrame(frame)
      // Receipt: the broker advanced its generation. Enforcement done.
      await this.config.logStore.deletePendingSpaceRotate(record.docId)
      return this.reportSpaceRotate(record, 'confirmed')
    } catch (err) {
      const code = brokerErrorCodeOf(err)
      if (this.isRotationAlreadyEnforced(code, opts.firstSend)) {
        // The broker is already at/past newGeneration — the revocation is in force.
        await this.config.logStore.deletePendingSpaceRotate(record.docId)
        return this.reportSpaceRotate(record, 'confirmed')
      }
      // Transient (offline / timeout / RATE_LIMITED / INTERNAL_ERROR / a genuine
      // first-send AUTH error): KEEP the durable intent for the reconnect retry.
      // NEVER swallowed without persistence — the record guarantees enforcement.
      if (opts.firstSend && code === 'AUTH_INVALID') {
        // A hard authorization failure on the FIRST send is a real error (e.g. not
        // an admin / wrong signer): surface it. The durable record still stands, so
        // a later legitimate retry can converge if the cause was misclassified.
        this.reportSpaceRotate(record, 'broker-pending')
        throw err
      }
      return this.reportSpaceRotate(record, 'broker-pending')
    }
  }

  /**
   * Whether a space-rotate reject means the rotation is ALREADY ENFORCED at the
   * broker (so the durable intent can be cleared). CAPABILITY_GENERATION_STALE is
   * unambiguous. AUTH_INVALID only counts as already-enforced on a RETRY: the relay
   * returns AUTH_INVALID when newGeneration !== current + 1, which — for a frame
   * the broker once accepted — means it already advanced past it. On the FIRST send
   * AUTH_INVALID is treated as a genuine authorization error (not already-enforced).
   */
  private isRotationAlreadyEnforced(code: BrokerErrorCode | null, firstSend: boolean): boolean {
    if (code === 'CAPABILITY_GENERATION_STALE') return true
    if (code === 'AUTH_INVALID' && !firstSend) return true
    return false
  }

  private reportSpaceRotate(
    record: PendingSpaceRotate,
    outcome: SpaceRotateStatus['outcome'],
  ): SpaceRotateStatus {
    const status: SpaceRotateStatus = {
      docId: record.docId,
      newGeneration: record.newGeneration,
      outcome,
    }
    this.config.onSpaceRotateStatus?.(status)
    return status
  }

  /**
   * Send a log-entry envelope and remember its messageId → (deviceId, seq) so a
   * routed write-path reject (`{ type:'error', thid }`, P2-NIT-1) correlates back
   * to the exact rejected write. The map is bounded (cleared on ack/reject and
   * size-capped) so it cannot grow unbounded.
   */
  private async sendLogEntryEnvelope(entryJws: string, deviceId: string, seq: number): Promise<void> {
    const recipients = await this.resolveRecipients()
    const messageId = cryptoRandomUuid()
    this.rememberInFlight(messageId, deviceId, seq)
    const message = createLogEntryMessage({
      id: messageId,
      from: this.config.ownDid,
      to: recipients,
      createdTime: Math.floor(this.now().getTime() / 1000),
      entry: entryJws,
    })
    const sendResult = await this.config.envelopes.send(message)
    // CONCERN-1: correlate the send's delivery receipt back to this exact write
    // and mark it acked, so it leaves the pending outbox. Without this every
    // self-authored entry stays 'pending' forever and resendPending re-emits the
    // whole log on every reconnect (stale-pending churn). The transport's
    // `send()` resolves with the relay's `{ messageId, status }` receipt
    // (messageId == this envelope id); delivered/accepted both mean the relay
    // took it (delivered = relayed to a peer, accepted = durably queued).
    this.markAckedOnReceipt(sendResult, messageId, deviceId, seq)
  }

  /**
   * If `sendResult` is a delivery receipt for `messageId` with a terminal-ok
   * status, drop the in-flight correlation and mark the (docId,deviceId,seq)
   * entry acked. Tolerant of transports that return a non-receipt value (then a
   * later routed `error` frame, or the next reconnect, drives the outcome).
   */
  private markAckedOnReceipt(
    sendResult: unknown,
    messageId: string,
    deviceId: string,
    seq: number,
  ): void {
    const receipt = asDeliveryReceipt(sendResult)
    if (!receipt) return
    if (receipt.messageId !== messageId) return
    if (receipt.status !== 'delivered' && receipt.status !== 'accepted') return
    this.inFlightWrites.delete(messageId)
    // Fire-and-forget: a failed markAcked only means a redundant re-send later,
    // never a correctness break (the stored JWS is bit-identical).
    void this.config.logStore.markAcked(this.config.docId, deviceId, seq).catch(() => {})
  }

  private rememberInFlight(messageId: string, deviceId: string, seq: number): void {
    // Bound the map: a write-path reject is rare, so a small ring is enough to
    // correlate the latest sends without leaking memory on the happy path.
    if (this.inFlightWrites.size > 256) {
      const oldest = this.inFlightWrites.keys().next().value
      if (oldest !== undefined) this.inFlightWrites.delete(oldest)
    }
    this.inFlightWrites.set(messageId, { deviceId, seq })
  }

  private async resolveRecipients(): Promise<string[]> {
    if (!this.config.getRecipients) return [this.config.ownDid]
    const recipients = await this.config.getRecipients()
    // Always include the own DID (own-device multi-device) and de-dup.
    const set = new Set([this.config.ownDid, ...recipients])
    return [...set]
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Read path (VE-3) — LOOP-GUARD: no write, no re-broadcast
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Process an incoming `log-entry/1.0` envelope (VE-3):
   *   verifyLogEntryJws (authority via authorKid, NEVER envelope-from)
   *   → idempotent (deviceId,seq) skip
   *   → engine-foreign skip (verify ok, NOT applied as own CRDT state)
   *   → blocked-by-key classification (VE-5 preview)
   *   → decryptLogPayload → applyRemoteUpdate(origin='remote')
   *   → recordRemoteApplied (heads forward only).
   *
   * Crucially: NO appendLocalEntry, NO sendLogEntryEnvelope. This is the path
   * that produced the 5000+-outbox loop when it re-broadcast.
   */
  async receiveLogEntry(message: unknown): Promise<ReceiveLogEntryResult> {
    let parsed: LogEntryMessage
    try {
      parsed = parseLogEntryMessage(message)
    } catch {
      return { disposition: 'rejected', reason: 'malformed-envelope' }
    }

    let payload: LogEntryPayload
    try {
      payload = await verifyLogEntryJws(parsed.body.entry, { crypto: this.config.crypto })
    } catch {
      return { disposition: 'rejected', reason: 'invalid-jws' }
    }

    // Route guard: only entries for THIS doc.
    if (payload.docId !== this.config.docId) {
      return { disposition: 'rejected', reason: 'wrong-doc' }
    }

    const key = appliedKey(payload.deviceId, payload.seq)
    if (this.applied.has(key)) {
      return { disposition: 'idempotent-skip', deviceId: payload.deviceId, seq: payload.seq }
    }
    // Durable idempotency: a re-applied entry already recorded survives reload.
    const existing = await this.config.logStore.getEntry(payload.docId, payload.deviceId, payload.seq)
    if (existing) {
      this.applied.add(key)
      return { disposition: 'idempotent-skip', deviceId: payload.deviceId, seq: payload.seq }
    }

    // Engine-foreign payloads (VE-3): a log-entry of this space whose CRDT type is
    // not ours is protocol-conformant (verify ok, routing ok) but MUST NOT be
    // applied as our own CRDT state — skip without crash/loop. The classifier is
    // generic; an adapter may wrap the plaintext with an engine tag. Here we rely
    // on the engine's applyRemoteUpdate throwing for foreign bytes and treat a
    // decode/apply failure as a skip rather than a crash.
    // VE-5: an entry under a not-yet-available keyGeneration is BUFFERED (no drop,
    // no mis-decrypt), and replayed after the key is imported. Buffering keys by
    // the AUTHORING (deviceId,seq) so a re-delivery is idempotent. The replay runs
    // through THIS read path again (origin='remote') — never the write path.
    const blocked = await this.classifyBlockedByKey(payload.keyGeneration)
    if (blocked) {
      this.bufferBlockedByKey(payload.deviceId, payload.seq, parsed)
      return { disposition: 'blocked-by-key', keyGeneration: payload.keyGeneration }
    }

    const contentKey = await this.config.getContentKeyByGeneration(payload.keyGeneration)
    if (!contentKey) {
      this.bufferBlockedByKey(payload.deviceId, payload.seq, parsed)
      return { disposition: 'blocked-by-key', keyGeneration: payload.keyGeneration }
    }

    let plaintext: Uint8Array
    try {
      const blob = decodeBase64Url(payload.data)
      plaintext = await decryptLogPayload({ crypto: this.config.crypto, spaceContentKey: contentKey, blob })
    } catch {
      // Cannot decrypt with the available key — treat as blocked-by-key, never crash.
      this.bufferBlockedByKey(payload.deviceId, payload.seq, parsed)
      return { disposition: 'blocked-by-key', keyGeneration: payload.keyGeneration }
    }

    try {
      await this.config.hooks.applyRemoteUpdate(plaintext)
    } catch (err) {
      // Engine-foreign / unparseable-as-our-CRDT: skip, do not loop or crash (VE-3).
      return {
        disposition: 'engine-foreign-skip',
        reason: err instanceof Error ? err.message : 'apply-failed',
      }
    }

    // Heads forward only — never a write, never a re-broadcast (LOOP-GUARD).
    await this.config.logStore.recordRemoteApplied({
      docId: payload.docId,
      deviceId: payload.deviceId,
      seq: payload.seq,
      entryJws: parsed.body.entry,
    })
    this.applied.add(key)
    // Drop from the blocked-by-key buffer if it was parked there earlier.
    this.blockedByKey.delete(blockedKey(payload.deviceId, payload.seq))
    return { disposition: 'applied', deviceId: payload.deviceId, seq: payload.seq }
  }

  private async classifyBlockedByKey(keyGeneration: number): Promise<boolean> {
    const available = await this.config.getAvailableKeyGenerations()
    return classifyLogEntryKeyDisposition({ keyGeneration, availableKeyGenerations: available }) === 'blocked-by-key'
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VE-5: blocked-by-key buffer + LOOP-GUARDed replay
  // ──────────────────────────────────────────────────────────────────────────

  /** Park a not-yet-decryptable entry (idempotent on the authoring (deviceId,seq)). */
  private bufferBlockedByKey(deviceId: string, seq: number, message: LogEntryMessage): void {
    this.blockedByKey.set(blockedKey(deviceId, seq), message)
  }

  /**
   * VE-5 replay (MUST be LOOP-GUARDed): after a content key is imported (e.g. a
   * key-rotation applied), re-feed every buffered entry through the READ path
   * ({@link receiveLogEntry}, origin='remote'). A replayed FOREIGN entry produces
   * NO new log-entry under our own deviceId — it never touches the write path —
   * so a key import can never trigger a (delayed) outbox loop. Entries that
   * decrypt + apply leave the buffer; entries still blocked stay parked.
   *
   * Returns the number of entries that converged (applied or idempotently
   * skipped) on this pass — tests assert the OUTGOING send count is unchanged.
   */
  async replayBlockedByKey(): Promise<number> {
    if (this.blockedByKey.size === 0) return 0
    // Snapshot: receiveLogEntry mutates the buffer (delete on apply / re-buffer if
    // still blocked), so iterate a copy to avoid concurrent-modification surprises.
    const pending = [...this.blockedByKey.entries()]
    let converged = 0
    for (const [bufKey, message] of pending) {
      const result = await this.receiveLogEntry(message)
      if (result.disposition === 'applied' || result.disposition === 'idempotent-skip') {
        converged += 1
        this.blockedByKey.delete(bufKey)
      }
      // 'blocked-by-key' again ⇒ receiveLogEntry re-buffered it (still no key) — keep.
    }
    return converged
  }

  /** Count of currently buffered blocked-by-key entries (test/inspection). */
  blockedByKeyCount(): number {
    return this.blockedByKey.size
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Catch-up (VE-4)
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * (Re)connect catch-up (VE-4): present read-capability for the docId (a new
   * socket has an empty scope cache, so re-present), then sync-request(localHeads)
   * → sync-response → idempotent apply. Returns the broker-head-abgleich result.
   *
   * BLOCKER-1b: when the broker reports a higher seq under our deviceId than we
   * hold locally (the store-wipe / clone case), this ACTS on it — a real
   * restore-clone (mint a fresh deviceId, re-write under it) BEFORE any first
   * write, so a leaked store can never re-enter seq=0 under a broker-known
   * deviceId. The disposition is still returned (callers/tests may inspect it).
   */
  async catchUp(): Promise<{ restoreCloneRequired: boolean }> {
    // VE-10: a (re)connect is the trigger to re-drive an outstanding durable
    // space-rotate intent (member-removal revocation that didn't get a receipt yet).
    // Run it BEFORE present-capability: a pending rotate means our LOCAL generation
    // is ahead of the broker's, so our capability is the NEW generation; advancing
    // the broker first lets the present-capability inside catchUpInternal verify
    // against the rotated key (otherwise the broker rejects our new-generation
    // capability against its stale key and catchUpInternal throws before the retry
    // could run). No-op + never throws for the common case (no pending rotate, e.g.
    // every non-admin member).
    await this.retryPendingSpaceRotates().catch(() => {})
    const result = await this.catchUpInternal({ presentCapabilityFirst: true })
    await this.actOnRestoreDisposition(result)
    return result
  }

  /**
   * BLOCKER-1b: drive a real restore-clone when the broker-head-abgleich detected
   * broker_seq>local_seq. Routed through the SAME machinery as a write-path
   * SEQ_COLLISION_DETECTED reject (mint a new deviceId via the WriteRejectHandler,
   * re-write the full state under it from seq=0). A no-op when no restore is
   * required or no handler is wired (degenerate; the deviceId-binding already makes
   * an empty store a fresh namespace, so this is belt-and-suspenders).
   */
  private async actOnRestoreDisposition(result: { restoreCloneRequired: boolean }): Promise<void> {
    if (!result.restoreCloneRequired) return
    if (this.restoreCloneInFlight) return
    await this.restoreClone({
      code: 'SEQ_COLLISION_DETECTED',
      rejectedDeviceId: this.deviceId,
    })
  }

  private async catchUpInternal(
    opts: { presentCapabilityFirst: boolean; timeoutMs?: number },
  ): Promise<{ restoreCloneRequired: boolean }> {
    if (opts.presentCapabilityFirst) {
      await this.presentCapabilityWithRetry()
    }

    const localHeads = await this.config.logStore.getKnownHeads(this.config.docId)
    const requestId = cryptoRandomUuid()
    const request = createSyncRequestMessage({
      id: requestId,
      from: this.config.ownDid,
      to: [this.config.ownDid],
      createdTime: Math.floor(this.now().getTime() / 1000),
      body: { docId: this.config.docId, heads: localHeads },
    })

    // Register the async waiter BEFORE sending (the relay answers via onMessage →
    // handleIncoming). A mock that returns the response synchronously short-circuits.
    const responsePromise = new Promise<SyncResponseMessage | null>((resolve) => {
      const timeout = opts.timeoutMs ?? 1000
      const timer = setTimeout(() => {
        this.pendingSyncRequests.delete(requestId)
        resolve(null)
      }, timeout)
      this.pendingSyncRequests.set(requestId, (response) => {
        clearTimeout(timer)
        resolve(response)
      })
    })

    const sendResult = await this.config.envelopes.send(request)
    const synchronous = unwrapSyncResponse(sendResult)
    if (synchronous) {
      this.pendingSyncRequests.delete(requestId)
      return this.applySyncResponse(synchronous)
    }

    const response = await responsePromise
    if (!response) return { restoreCloneRequired: false }
    return this.applySyncResponse(response)
  }

  /**
   * Apply a sync-response (VE-4): idempotently apply every entry, then run the
   * broker head-abgleich via classifyLocalBrokerSeqConsistency against our own
   * deviceId. A broker_seq>local_seq means restore-clone (the broker saw a higher
   * seq under our deviceId than we have locally).
   */
  async applySyncResponse(response: SyncResponseMessage): Promise<{ restoreCloneRequired: boolean }> {
    // BLOCKER-1b (disposition-before-apply): compute the broker-vs-local seq
    // disposition AGAINST response.body.heads BEFORE applying any entry. The apply
    // loop below records broker entries via recordRemoteApplied — INCLUDING any
    // entry the broker holds under OUR OWN deviceId (the restore-clone case). If we
    // read localSeq from getKnownHeads AFTER the loop, that back-fill would have
    // raised localSeq to brokerSeq and the disposition would be (wrongly) false —
    // the dead-code bug. Snapshotting localSeq first keeps brokerSeq>localSeq
    // observable, so the restore-clone actually fires before the first write.
    const disposition = await this.computeRestoreDisposition(response.body.heads)

    for (const entryJws of response.body.entries) {
      // Re-wrap each entry as a log-entry message so the SAME verify+apply+heads
      // path (and LOOP-GUARD) handles it — no separate decode path.
      const message = createLogEntryMessage({
        id: cryptoRandomUuid(),
        from: this.config.ownDid,
        to: [this.config.ownDid],
        createdTime: Math.floor(this.now().getTime() / 1000),
        entry: entryJws,
      })
      await this.receiveLogEntry(message)
    }

    return disposition
  }

  /**
   * VE-4 broker head-abgleich (Sync 002 seq-Konsistenz), computed against the
   * broker's reported heads and our CURRENT local heads — call this BEFORE
   * applying the sync-response entries (BLOCKER-1b), so a broker entry under our
   * own deviceId cannot back-fill localSeq and mask a restore-clone.
   *
   * deviceId absent in broker heads => broker_seq=-1 => no restore (normal
   * first-write/creator). broker_seq>local_seq => restore-clone. Uses the ACTIVE
   * deviceId (a restore-clone re-bound it) so a fresh post-clone namespace is
   * never falsely flagged against the old device's broker head.
   */
  private async computeRestoreDisposition(
    brokerHeads: Record<string, number>,
  ): Promise<{ restoreCloneRequired: boolean }> {
    const deviceId = this.deviceId
    const brokerSeq = Object.prototype.hasOwnProperty.call(brokerHeads, deviceId)
      ? brokerHeads[deviceId]
      : -1
    const localHeads = await this.config.logStore.getKnownHeads(this.config.docId)
    const localSeq = Object.prototype.hasOwnProperty.call(localHeads, deviceId)
      ? localHeads[deviceId]
      : -1

    if (brokerSeq < 0) return { restoreCloneRequired: false }
    if (localSeq < 0) {
      // We have no local entry but the broker has one under our deviceId — that is
      // a higher broker seq than local => restore-clone (Sync 002 seq-Konsistenz).
      return { restoreCloneRequired: true }
    }
    const disposition = classifyLocalBrokerSeqConsistency({
      docId: this.config.docId,
      deviceId,
      localSeq,
      brokerSeq,
    })
    return { restoreCloneRequired: disposition.disposition === 'restore-clone-required' }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Reject disposition (VE-4)
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Maps an error thrown by the control/envelope transport to a VE-4 disposition.
   * AUTHOR_MISMATCH is a HARD STOP (no retry) and re-thrown as
   * {@link AuthorMismatchError} so it cannot be swallowed into a retry loop.
   */
  dispositionForError(err: unknown): RejectDisposition {
    const code = brokerErrorCodeOf(err)
    if (!code) return 'unknown'
    const disposition = classifyRejectDisposition(code)
    if (disposition === 'hard-stop') {
      throw new AuthorMismatchError(this.config.docId, this.deviceId, this.config.authorKid)
    }
    return disposition
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Write-path reject (P2-NIT-1, VE-4/VE-5): routed `{ type:'error', thid }`
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Parse a routed write-path `error` frame, correlate its `thid` to the rejected
   * (deviceId, seq), and drive the reject action. Unknown / uncorrelated codes are
   * ignored (the relay may route errors for frames we did not send).
   */
  private async onWritePathErrorFrame(message: unknown): Promise<void> {
    const frame = message as { type?: unknown; thid?: unknown; code?: unknown }
    if (!isKnownBrokerErrorCode(frame.code)) return
    const thid = typeof frame.thid === 'string' ? frame.thid : undefined
    // Only act on an error correlated to a log-entry WE sent. An uncorrelated thid
    // (a frame we did not send / already resolved) is ignored — never a false
    // restore-clone on a stray error.
    const correlated = thid ? this.inFlightWrites.get(thid) : undefined
    if (!correlated) return
    if (thid) this.inFlightWrites.delete(thid)
    await this.handleWriteReject(frame.code, correlated.deviceId, correlated.seq)
  }

  /**
   * Drive the VE-4/VE-5 action for a write-path reject code (P2-NIT-1). The
   * disposition table:
   *  - AUTHOR_MISMATCH → HARD STOP: throw {@link AuthorMismatchError}, NO retry.
   *  - SEQ_COLLISION_DETECTED / DEVICE_REVOKED → restore-clone (mint new deviceId
   *    via {@link WriteRejectHandler}, restart at seq=0, re-write pending).
   *  - DEVICE_NOT_REGISTERED / DEVICE_ID_CONFLICT → device-re-register.
   *  - CAPABILITY_* → re-present capability + resend pending.
   *  - retry/unknown → no structural action (the reconnect path resends pending).
   *
   * Exposed for adapter wiring + tests. Returns the disposition it acted on.
   */
  async handleWriteReject(
    code: BrokerErrorCode,
    rejectedDeviceId?: string,
    rejectedSeq?: number,
  ): Promise<RejectDisposition> {
    const disposition = classifyRejectDisposition(code)
    switch (disposition) {
      case 'hard-stop':
        // AUTHOR_MISMATCH: authorKid<->deviceId binding bug. Hard stop, never retry.
        throw new AuthorMismatchError(this.config.docId, rejectedDeviceId ?? this.deviceId, this.config.authorKid)
      case 'restore-clone':
        await this.restoreClone({ code, rejectedDeviceId, rejectedSeq })
        return disposition
      case 'device-re-register':
        await this.deviceReRegister(code, rejectedDeviceId)
        return disposition
      case 'capability-re-present':
        // A new socket / stale scope: re-present then resend pending (idempotent).
        await this.presentCapabilityWithRetry()
        await this.resendPending()
        return disposition
      case 'retry':
      case 'unknown':
      default:
        return disposition
    }
  }

  /**
   * Restore/Clone (VE-4/VE-5): a SEQ_COLLISION_DETECTED (matched on CODE, never on
   * a clientHint) or a mid-session DEVICE_REVOKED for our own deviceId. The
   * MECHANISM (mint deviceId + device-revoke old + re-register) lives in the
   * adapter's {@link WriteRejectHandler}; the coordinator re-binds its seq
   * namespace to the returned new deviceId, re-publishes on the new connection
   * scope, and re-writes pending entries UNDER THE NEW deviceId from seq=0. The
   * colliding seq is NEVER re-used with divergent plaintext (the new deviceId is a
   * fresh nonce namespace).
   */
  private async restoreClone(reject: {
    code: BrokerErrorCode
    rejectedDeviceId?: string
    rejectedSeq?: number
  }): Promise<void> {
    if (this.restoreCloneInFlight) return
    this.restoreCloneInFlight = true
    try {
      const handler = this.config.onWriteRejected
      if (!handler) {
        // No mechanism wired: surface nothing further (the coordinator never mints
        // a deviceId itself). The caller/audit sees the disposition via the return.
        return
      }
      const oldDeviceId = this.deviceId
      const outcome = await handler({
        code: reject.code,
        disposition: classifyRejectDisposition(reject.code),
        docId: this.config.docId,
        deviceId: reject.rejectedDeviceId ?? oldDeviceId,
      })
      // Re-bind to the NEW deviceId (a restore-clone MUST return one). A handler
      // that returns void leaves the deviceId unchanged (degenerate; treated as a
      // no-op restore so we never silently re-use the colliding seq).
      const newDeviceId = outcome?.deviceId
      if (!newDeviceId || newDeviceId === oldDeviceId) return
      this.deviceId = newDeviceId
      // A new deviceId = a fresh per-(deviceId,docId) seq namespace; clear the
      // in-memory applied-set guard for our OWN device is unnecessary (it keys by
      // the authoring device), but the in-flight correlation for the old device is
      // stale — drop it.
      this.inFlightWrites.clear()
      // The clone re-publishes on this connection (present-capability + space
      // register idempotent) and re-writes the still-pending entries (which the
      // adapter re-built under the new deviceId from seq=0).
      this.published = false
      this.publishing = null
      await this.ensurePublished()
      // Re-write the current CRDT state under the NEW deviceId from seq=0. The
      // colliding seq under the OLD deviceId is abandoned (never re-used with
      // divergent plaintext — a new deviceId is a fresh nonce namespace). When the
      // adapter supplies no re-write hook, fall back to resending the stored
      // pending (only correct if those were already re-keyed to the new deviceId).
      if (this.config.onAfterRestoreClone) {
        await this.config.onAfterRestoreClone(newDeviceId)
      } else {
        await this.resendPending()
      }
    } finally {
      this.restoreCloneInFlight = false
    }
  }

  /**
   * DEVICE_NOT_REGISTERED / DEVICE_ID_CONFLICT (VE-4): register the deviceId
   * (challenge-response) BEFORE the next log-entry. The registration MECHANISM is
   * the adapter's {@link WriteRejectHandler}; a DEVICE_ID_CONFLICT may return a
   * fresh deviceId (re-bound here), a plain DEVICE_NOT_REGISTERED keeps the id.
   */
  private async deviceReRegister(code: BrokerErrorCode, rejectedDeviceId?: string): Promise<void> {
    const handler = this.config.onWriteRejected
    if (!handler) return
    const outcome = await handler({
      code,
      disposition: 'device-re-register',
      docId: this.config.docId,
      deviceId: rejectedDeviceId ?? this.deviceId,
    })
    if (outcome?.deviceId && outcome.deviceId !== this.deviceId) {
      this.deviceId = outcome.deviceId
      this.inFlightWrites.clear()
    }
    await this.resendPending()
  }
}

// ── helpers ──────────────────────────────────────────────────────────────────

function appliedKey(deviceId: string, seq: number): string {
  return `${deviceId}\u0000${seq}`
}

/** Buffer key for a blocked-by-key entry, by the AUTHORING (deviceId, seq). */
function blockedKey(deviceId: string, seq: number): string {
  return appliedKey(deviceId, seq)
}

function brokerErrorCodeOf(err: unknown): BrokerErrorCode | null {
  if (err instanceof ControlFrameRejectedError) return err.code
  if (err && typeof err === 'object') {
    const code = (err as { code?: unknown }).code
    if (isKnownBrokerErrorCode(code)) return code
  }
  return null
}

function unwrapSyncResponse(value: unknown): SyncResponseMessage | null {
  if (value === null || value === undefined) return null
  // The in-process mock may return the sync-response message directly, or wrap it
  // in `{ type:'message', envelope }` (relay parity).
  const candidate = isMessageWrapper(value) ? value.envelope : value
  try {
    return parseSyncResponseMessage(candidate)
  } catch {
    return null
  }
}

function isMessageWrapper(value: unknown): value is { type: 'message'; envelope: unknown } {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { type?: unknown }).type === 'message' &&
    'envelope' in (value as object)
  )
}

function cryptoRandomUuid(): string {
  return globalThis.crypto.randomUUID()
}

/** A minimal delivery-receipt view: the relay/transport `send()` result shape. */
interface DeliveryReceiptLike {
  messageId: string
  status: string
}

/** Structural parse of a `send()` result into a delivery receipt, or null. */
function asDeliveryReceipt(value: unknown): DeliveryReceiptLike | null {
  if (typeof value !== 'object' || value === null) return null
  const messageId = (value as { messageId?: unknown }).messageId
  const status = (value as { status?: unknown }).status
  if (typeof messageId !== 'string' || typeof status !== 'string') return null
  return { messageId, status }
}
