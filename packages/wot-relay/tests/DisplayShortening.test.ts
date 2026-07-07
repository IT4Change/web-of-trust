import { describe, it, expect } from 'vitest'
import { createHash } from 'crypto'
import {
  shortenDid,
  shortenDeviceId,
  shortenDocId,
  buildDisplayBlock,
  DISPLAY_TOP_DOCS_LIMIT,
} from '../src/relay.js'

// Broker-Dashboard: the /dashboard/data `display` block shortens ids SERVER-SIDE
// (relay.ts), so full ids never leave an unauthenticated + ACAO:* endpoint without
// RELAY_DEBUG_STATS. These unit-test the exported shorten*/buildDisplayBlock helpers:
// the shortening RULES (DID prefix+suffix, deviceId prefix, docId sha256-hash) and
// their DETERMINISM (stable across polls).

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

describe('shortenDocId', () => {
  it('hashes with sha256 and keeps first 10 hex + … (NOT a prefix cut)', () => {
    const docId = 'familie-mueller-urlaubsplanung-2026'
    const expectedHex = createHash('sha256').update(docId, 'utf8').digest('hex').slice(0, 10)
    expect(shortenDocId(docId)).toBe(`${expectedHex}…`)
    // The speaking name must NOT survive — this is why docIds are hashed, not prefixed.
    expect(shortenDocId(docId)).not.toContain('familie')
    expect(shortenDocId(docId)).not.toContain('mueller')
  })

  it('is deterministic (stable hash across polls)', () => {
    const docId = 'some-client-chosen-doc-id'
    expect(shortenDocId(docId)).toBe(shortenDocId(docId))
  })

  it('produces different short ids for different docIds', () => {
    expect(shortenDocId('doc-a')).not.toBe(shortenDocId('doc-b'))
  })

  it('emits exactly 10 hex chars + the ellipsis', () => {
    const out = shortenDocId('anything')
    expect(out.endsWith('…')).toBe(true)
    expect(out.slice(0, -1)).toMatch(/^[0-9a-f]{10}$/)
  })
})

describe('buildDisplayBlock', () => {
  const did1 = 'did:key:z6Mk1111111111111111111111111111AAAA'
  const did2 = 'did:key:z6Mk2222222222222222222222222222BBBB'
  const docA = 'space-alpha-client-chosen'
  const docB = 'space-beta-client-chosen'

  it('builds dids (shortened, deviceCount, online) sorted by deviceCount desc', () => {
    const block = buildDisplayBlock({
      connectedDids: [did1],
      devicesPerDid: { [did1]: 1, [did2]: 3 },
      entriesByDoc: {},
      devicesByDoc: {},
      inboxPendingByDid: {},
    })
    expect(block.dids).toEqual([
      { idShort: shortenDid(did2), deviceCount: 3, online: false },
      { idShort: shortenDid(did1), deviceCount: 1, online: true },
    ])
  })

  it('builds topDocs (hashed id, entries, devices) sorted by entries desc', () => {
    const block = buildDisplayBlock({
      connectedDids: [],
      devicesPerDid: {},
      entriesByDoc: { [docA]: 2, [docB]: 5 },
      devicesByDoc: { [docA]: 1, [docB]: 2 },
      inboxPendingByDid: {},
    })
    expect(block.topDocs).toEqual([
      { idShort: shortenDocId(docB), entries: 5, devices: 2 },
      { idShort: shortenDocId(docA), entries: 2, devices: 1 },
    ])
  })

  it('caps topDocs at DISPLAY_TOP_DOCS_LIMIT', () => {
    const entriesByDoc: Record<string, number> = {}
    for (let i = 0; i < DISPLAY_TOP_DOCS_LIMIT + 5; i++) entriesByDoc[`doc-${i}`] = i
    const block = buildDisplayBlock({
      connectedDids: [],
      devicesPerDid: {},
      entriesByDoc,
      devicesByDoc: {},
      inboxPendingByDid: {},
    })
    expect(block.topDocs).toHaveLength(DISPLAY_TOP_DOCS_LIMIT)
    // Highest-entry docs are retained (doc-16 = 16 is the top).
    expect(block.topDocs[0].entries).toBe(DISPLAY_TOP_DOCS_LIMIT + 4)
  })

  it('defaults devices to 0 when a doc is absent from devicesByDoc', () => {
    const block = buildDisplayBlock({
      connectedDids: [],
      devicesPerDid: {},
      entriesByDoc: { [docA]: 1 },
      devicesByDoc: {},
      inboxPendingByDid: {},
    })
    expect(block.topDocs[0].devices).toBe(0)
  })

  it('builds inboxPendingByDid (shortened) sorted by pending desc', () => {
    const block = buildDisplayBlock({
      connectedDids: [],
      devicesPerDid: {},
      entriesByDoc: {},
      devicesByDoc: {},
      inboxPendingByDid: { [did1]: 1, [did2]: 4 },
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
      entriesByDoc: { [docA]: 3 },
      devicesByDoc: { [docA]: 1 },
      inboxPendingByDid: { [did2]: 1 },
    })
    const serialized = JSON.stringify(block)
    expect(serialized).not.toContain(did1)
    expect(serialized).not.toContain(did2)
    expect(serialized).not.toContain(docA)
  })

  it('is deterministic for identical input', () => {
    const input = {
      connectedDids: [did1],
      devicesPerDid: { [did1]: 2, [did2]: 2 },
      entriesByDoc: { [docA]: 1, [docB]: 1 },
      devicesByDoc: {},
      inboxPendingByDid: {},
    }
    expect(JSON.stringify(buildDisplayBlock(input))).toBe(JSON.stringify(buildDisplayBlock(input)))
  })
})
