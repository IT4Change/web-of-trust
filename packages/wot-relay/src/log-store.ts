import Database from 'better-sqlite3'
import { protocol, WebCryptoProtocolCryptoAdapter } from '@web_of_trust/core'

const { bytesToHex } = protocol
type SyncHeads = protocol.SyncHeads

const logStoreCrypto = new WebCryptoProtocolCryptoAdapter()

/**
 * Durable, append-only per-doc log store (Slice R, Sync 002 "durable-log").
 *
 * The relay keeps a RETAINED append-only log keyed by (docId, deviceId, seq).
 * Unlike the OfflineQueue (queued → delivered → ACK → DELETED), entries here are
 * NEVER deleted on ACK: the log IS the source of truth, so a fresh device can
 * reconstruct the full document via a sync-request after every producer has gone
 * offline (cold reconstruction). Pruning/snapshots are out of scope (Slice C).
 *
 * The store treats `entry_jws` as opaque: it never decrypts the `data` payload.
 * It hashes the JWS compact string for collision/dedup detection — the only
 * crypto in this layer keeps the relay.ts source guard intact (no inline crypto
 * in relay.ts).
 *
 * Schema:
 *   doc_log(doc_id, device_id, seq, content_hash, entry_jws, created_at,
 *           PRIMARY KEY(doc_id, device_id, seq))
 *   + index on (doc_id, device_id, seq)
 */
export class DocLog {
  private db: Database.Database

  /**
   * Accepts a path (creates/owns a connection) or an existing better-sqlite3
   * Database handle (shared with OfflineQueue so prod uses a single file and
   * tests avoid the ':memory:' split-DB problem). When a handle is shared, this
   * class does not own its lifecycle and `close()` is a no-op.
   */
  private ownsDb: boolean

  constructor(db: string | Database.Database = ':memory:') {
    if (typeof db === 'string') {
      this.db = new Database(db)
      this.db.pragma('journal_mode = WAL')
      this.ownsDb = true
    } else {
      this.db = db
      this.ownsDb = false
    }
    this.migrate()
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS doc_log (
        doc_id TEXT NOT NULL,
        device_id TEXT NOT NULL,
        seq INTEGER NOT NULL,
        content_hash TEXT NOT NULL,
        entry_jws TEXT NOT NULL,
        created_at TEXT NOT NULL,
        PRIMARY KEY (doc_id, device_id, seq)
      )
    `)
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_doc_log_coords ON doc_log (doc_id, device_id, seq)
    `)
  }

  /**
   * Content hash (hex) of a JWS compact string. Computed in this layer so the
   * relay never hashes inline. Used as the (docId,deviceId,seq) collision/dedup
   * key per Sync 002 (deterministic-nonce reuse protection).
   */
  async hashEntry(entryJws: string): Promise<string> {
    return bytesToHex(await logStoreCrypto.sha256(new TextEncoder().encode(entryJws)))
  }

  /**
   * Append a verified log entry. Idempotent on the same (docId,deviceId,seq):
   * INSERT OR IGNORE means an exact retransmission (same content_hash) is a
   * no-op. The caller MUST have run seq-collision classification first — a
   * divergent content_hash at an existing coordinate must never reach this method
   * (the PRIMARY KEY would otherwise silently keep the first write, but the
   * boundary reject in the relay is the real guard).
   */
  appendEntry(params: {
    docId: string
    deviceId: string
    seq: number
    contentHash: string
    entryJws: string
  }): void {
    this.db
      .prepare(
        'INSERT OR IGNORE INTO doc_log (doc_id, device_id, seq, content_hash, entry_jws, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run(
        params.docId,
        params.deviceId,
        params.seq,
        params.contentHash,
        params.entryJws,
        new Date().toISOString(),
      )
  }

  /** content_hash recorded at (docId,deviceId,seq), or null if none. */
  getContentHash(docId: string, deviceId: string, seq: number): string | null {
    const row = this.db
      .prepare('SELECT content_hash FROM doc_log WHERE doc_id = ? AND device_id = ? AND seq = ?')
      .get(docId, deviceId, seq) as { content_hash: string } | undefined
    return row ? row.content_hash : null
  }

  /**
   * Catch-up page: every retained entry with seq > heads[deviceId] (or from 0 if
   * the device is absent in heads), per device, ascending and deterministic
   * (ordered by device_id, then seq). Empty heads ⇒ full log from seq 0 (cold
   * reconstruction). With `limit`, returns at most `limit` entries; the caller
   * learns truncation via `getSinceWithTruncation`.
   */
  getSince(docId: string, heads: SyncHeads, limit?: number): string[] {
    return this.getSinceWithTruncation(docId, heads, limit).entries
  }

  /**
   * Like getSince but also reports whether more entries remain beyond `limit`.
   */
  getSinceWithTruncation(
    docId: string,
    heads: SyncHeads,
    limit?: number,
  ): { entries: string[]; truncated: boolean } {
    const rows = this.db
      .prepare(
        'SELECT device_id, seq, entry_jws FROM doc_log WHERE doc_id = ? ORDER BY device_id ASC, seq ASC',
      )
      .all(docId) as Array<{ device_id: string; seq: number; entry_jws: string }>

    const missing = rows.filter((row) => {
      const head = Object.prototype.hasOwnProperty.call(heads, row.device_id)
        ? heads[row.device_id]
        : -1
      return row.seq > head
    })

    if (typeof limit === 'number' && missing.length > limit) {
      return { entries: missing.slice(0, limit).map((row) => row.entry_jws), truncated: true }
    }
    return { entries: missing.map((row) => row.entry_jws), truncated: false }
  }

  /** Broker heads for a doc: max seq per deviceId. */
  getHeads(docId: string): SyncHeads {
    const rows = this.db
      .prepare('SELECT device_id, MAX(seq) as max_seq FROM doc_log WHERE doc_id = ? GROUP BY device_id')
      .all(docId) as Array<{ device_id: string; max_seq: number }>
    const heads: Record<string, number> = {}
    for (const row of rows) heads[row.device_id] = row.max_seq
    return heads
  }

  // --- stats helpers (dashboard) -------------------------------------------

  /** Total retained entries (optionally for one doc). */
  entryCount(docId?: string): number {
    if (docId) {
      const row = this.db
        .prepare('SELECT COUNT(*) as count FROM doc_log WHERE doc_id = ?')
        .get(docId) as { count: number }
      return row.count
    }
    const row = this.db.prepare('SELECT COUNT(*) as count FROM doc_log').get() as { count: number }
    return row.count
  }

  /** Number of distinct docs with at least one entry. */
  docCount(): number {
    const row = this.db
      .prepare('SELECT COUNT(DISTINCT doc_id) as count FROM doc_log')
      .get() as { count: number }
    return row.count
  }

  /** entries per docId. */
  entriesByDoc(): Record<string, number> {
    const rows = this.db
      .prepare('SELECT doc_id, COUNT(*) as count FROM doc_log GROUP BY doc_id')
      .all() as Array<{ doc_id: string; count: number }>
    const result: Record<string, number> = {}
    for (const row of rows) result[row.doc_id] = row.count
    return result
  }

  /** distinct devices per docId. */
  devicesByDoc(): Record<string, number> {
    const rows = this.db
      .prepare('SELECT doc_id, COUNT(DISTINCT device_id) as count FROM doc_log GROUP BY doc_id')
      .all() as Array<{ doc_id: string; count: number }>
    const result: Record<string, number> = {}
    for (const row of rows) result[row.doc_id] = row.count
    return result
  }

  /** Total bytes of all retained JWS strings (UTF-8 length sum). */
  totalLogBytes(): number {
    const row = this.db
      .prepare('SELECT COALESCE(SUM(LENGTH(entry_jws)), 0) as bytes FROM doc_log')
      .get() as { bytes: number }
    return row.bytes
  }

  close(): void {
    if (this.ownsDb) this.db.close()
  }
}
