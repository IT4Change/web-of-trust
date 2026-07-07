import { describe, it, expect } from 'vitest'
import { createHash, randomBytes } from 'crypto'
import {
  shortenDid,
  shortenDeviceId,
  shortenDocId,
  buildDisplayBlock,
  DISPLAY_TOP_DOCS_LIMIT,
} from '../src/relay.js'

// Broker-Dashboard: the /dashboard/data `display` block shortens ids SERVER-SIDE
// (relay.ts), so full ids never leave an unauthenticated + ACAO:* endpoint without
// RELAY_DEBUG_STATS. These unit-test the exported helpers:
// - DIDs/deviceIds: PREFIX cuts (high-entropy random identifiers — no candidate
//   dictionary exists, so a prefix is not an oracle).
// - docIds: KEYED hash (HMAC-SHA256 with a per-process random salt) — an unsalted
//   hash of a CLIENT-CHOSEN speaking name would be a guessing oracle on the public
//   surface (review-#256 blocker). Shortcuts are deterministic per (docId, salt),
//   differ across salts (i.e. across relay restarts), and are NOT reproducible
//   offline without the process secret.

const SALT = randomBytes(32)

describe('shortenDid', () => {
  it('cuts a did:key to first-8 of the multibase part + … + last-4', () => {
    const did = 'did:key:z6MktgyStabcdefghijklmnopqrstuvwxyztUfX'
    // multibase part = 'z6MktgyStabcdefghijklmnopqrstuvwxyztUfX'
    expect(shortenDid(did)).toBe('z6MktgyS…tUfX')
  })

  it('is deterministic (same input → same output across calls)', () => {
    const did = 'did:key:z6MkExampleDeterministicKeyMaterialXYZ'
    expect(shortenDid(did)).toBe(shortenDid(did))
  })

  it('does NOT leak the middle of the multibase key', () => {
    const did = 'did:key:z6MkSECRETMIDDLESECTIONdefghijklmnEND'
    const out = shortenDid(did)
    expect(out).not.toContain('SECRETMIDDLESECTION')
    expect(out).not.toContain('MIDDLE')
  })

  it('returns a very short multibase unchanged (nothing to hide)', () => {
    expect(shortenDid('did:key:z6Mk')).toBe('z6Mk')
  })

  it('falls back to a generic middle-ellipsis for a non-did:key string', () => {
    const s = 'urn:some:other:identifier:value:1234567890'
    const out = shortenDid(s)
    expect(out).toBe(`${s.slice(0, 10)}…${s.slice(-4)}`)
    // Middle is elided → the full string is not present.
    expect(out).not.toBe(s)
  })

  it('returns a short non-did:key input unchanged', () => {
    expect(shortenDid('short-id')).toBe('short-id')
  })
})

describe('shortenDeviceId', () => {
  it('keeps the first 8 chars of a UUID v4 + …', () => {
    const dev = '87473e1b-1234-4abc-9def-0123456789ab'
    expect(shortenDeviceId(dev)).toBe('87473e1b…')
  })

  it('is deterministic', () => {
    const dev = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
    expect(shortenDeviceId(dev)).toBe(shortenDeviceId(dev))
  })

  it('does not leak the random tail of the UUID', () => {
    const dev = '12345678-dead-4beef-cafe-tailSECRET99'
    expect(shortenDeviceId(dev)).not.toContain('SECRET')
  })

  it('returns an <=8-char input unchanged', () => {
    expect(shortenDeviceId('abc')).toBe('abc')
    expect(shortenDeviceId('12345678')).toBe('12345678')
  })
})

describe('shortenDocId — keyed (salted) hash', () => {
  it('emits exactly 10 hex chars + the ellipsis and hides speaking names', () => {
    const docId = 'familie-mueller-urlaubsplanung-2026'
    const out = shortenDocId(docId, SALT)
    expect(out.endsWith('…')).toBe(true)
    expect(out.slice(0, -1)).toMatch(/^[0-9a-f]{10}$/)
    expect(out).not.toContain('familie')
    expect(out).not.toContain('mueller')
  })

  it('is deterministic WITHIN one salt (stable across polls of one process)', () => {
    const docId = 'some-client-chosen-doc-id'
    expect(shortenDocId(docId, SALT)).toBe(shortenDocId(docId, SALT))
  })

  it('produces DIFFERENT shortcuts under different salts (i.e. across restarts)', () => {
    const docId = 'familie-mueller-urlaubsplanung-2026'
    const saltA = randomBytes(32)
    const saltB = randomBytes(32)
    expect(shortenDocId(docId, saltA)).not.toBe(shortenDocId(docId, saltB))
  })

  it('ORACLE TEST: an offline unsalted sha256(docId) prefix does NOT match the shortcut', () => {
    // The review-#256 blocker: with an unsalted hash an observer offline-hashes
    // candidate names and compares prefixes against the public surface. With the
    // keyed hash the candidate computation (sha256 without the process secret)
    // must NOT reproduce the served shortcut.
    const docId = 'familie-mueller-urlaubsplanung-2026'
    const offlineGuess = `${createHash('sha256').update(docId, 'utf8').digest('hex').slice(0, 10)}…`
    expect(shortenDocId(docId, SALT)).not.toBe(offlineGuess)
  })

  it('produces different short ids for different docIds under the same salt', () => {
    expect(shortenDocId('doc-a', SALT)).not.toBe(shortenDocId('doc-b', SALT))
  })
})

describe('buildDisplayBlock', () => {
  const did1 = 'did:key:z6Mk1111111111111111111111111111AAAA'
  const did2 = 'did:key:z6Mk2222222222222222222222222222BBBB'
  const docA = 'space-alpha-client-chosen'
  const docB = 'space-beta-client-chosen'
  const EMPTY = { topDocs: [], inboxPendingByDid: [], docIdSalt: SALT }

  it('builds dids (shortened, deviceCount, online) sorted by deviceCount desc', () => {
    const block = buildDisplayBlock({
      ...EMPTY,
      connectedDids: [did1],
      devicesPerDid: { [did1]: 1, [did2]: 3 },
    })
    expect(block.dids).toEqual([
      { idShort: shortenDid(did2), deviceCount: 3, online: false },
      { idShort: shortenDid(did1), deviceCount: 1, online: true },
    ])
  })

  it('builds topDocs (keyed-hash id, entries, devices) sorted by entries desc', () => {
    const block = buildDisplayBlock({
      ...EMPTY,
      connectedDids: [],
      devicesPerDid: {},
      topDocs: [
        { docId: docA, entries: 2, devices: 1 },
        { docId: docB, entries: 5, devices: 2 },
      ],
    })
    expect(block.topDocs).toEqual([
      { idShort: shortenDocId(docB, SALT), entries: 5, devices: 2 },
      { idShort: shortenDocId(docA, SALT), entries: 2, devices: 1 },
    ])
  })

  it('defensively caps topDocs at DISPLAY_TOP_DOCS_LIMIT (belt — SQL already limits)', () => {
    const topDocs: Array<{ docId: string; entries: number; devices: number }> = []
    for (let i = 0; i < DISPLAY_TOP_DOCS_LIMIT + 5; i++) {
      topDocs.push({ docId: `doc-${i}`, entries: i, devices: 1 })
    }
    const block = buildDisplayBlock({
      ...EMPTY,
      connectedDids: [],
      devicesPerDid: {},
      topDocs,
    })
    expect(block.topDocs).toHaveLength(DISPLAY_TOP_DOCS_LIMIT)
    // Highest-entry docs are retained.
    expect(block.topDocs[0].entries).toBe(DISPLAY_TOP_DOCS_LIMIT + 4)
  })

  it('builds inboxPendingByDid (shortened) sorted by pending desc', () => {
    const block = buildDisplayBlock({
      ...EMPTY,
      connectedDids: [],
      devicesPerDid: {},
      inboxPendingByDid: [
        { did: did1, pending: 1 },
        { did: did2, pending: 4 },
      ],
    })
    expect(block.inboxPendingByDid).toEqual([
      { idShort: shortenDid(did2), pending: 4 },
      { idShort: shortenDid(did1), pending: 1 },
    ])
  })

  it('never carries a FULL id anywhere in the built block (arrays only)', () => {
    const block = buildDisplayBlock({
      connectedDids: [did1],
      devicesPerDid: { [did1]: 2 },
      topDocs: [{ docId: docA, entries: 3, devices: 1 }],
      inboxPendingByDid: [{ did: did2, pending: 1 }],
      docIdSalt: SALT,
    })
    const serialized = JSON.stringify(block)
    expect(serialized).not.toContain(did1)
    expect(serialized).not.toContain(did2)
    expect(serialized).not.toContain(docA)
  })

  it('is deterministic for identical input (same salt)', () => {
    const input = {
      connectedDids: [did1],
      devicesPerDid: { [did1]: 2, [did2]: 2 },
      topDocs: [
        { docId: docA, entries: 1, devices: 1 },
        { docId: docB, entries: 1, devices: 1 },
      ],
      inboxPendingByDid: [],
      docIdSalt: SALT,
    }
    expect(JSON.stringify(buildDisplayBlock(input))).toBe(JSON.stringify(buildDisplayBlock(input)))
  })
})
