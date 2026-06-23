import type {
  AppendLocalEntryParams,
  DocLogStore,
  LocalLogEntry,
  RecordRemoteAppliedEntry,
} from '../../ports/DocLogStore'
import { InProcessSeqLock, type SeqLock } from './SeqLock'

/**
 * In-memory {@link DocLogStore} for tests. Mirrors {@link IndexedDBDocLogStore}
 * semantics — same seq derivation (maxSeq + 1, starting at 0), the same
 * persist-before-return ordering inside the SeqLock, and the same heads/pending
 * bookkeeping — but without IndexedDB.
 *
 * The SeqLock is injectable so a test can drive the same cross-tab atomicity
 * proof here as against the durable adapter; it defaults to {@link InProcessSeqLock}.
 */
export class InMemoryDocLogStore implements DocLogStore {
  /** Composite key `${docId}\u0000${deviceId}\u0000${seq}` → entry. */
  private readonly entries = new Map<string, LocalLogEntry>()
  private readonly lock: SeqLock

  constructor(lock: SeqLock = new InProcessSeqLock()) {
    this.lock = lock
  }

  async init(): Promise<void> {
    // Nothing to open.
  }

  async appendLocalEntry(params: AppendLocalEntryParams): Promise<LocalLogEntry> {
    const { deviceId, docId, build } = params
    return this.lock.run(`doclog:${deviceId}:${docId}`, async () => {
      const seq = this.maxSeq(docId, deviceId) + 1
      // build() (the async crypto) runs INSIDE the lock but is NOT covered by an
      // IDB transaction here either — parity with the durable adapter, where the
      // lock (not a txn) is the atomicity boundary across the await.
      const entryJws = await build(seq)
      const entry: LocalLogEntry = {
        docId,
        deviceId,
        seq,
        entryJws,
        status: 'pending',
        createdAt: Date.now(),
      }
      // Persist BEFORE returning (and thus before any send): only here is the
      // seq durably consumed. If build() threw above, nothing is stored and the
      // seq stays free for the next attempt.
      this.entries.set(this.key(docId, deviceId, seq), entry)
      return { ...entry }
    })
  }

  async recordRemoteApplied(entry: RecordRemoteAppliedEntry): Promise<void> {
    const { docId, deviceId, seq } = entry
    const key = this.key(docId, deviceId, seq)
    const existing = this.entries.get(key)
    // Idempotent: a re-applied remote entry must not clobber an already-stored
    // one (especially never downgrade a local 'pending'/'acked' JWS).
    if (existing) return
    this.entries.set(key, {
      docId,
      deviceId,
      seq,
      entryJws: entry.entryJws ?? '',
      status: 'acked',
      createdAt: Date.now(),
    })
  }

  async getKnownHeads(docId: string): Promise<Record<string, number>> {
    const heads: Record<string, number> = {}
    for (const entry of this.entries.values()) {
      if (entry.docId !== docId) continue
      const current = heads[entry.deviceId]
      if (current === undefined || entry.seq > current) heads[entry.deviceId] = entry.seq
    }
    return heads
  }

  async getEntry(docId: string, deviceId: string, seq: number): Promise<LocalLogEntry | null> {
    const entry = this.entries.get(this.key(docId, deviceId, seq))
    return entry ? { ...entry } : null
  }

  async getPending(): Promise<LocalLogEntry[]> {
    return [...this.entries.values()]
      .filter((entry) => entry.status === 'pending')
      .sort(comparePending)
      .map((entry) => ({ ...entry }))
  }

  async markAcked(docId: string, deviceId: string, seq: number): Promise<void> {
    const key = this.key(docId, deviceId, seq)
    const entry = this.entries.get(key)
    if (!entry || entry.status === 'acked') return
    this.entries.set(key, { ...entry, status: 'acked' })
  }

  async clear(): Promise<void> {
    this.entries.clear()
  }

  private maxSeq(docId: string, deviceId: string): number {
    let max = -1
    for (const entry of this.entries.values()) {
      if (entry.docId === docId && entry.deviceId === deviceId && entry.seq > max) {
        max = entry.seq
      }
    }
    return max
  }

  private key(docId: string, deviceId: string, seq: number): string {
    return `${docId}\u0000${deviceId}\u0000${seq}`
  }
}

/** Stable pending order: by deviceId, then seq, then createdAt. */
function comparePending(a: LocalLogEntry, b: LocalLogEntry): number {
  if (a.deviceId !== b.deviceId) return a.deviceId < b.deviceId ? -1 : 1
  if (a.seq !== b.seq) return a.seq - b.seq
  return a.createdAt - b.createdAt
}
