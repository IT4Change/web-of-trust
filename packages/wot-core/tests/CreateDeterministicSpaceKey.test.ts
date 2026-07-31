import { describe, it, expect } from 'vitest'
import { InMemoryKeyManagementAdapter } from '../src/adapters/key-management/InMemoryKeyManagementAdapter'
import { WebCryptoProtocolCryptoAdapter } from '../src/adapters/protocol-crypto'
import { createDeterministicSpaceKey, rotateSpaceKey } from '../src/application/sync/group-key-workflow'
import { derivePrivateSpaceGenesisFromSeedHex } from '../src/protocol/sync/private-space'

const SEED_HEX =
  '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f' +
  '202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f'
const OWNER_DID = 'did:key:z6MkOwner'

const crypto = new WebCryptoProtocolCryptoAdapter()

async function genesis() {
  return derivePrivateSpaceGenesisFromSeedHex(SEED_HEX, crypto)
}

function opts(keyPort: InMemoryKeyManagementAdapter, spaceId: string, g: { contentKey: Uint8Array; capabilitySigningSeed: Uint8Array }) {
  return { crypto, keyPort, spaceId, ownerDid: OWNER_DID, genesisMaterial: { contentKey: g.contentKey, capabilitySigningSeed: g.capabilitySigningSeed } }
}

describe('createDeterministicSpaceKey (Sync 001 genesis, gen-0 idempotency)', () => {
  it('NORMAL create: persists genesis content key + capability at generation 0', async () => {
    const g = await genesis()
    const keyPort = new InMemoryKeyManagementAdapter()
    const r = await createDeterministicSpaceKey(opts(keyPort, g.spaceId, g))

    expect(await keyPort.getCurrentGeneration(g.spaceId)).toBe(0)
    expect(await keyPort.getKeyByGeneration(g.spaceId, 0)).toEqual(g.contentKey)
    expect(r.contentKey).toEqual(g.contentKey)
    expect(r.ownCapabilityJws).toBeTruthy()
  })

  it('IDEMPOTENT re-run: returns the stored material and does not re-mint the own-capability', async () => {
    const g = await genesis()
    const keyPort = new InMemoryKeyManagementAdapter()
    const first = await createDeterministicSpaceKey(opts(keyPort, g.spaceId, g))
    const second = await createDeterministicSpaceKey(opts(keyPort, g.spaceId, g))

    expect(second.ownCapabilityJws).toBe(first.ownCapabilityJws) // byte-identical, no re-mint
    expect(second.contentKey).toEqual(g.contentKey)
    expect(await keyPort.getCurrentGeneration(g.spaceId)).toBe(0)
  })

  it('PARTIAL-CRASH repair: content key persisted but capability chain missing → completes from same bytes', async () => {
    const g = await genesis()
    const keyPort = new InMemoryKeyManagementAdapter()
    // Simulate a crash after saveKey but before the capability writes.
    await keyPort.saveKey(g.spaceId, 0, g.contentKey)
    expect(await keyPort.getCapabilityVerificationKey(g.spaceId, 0)).toBeNull()

    const r = await createDeterministicSpaceKey(opts(keyPort, g.spaceId, g))
    expect(r.ownCapabilityJws).toBeTruthy()
    expect(await keyPort.getCapabilityVerificationKey(g.spaceId, 0)).toEqual(r.capabilityVerificationKey)
  })

  it('HARD conflict: a divergent content key already at generation 0 fails', async () => {
    const g = await genesis()
    const keyPort = new InMemoryKeyManagementAdapter()
    await keyPort.saveKey(g.spaceId, 0, new Uint8Array(32).fill(7)) // foreign gen-0 content key

    await expect(createDeterministicSpaceKey(opts(keyPort, g.spaceId, g))).rejects.toThrow(/DIVERGENT content key/)
  })

  it('gen > 0 REFUSED: never reactivates genesis after a rotation', async () => {
    const g = await genesis()
    const keyPort = new InMemoryKeyManagementAdapter()
    await createDeterministicSpaceKey(opts(keyPort, g.spaceId, g))
    await rotateSpaceKey({ crypto, keyPort, spaceId: g.spaceId, ownerDid: OWNER_DID })
    expect(await keyPort.getCurrentGeneration(g.spaceId)).toBe(1)

    await expect(createDeterministicSpaceKey(opts(keyPort, g.spaceId, g))).rejects.toThrow(/already rotated to generation 1/)
  })
})
