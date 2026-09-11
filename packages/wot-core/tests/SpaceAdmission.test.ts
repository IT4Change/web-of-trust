import { describe, it, expect } from 'vitest'
import { InMemoryKeyManagementAdapter } from '../src/adapters/key-management/InMemoryKeyManagementAdapter'
import { WebCryptoProtocolCryptoAdapter } from '../src/adapters/protocol-crypto/web-crypto'
import { deriveAdmission, isSameAdmission, compareAdmission } from '../src/application/spaces/admission'

const crypto = new WebCryptoProtocolCryptoAdapter()

describe('SpaceAdmission (RLS-Spec 12 Regel 4: Aufnahme-Kennung je Space)', () => {
  it('deriveAdmission hasht die eigene Capability deterministisch (sha256 lowercase hex)', async () => {
    const keyPort = new InMemoryKeyManagementAdapter()
    await keyPort.saveOwnCapability('space-a', 3, 'jws-aaa')

    const first = await deriveAdmission({ crypto, keyPort, spaceId: 'space-a', generation: 3 })
    const second = await deriveAdmission({ crypto, keyPort, spaceId: 'space-a', generation: 3 })

    expect(first).toEqual(second)
    expect(first.keyGeneration).toBe(3)
    expect(first.capabilityId).toMatch(/^[0-9a-f]{64}$/)
  })

  it('deriveAdmission: andere Capability-JWS → andere capabilityId', async () => {
    const keyPort = new InMemoryKeyManagementAdapter()
    await keyPort.saveOwnCapability('space-a', 0, 'jws-aaa')
    await keyPort.saveOwnCapability('space-b', 0, 'jws-bbb')

    const a = await deriveAdmission({ crypto, keyPort, spaceId: 'space-a', generation: 0 })
    const b = await deriveAdmission({ crypto, keyPort, spaceId: 'space-b', generation: 0 })

    expect(a.capabilityId).not.toBe(b.capabilityId)
  })

  it('deriveAdmission: ohne eigene Capability (Alt-Space) → capabilityId null', async () => {
    const keyPort = new InMemoryKeyManagementAdapter()
    const admission = await deriveAdmission({ crypto, keyPort, spaceId: 'space-a', generation: 2 })
    expect(admission).toEqual({ keyGeneration: 2, capabilityId: null })
  })

  it('isSameAdmission vergleicht beide Felder und toleriert undefined', () => {
    expect(isSameAdmission({ keyGeneration: 1, capabilityId: 'aa' }, { keyGeneration: 1, capabilityId: 'aa' })).toBe(true)
    expect(isSameAdmission({ keyGeneration: 1, capabilityId: 'aa' }, { keyGeneration: 2, capabilityId: 'aa' })).toBe(false)
    expect(isSameAdmission({ keyGeneration: 1, capabilityId: 'aa' }, { keyGeneration: 1, capabilityId: 'bb' })).toBe(false)
    expect(isSameAdmission({ keyGeneration: 1, capabilityId: null }, { keyGeneration: 1, capabilityId: null })).toBe(true)
    expect(isSameAdmission(undefined, undefined)).toBe(true)
    expect(isSameAdmission(undefined, { keyGeneration: 0, capabilityId: null })).toBe(false)
  })

  it('compareAdmission ordnet erst nach keyGeneration, dann nach capabilityId (null < String)', () => {
    const gen0 = { keyGeneration: 0, capabilityId: 'zz' }
    const gen1 = { keyGeneration: 1, capabilityId: 'aa' }
    expect(compareAdmission(gen1, gen0)).toBeGreaterThan(0)
    expect(compareAdmission(gen0, gen1)).toBeLessThan(0)
    expect(compareAdmission(gen0, { ...gen0 })).toBe(0)

    const nullCap = { keyGeneration: 0, capabilityId: null }
    expect(compareAdmission(nullCap, gen0)).toBeLessThan(0)
    expect(compareAdmission(gen0, nullCap)).toBeGreaterThan(0)
    expect(compareAdmission(nullCap, { keyGeneration: 0, capabilityId: null })).toBe(0)
    expect(compareAdmission({ keyGeneration: 0, capabilityId: 'ab' }, { keyGeneration: 0, capabilityId: 'ac' })).toBeLessThan(0)
  })
})
