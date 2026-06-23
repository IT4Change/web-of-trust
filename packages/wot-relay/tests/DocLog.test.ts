import { describe, it, expect, beforeEach } from 'vitest'
import { randomUUID } from 'crypto'
import Database from 'better-sqlite3'
import { DocLog } from '../src/log-store.js'
import { protocol, WebCryptoProtocolCryptoAdapter } from '@web_of_trust/core'

// Slice R / Sync 002 durable-log store unit tests. Entries are REAL log-entry
// JWS (encryptLogPayload + createLogEntryJws over a raw-seed Ed25519 identity),
// so verifyLogEntryJws-derived coordinates and content hashing match production.

const crypto = new WebCryptoProtocolCryptoAdapter()
const FIXED_TIMESTAMP = '2026-06-22T10:00:00Z'

interface Author {
  seed: Uint8Array
  did: string
  authorKid: string
}

async function makeAuthor(label: string): Promise<Author> {
  const seed = await crypto.sha256(new TextEncoder().encode(`doclog-test/seed/${label}`))
  const pub = await crypto.ed25519PublicKeyFromSeed(seed)
  const did = protocol.publicKeyToDidKey(pub)
  return { seed, did, authorKid: `${did}#sig-0` }
}

async function deriveKey(docId: string, generation = 0): Promise<Uint8Array> {
  return crypto.sha256(new TextEncoder().encode(`sck|${docId}|gen${generation}`))
}

/** Build a real log-entry JWS for (docId, author, deviceId, seq). */
async function makeEntryJws(params: {
  author: Author
  docId: string
  deviceId: string
  seq: number
  plaintext: string
  keyGeneration?: number
}): Promise<string> {
  const generation = params.keyGeneration ?? 0
  const spaceContentKey = await deriveKey(params.docId, generation)
  const enc = await protocol.encryptLogPayload({
    crypto,
    spaceContentKey,
    deviceId: params.deviceId,
    seq: params.seq,
    plaintext: new TextEncoder().encode(params.plaintext),
  })
  const payload = {
    seq: params.seq,
    deviceId: params.deviceId,
    docId: params.docId,
    authorKid: params.author.authorKid,
    keyGeneration: generation,
    data: enc.blobBase64Url,
    timestamp: FIXED_TIMESTAMP,
  }
  return protocol.createLogEntryJws({ payload, signingSeed: params.author.seed })
}

describe('DocLog (durable append-only log store)', () => {
  let log: DocLog

  beforeEach(() => {
    log = new DocLog(':memory:')
  })

  it('appends an entry and serves it via getSince with empty heads (cold reconstruction)', async () => {
    const author = await makeAuthor('a')
    const docId = randomUUID()
    const deviceId = randomUUID()
    const jws = await makeEntryJws({ author, docId, deviceId, seq: 0, plaintext: 'hello' })
    const hash = await log.hashEntry(jws)

    log.appendEntry({ docId, deviceId, seq: 0, contentHash: hash, entryJws: jws })

    expect(log.getSince(docId, {})).toEqual([jws])
    expect(log.getHeads(docId)).toEqual({ [deviceId]: 0 })
    expect(log.entryCount(docId)).toBe(1)
  })

  it('is idempotent on the same contentHash at the same (docId,deviceId,seq)', async () => {
    const author = await makeAuthor('a')
    const docId = randomUUID()
    const deviceId = randomUUID()
    const jws = await makeEntryJws({ author, docId, deviceId, seq: 0, plaintext: 'x' })
    const hash = await log.hashEntry(jws)

    log.appendEntry({ docId, deviceId, seq: 0, contentHash: hash, entryJws: jws })
    log.appendEntry({ docId, deviceId, seq: 0, contentHash: hash, entryJws: jws })

    expect(log.entryCount(docId)).toBe(1)
    expect(log.getSince(docId, {})).toEqual([jws])
  })

  it('keeps the first entry and never overwrites on a divergent contentHash at the same coordinate (backstop)', async () => {
    // The relay rejects this at the boundary (VE-3); here we assert the store's
    // PRIMARY KEY backstop: a second INSERT OR IGNORE for the same coordinate
    // does NOT overwrite the stored content.
    const author = await makeAuthor('a')
    const docId = randomUUID()
    const deviceId = randomUUID()
    const first = await makeEntryJws({ author, docId, deviceId, seq: 0, plaintext: 'first' })
    const second = await makeEntryJws({ author, docId, deviceId, seq: 0, plaintext: 'second' })
    const firstHash = await log.hashEntry(first)
    const secondHash = await log.hashEntry(second)
    expect(firstHash).not.toBe(secondHash)

    log.appendEntry({ docId, deviceId, seq: 0, contentHash: firstHash, entryJws: first })
    log.appendEntry({ docId, deviceId, seq: 0, contentHash: secondHash, entryJws: second })

    expect(log.entryCount(docId)).toBe(1)
    expect(log.getContentHash(docId, deviceId, 0)).toBe(firstHash)
    expect(log.getSince(docId, {})).toEqual([first])
  })

  it('getSince returns only entries with seq > heads[deviceId], per device ascending', async () => {
    const author = await makeAuthor('a')
    const docId = randomUUID()
    const devA = randomUUID()
    const devB = randomUUID()

    const a0 = await makeEntryJws({ author, docId, deviceId: devA, seq: 0, plaintext: 'a0' })
    const a1 = await makeEntryJws({ author, docId, deviceId: devA, seq: 1, plaintext: 'a1' })
    const a2 = await makeEntryJws({ author, docId, deviceId: devA, seq: 2, plaintext: 'a2' })
    const b0 = await makeEntryJws({ author, docId, deviceId: devB, seq: 0, plaintext: 'b0' })

    for (const [dev, seq, jws] of [
      [devA, 0, a0],
      [devA, 1, a1],
      [devA, 2, a2],
      [devB, 0, b0],
    ] as const) {
      log.appendEntry({ docId, deviceId: dev, seq, contentHash: await log.hashEntry(jws), entryJws: jws })
    }

    // From scratch: all four.
    expect(new Set(log.getSince(docId, {}))).toEqual(new Set([a0, a1, a2, b0]))

    // With heads {devA:1}: only a2 and (devB absent → from 0) b0.
    const since = log.getSince(docId, { [devA]: 1 })
    expect(new Set(since)).toEqual(new Set([a2, b0]))

    expect(log.getHeads(docId)).toEqual({ [devA]: 2, [devB]: 0 })
  })

  it('supports limit + truncation deterministically', async () => {
    const author = await makeAuthor('a')
    const docId = randomUUID()
    const deviceId = randomUUID()
    const entries: string[] = []
    for (let seq = 0; seq < 5; seq += 1) {
      const jws = await makeEntryJws({ author, docId, deviceId, seq, plaintext: `e${seq}` })
      entries.push(jws)
      log.appendEntry({ docId, deviceId, seq, contentHash: await log.hashEntry(jws), entryJws: jws })
    }

    const page = log.getSinceWithTruncation(docId, {}, 2)
    expect(page.entries).toEqual([entries[0], entries[1]])
    expect(page.truncated).toBe(true)

    // Resume from heads {deviceId:1}: next two, still truncated.
    const page2 = log.getSinceWithTruncation(docId, { [deviceId]: 1 }, 2)
    expect(page2.entries).toEqual([entries[2], entries[3]])
    expect(page2.truncated).toBe(true)

    // Final page is not truncated.
    const page3 = log.getSinceWithTruncation(docId, { [deviceId]: 3 }, 2)
    expect(page3.entries).toEqual([entries[4]])
    expect(page3.truncated).toBe(false)
  })

  it('retains entries (never deletes — no delete after ACK)', async () => {
    // There is no delete API. After serving a catch-up page the entries remain,
    // so a second fresh client reconstructs identically.
    const author = await makeAuthor('a')
    const docId = randomUUID()
    const deviceId = randomUUID()
    const jws = await makeEntryJws({ author, docId, deviceId, seq: 0, plaintext: 'durable' })
    log.appendEntry({ docId, deviceId, seq: 0, contentHash: await log.hashEntry(jws), entryJws: jws })

    // Serve once.
    expect(log.getSince(docId, {})).toEqual([jws])
    // Serve again — still there.
    expect(log.getSince(docId, {})).toEqual([jws])
    expect(log.entryCount(docId)).toBe(1)
    expect(Object.getOwnPropertyNames(Object.getPrototypeOf(log))).not.toContain('delete')
  })

  it('reports stats (entriesByDoc, devicesByDoc, totalLogBytes, docCount)', async () => {
    const author = await makeAuthor('a')
    const docA = randomUUID()
    const docB = randomUUID()
    const devA = randomUUID()
    const devB = randomUUID()

    const e1 = await makeEntryJws({ author, docId: docA, deviceId: devA, seq: 0, plaintext: 'a' })
    const e2 = await makeEntryJws({ author, docId: docA, deviceId: devB, seq: 0, plaintext: 'b' })
    const e3 = await makeEntryJws({ author, docId: docB, deviceId: devA, seq: 0, plaintext: 'c' })
    for (const [doc, dev, jws] of [
      [docA, devA, e1],
      [docA, devB, e2],
      [docB, devA, e3],
    ] as const) {
      log.appendEntry({ docId: doc, deviceId: dev, seq: 0, contentHash: await log.hashEntry(jws), entryJws: jws })
    }

    expect(log.docCount()).toBe(2)
    expect(log.entryCount()).toBe(3)
    expect(log.entriesByDoc()).toEqual({ [docA]: 2, [docB]: 1 })
    expect(log.devicesByDoc()).toEqual({ [docA]: 2, [docB]: 1 })
    expect(log.totalLogBytes()).toBe(e1.length + e2.length + e3.length)
  })

  it('shares one Database handle and does not close a borrowed connection', async () => {
    // The relay shares ONE better-sqlite3 connection between OfflineQueue and
    // DocLog; a borrowed handle must stay open after DocLog.close().
    const db = new Database(':memory:')
    const shared = new DocLog(db)
    const author = await makeAuthor('a')
    const docId = randomUUID()
    const deviceId = randomUUID()
    const jws = await makeEntryJws({ author, docId, deviceId, seq: 0, plaintext: 'shared' })
    shared.appendEntry({ docId, deviceId, seq: 0, contentHash: await shared.hashEntry(jws), entryJws: jws })

    shared.close() // no-op for a borrowed handle
    expect(db.open).toBe(true)
    db.close()
  })
})
