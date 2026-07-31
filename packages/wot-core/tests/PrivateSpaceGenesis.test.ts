import { describe, it, expect } from 'vitest'
import { WebCryptoProtocolCryptoAdapter } from '../src/adapters/protocol-crypto'
import {
  derivePrivateSpaceGenesis,
  derivePrivateSpaceGenesisFromSeedHex,
} from '../src/protocol/sync/private-space'
import { bip39SeedHexToBytes } from '../src/protocol/sync/admin-key'

const SEED_HEX =
  '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f' +
  '202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f'
const OTHER_SEED_HEX =
  'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' +
  'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

const crypto = new WebCryptoProtocolCryptoAdapter()

describe('derivePrivateSpaceGenesis (Sync 001)', () => {
  it('derives the three separate HKDF contexts with the frozen info strings + lengths', async () => {
    const seed = bip39SeedHexToBytes(SEED_HEX)
    const g = await derivePrivateSpaceGenesisFromSeedHex(SEED_HEX, crypto)

    // Independent recomputation proves the exact info strings + lengths (+ 32-zero salt).
    const expectedContent = await crypto.hkdfSha256(seed, 'wot/private-space/content/v1', 32)
    const expectedCap = await crypto.hkdfSha256(seed, 'wot/private-space/cap/v1', 32)
    const idBytes = await crypto.hkdfSha256(seed, 'wot/private-space/id/v1', 16)

    expect(g.contentKey).toEqual(expectedContent)
    expect(g.capabilitySigningSeed).toEqual(expectedCap)
    expect(g.contentKey.length).toBe(32)
    expect(g.capabilitySigningSeed.length).toBe(32)

    // spaceId is the UUID v4 (version + variant bits) of the first 16 id bytes.
    expect(g.spaceId).toMatch(UUID_V4)
    const raw = idBytes.slice(0, 16)
    raw[6] = (raw[6] & 0x0f) | 0x40
    raw[8] = (raw[8] & 0x3f) | 0x80
    const hex = Array.from(raw, (b) => b.toString(16).padStart(2, '0')).join('')
    const expectedId = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
    expect(g.spaceId).toBe(expectedId)
  })

  it('is deterministic: two derivations of the same identity are byte-identical', async () => {
    const a = await derivePrivateSpaceGenesisFromSeedHex(SEED_HEX, crypto)
    const b = await derivePrivateSpaceGenesisFromSeedHex(SEED_HEX, crypto)
    expect(a.spaceId).toBe(b.spaceId)
    expect(a.contentKey).toEqual(b.contentKey)
    expect(a.capabilitySigningSeed).toEqual(b.capabilitySigningSeed)
  })

  it('differs across identities', async () => {
    const a = await derivePrivateSpaceGenesisFromSeedHex(SEED_HEX, crypto)
    const b = await derivePrivateSpaceGenesisFromSeedHex(OTHER_SEED_HEX, crypto)
    expect(a.spaceId).not.toBe(b.spaceId)
    expect(a.contentKey).not.toEqual(b.contentKey)
    expect(a.capabilitySigningSeed).not.toEqual(b.capabilitySigningSeed)
  })

  it('operation-shaped path (derive callback) matches the seed-hex twin', async () => {
    const seed = bip39SeedHexToBytes(SEED_HEX)
    const viaCallback = await derivePrivateSpaceGenesis((info, length) => crypto.hkdfSha256(seed, info, length))
    const viaSeedHex = await derivePrivateSpaceGenesisFromSeedHex(SEED_HEX, crypto)
    expect(viaCallback).toEqual(viaSeedHex)
  })

  // Frozen wire contract: the derived spaceId for a fixed seed must never change.
  it('pins the derived spaceId (frozen wire contract)', async () => {
    const g = await derivePrivateSpaceGenesisFromSeedHex(SEED_HEX, crypto)
    expect(g.spaceId).toBe('76f17749-6d34-42b9-a0a9-c674cf684b63')
  })
})
