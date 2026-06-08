import { describe, expect, it } from 'vitest'
import { InMemoryKeyManagementAdapter } from '../src/adapters/key-management/InMemoryKeyManagementAdapter'

// KeyManagementPort contract (Sync 001 Z.96 one-key-per-docId, Z.187 generation
// versioning). The in-memory default adapter mirrors the WebCrypto default for
// the crypto port: no durable storage (that is a follow-up sub-slice).

function key(fill: number): Uint8Array {
  return new Uint8Array(32).fill(fill)
}
function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

describe('InMemoryKeyManagementAdapter (KeyManagementPort contract)', () => {
  it('saves and retrieves the current key + generation', async () => {
    const port = new InMemoryKeyManagementAdapter()
    await port.saveKey('s1', 0, key(1))
    expect(hex((await port.getCurrentKey('s1'))!)).toBe(hex(key(1)))
    expect(await port.getCurrentGeneration('s1')).toBe(0)
  })

  it('returns -1 / null for an unknown space', async () => {
    const port = new InMemoryKeyManagementAdapter()
    expect(await port.getCurrentGeneration('nope')).toBe(-1)
    expect(await port.getCurrentKey('nope')).toBeNull()
    expect(await port.getKeyByGeneration('nope', 0)).toBeNull()
  })

  it('tracks multiple generations and keeps old keys retrievable', async () => {
    const port = new InMemoryKeyManagementAdapter()
    await port.saveKey('s1', 0, key(0))
    await port.saveKey('s1', 1, key(1))
    await port.saveKey('s1', 2, key(2))
    expect(await port.getCurrentGeneration('s1')).toBe(2)
    expect(hex((await port.getKeyByGeneration('s1', 0))!)).toBe(hex(key(0)))
    expect(hex((await port.getKeyByGeneration('s1', 1))!)).toBe(hex(key(1)))
    expect(hex((await port.getCurrentKey('s1'))!)).toBe(hex(key(2)))
  })

  it('isolates spaces from each other', async () => {
    const port = new InMemoryKeyManagementAdapter()
    await port.saveKey('a', 0, key(1))
    await port.saveKey('b', 0, key(2))
    expect(hex((await port.getCurrentKey('a'))!)).toBe(hex(key(1)))
    expect(hex((await port.getCurrentKey('b'))!)).toBe(hex(key(2)))
  })

  it('rejects an invalid generation', async () => {
    const port = new InMemoryKeyManagementAdapter()
    await expect(port.saveKey('s1', -1, key(1))).rejects.toThrow()
    await expect(port.saveKey('s1', 1.5, key(1))).rejects.toThrow()
    await expect(port.saveKey('s1', Number.NaN, key(1))).rejects.toThrow()
  })

  it('rejects a key that is not 32 bytes', async () => {
    const port = new InMemoryKeyManagementAdapter()
    await expect(port.saveKey('s1', 0, new Uint8Array(31))).rejects.toThrow()
  })

  it('returns null for a generation gap (never a placeholder)', async () => {
    const port = new InMemoryKeyManagementAdapter()
    await port.saveKey('s1', 2, key(2)) // gaps at generation 0 and 1
    expect(await port.getKeyByGeneration('s1', 0)).toBeNull()
    expect(await port.getKeyByGeneration('s1', 1)).toBeNull()
    expect(hex((await port.getKeyByGeneration('s1', 2))!)).toBe(hex(key(2)))
    expect(await port.getCurrentGeneration('s1')).toBe(2)
  })

  it('defensively copies on save (caller mutation does not affect storage)', async () => {
    const port = new InMemoryKeyManagementAdapter()
    const input = key(5)
    await port.saveKey('s1', 0, input)
    input.fill(9) // mutate the caller's array after saving
    expect(hex((await port.getCurrentKey('s1'))!)).toBe(hex(key(5)))
  })

  it('returns copies (caller mutation does not affect storage; distinct buffers)', async () => {
    const port = new InMemoryKeyManagementAdapter()
    await port.saveKey('s1', 0, key(7))
    const a = (await port.getCurrentKey('s1'))!
    const b = (await port.getCurrentKey('s1'))!
    a.fill(0) // mutate the first returned copy
    expect(hex(b)).toBe(hex(key(7)))
    expect(a.buffer).not.toBe(b.buffer)
  })
})
