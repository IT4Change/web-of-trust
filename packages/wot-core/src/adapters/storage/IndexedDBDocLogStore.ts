import { openDB, type IDBPDatabase } from 'idb'
import type {
  AppendLocalEntryParams,
  DocLogStore,
  LocalLogEntry,
  RecordRemoteAppliedEntry,
} from '../../ports/DocLogStore'
import { createSeqLock, type SeqLock } from './SeqLock'

const DB_NAME = 'wot-doc-log'
const DB_VERSION = 1
const ENTRIES_STORE = 'entries'
const PENDING_INDEX = 'byStatus'

/**
 * Durable IndexedDB {@link DocLogStore}.
 *
 * Schema: one object store `entries`, composite keyPath [docId, deviceId, seq]
 * (so a key range over [docId, deviceId, -∞..+∞] addresses exactly one device's
 * log within one doc), plus a `byStatus` index for cheap pending scans.
 *
 * ── Why the lock, not the IDB transaction, is the atomicity boundary ─────────
 *
 * appendLocalEntry must do: read max seq → build(seq) (async crypto) → persist.
 * An IDB transaction CANNOT span that, because it auto-closes on the first
 * microtask turn where it has no pending request — i.e. the moment we `await`
 * build(). So we use TWO short transactions (read, then write) and rely on the
 * injected {@link SeqLock} to serialize the whole section across tabs. With Web
 * Locks that serialization is origin-wide; the seq=k duplicate that would reuse
 * the deterministic AES-GCM nonce (SHA-256(deviceId | seq)[0:12]) can never
 * happen. (See DocLogStore for the full invariant statement.)
 *
 * ── Crash-scenario analysis (mirrors the port docs; proven by the tests) ─────
 *
 *  (a) Crash between readMaxSeq and persist (e.g. build() throws, or the tab
 *      dies mid-crypto): NOTHING is written, so seq is NOT consumed and nothing
 *      was sent. A fresh store re-reads the same maxSeq; reusing that seq with
 *      NEW plaintext is safe because no JWS for it ever hit the wire.
 *  (b) Crash after persist, before send: the entry is durably 'pending'. On
 *      reconnect, getPending() yields it and the retry sends the STORED JWS
 *      bit-for-bit (the broker dedups via contentHash). It is NEVER rebuilt, so
 *      the (key, nonce) pair is never reused with different bytes.
 */
export class IndexedDBDocLogStore implements DocLogStore {
  private dbPromise: Promise<IDBPDatabase> | null = null
  private readonly dbName: string
  private readonly lock: SeqLock

  /**
   * @param dbName  IndexedDB database name. Tests pass a unique name per case to
   *                isolate state — and reuse the SAME name across two instances
   *                to simulate a crash + restart on one durable DB.
   * @param lock    Seq-reservation lock. Defaults to {@link createSeqLock}
   *                (Web Locks when available, in-process otherwise).
   */
  constructor(dbName: string = DB_NAME, lock: SeqLock = createSeqLock()) {
    this.dbName = dbName
    this.lock = lock
  }

  async init(): Promise<void> {
    await this.db()
  }

  async appendLocalEntry(params: AppendLocalEntryParams): Promise<LocalLogEntry> {
    const { deviceId, docId, build } = params
    return this.lock.run(`doclog:${deviceId}:${docId}`, async () => {
      // ── short IDB txn 1: read the durable max seq for (docId, deviceId) ──
      const maxSeq = await this.readMaxSeq(docId, deviceId)
      const seq = maxSeq + 1

      // ── async crypto: NOT inside any IDB txn (it would have closed) ──
      // Build the encrypted+signed entry JWS for the reserved seq. If this
      // rejects, we fall straight out of the lock without persisting — the seq
      // stays free (crash case (a)).
      const entryJws = await build(seq)

      const entry: LocalLogEntry = {
        docId,
        deviceId,
        seq,
        entryJws,
        status: 'pending',
        createdAt: Date.now(),
      }
      // ── short IDB txn 2: durably persist BEFORE returning (⇒ before send) ──
      const db = await this.db()
      await db.put(ENTRIES_STORE, toStored(entry))
      return { ...entry }
    })
  }

  async recordRemoteApplied(entry: RecordRemoteAppliedEntry): Promise<void> {
    const { docId, deviceId, seq } = entry
    const db = await this.db()
    const tx = db.transaction(ENTRIES_STORE, 'readwrite')
    const existing = (await tx.store.get([docId, deviceId, seq])) as StoredLogEntry | undefined
    // Idempotent: never clobber an already-stored entry (especially never
    // overwrite a local 'pending'/'acked' JWS with empty remote bookkeeping).
    if (!existing) {
      await tx.store.put(
        toStored({
          docId,
          deviceId,
          seq,
          entryJws: entry.entryJws ?? '',
          status: 'acked',
          createdAt: Date.now(),
        }),
      )
    }
    await tx.done
  }

  async getKnownHeads(docId: string): Promise<Record<string, number>> {
    const db = await this.db()
    // Range over every (deviceId, seq) within this doc.
    const range = IDBKeyRange.bound([docId], [docId, [], []])
    const heads: Record<string, number> = {}
    let cursor = await db.transaction(ENTRIES_STORE, 'readonly').store.openCursor(range)
    while (cursor) {
      const stored = cursor.value as StoredLogEntry
      const current = heads[stored.deviceId]
      if (current === undefined || stored.seq > current) heads[stored.deviceId] = stored.seq
      cursor = await cursor.continue()
    }
    return heads
  }

  async getEntry(docId: string, deviceId: string, seq: number): Promise<LocalLogEntry | null> {
    const db = await this.db()
    const stored = (await db.get(ENTRIES_STORE, [docId, deviceId, seq])) as
      | StoredLogEntry
      | undefined
    return stored ? fromStored(stored) : null
  }

  async getPending(): Promise<LocalLogEntry[]> {
    const db = await this.db()
    const stored = (await db.getAllFromIndex(
      ENTRIES_STORE,
      PENDING_INDEX,
      'pending',
    )) as StoredLogEntry[]
    return stored.map(fromStored).sort(comparePending)
  }

  async markAcked(docId: string, deviceId: string, seq: number): Promise<void> {
    const db = await this.db()
    const tx = db.transaction(ENTRIES_STORE, 'readwrite')
    const stored = (await tx.store.get([docId, deviceId, seq])) as StoredLogEntry | undefined
    if (stored && stored.status !== 'acked') {
      await tx.store.put({ ...stored, status: 'acked' })
    }
    await tx.done
  }

  async clear(): Promise<void> {
    const db = await this.db()
    await db.clear(ENTRIES_STORE)
  }

  /**
   * Durable max seq for one (docId, deviceId) log, or -1 if none. Opens a
   * reverse cursor on the [docId, deviceId, -∞..+∞] key range and reads the
   * first (highest) key — O(log n), no full scan. Short read-only txn.
   */
  private async readMaxSeq(docId: string, deviceId: string): Promise<number> {
    const db = await this.db()
    const range = IDBKeyRange.bound([docId, deviceId], [docId, deviceId, []])
    const cursor = await db
      .transaction(ENTRIES_STORE, 'readonly')
      .store.openCursor(range, 'prev')
    if (!cursor) return -1
    const key = cursor.key as [string, string, number]
    return key[2]
  }

  private db(): Promise<IDBPDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = openDB(this.dbName, DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(ENTRIES_STORE)) {
            const store = db.createObjectStore(ENTRIES_STORE, {
              keyPath: ['docId', 'deviceId', 'seq'],
            })
            store.createIndex(PENDING_INDEX, 'status')
          }
        },
      })
    }
    return this.dbPromise
  }
}

/**
 * Stored shape. keyPath fields (docId, deviceId, seq) live at the top level so
 * IndexedDB can index them; the entry is otherwise stored verbatim.
 */
interface StoredLogEntry {
  docId: string
  deviceId: string
  seq: number
  entryJws: string
  status: 'pending' | 'acked'
  createdAt: number
}

function toStored(entry: LocalLogEntry): StoredLogEntry {
  return {
    docId: entry.docId,
    deviceId: entry.deviceId,
    seq: entry.seq,
    entryJws: entry.entryJws,
    status: entry.status,
    createdAt: entry.createdAt,
  }
}

function fromStored(stored: StoredLogEntry): LocalLogEntry {
  return {
    docId: stored.docId,
    deviceId: stored.deviceId,
    seq: stored.seq,
    entryJws: stored.entryJws,
    status: stored.status,
    createdAt: stored.createdAt,
  }
}

/** Stable pending order: by deviceId, then seq, then createdAt. */
function comparePending(a: LocalLogEntry, b: LocalLogEntry): number {
  if (a.deviceId !== b.deviceId) return a.deviceId < b.deviceId ? -1 : 1
  if (a.seq !== b.seq) return a.seq - b.seq
  return a.createdAt - b.createdAt
}
