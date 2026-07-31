import { describe, it, expect } from 'vitest'
import { openLifecycleLease, LifecycleChangedError } from '../src/application/spaces/lifecycle-lease'

describe('LifecycleLease', () => {
  it('stays valid while the issuing session is live', async () => {
    let epoch = 0
    const lease = openLifecycleLease(() => epoch)
    expect(lease.valid).toBe(true)
    expect(() => lease.check()).not.toThrow()
    await expect(lease.step(Promise.resolve('value'))).resolves.toBe('value')
  })

  it('rejects at the await that spans the lifecycle change', async () => {
    let epoch = 0
    const lease = openLifecycleLease(() => epoch, 'the space creation')
    // The work resolves normally — the stop() lands WHILE it is in flight, which is
    // exactly the gap a hand-placed check after the previous await cannot see.
    const work = new Promise<string>((resolve) => setTimeout(() => resolve('done'), 0))
    epoch = 1
    await expect(lease.step(work)).rejects.toThrow(LifecycleChangedError)
    await expect(lease.step(work)).rejects.toThrow(/the space creation was in flight/)
    expect(lease.valid).toBe(false)
    expect(() => lease.check()).toThrow(LifecycleChangedError)
  })

  it('does not swallow the work\'s own failure', async () => {
    let epoch = 0
    const lease = openLifecycleLease(() => epoch)
    await expect(lease.step(Promise.reject(new Error('durable write failed')))).rejects.toThrow(/durable write failed/)
    expect(lease.valid).toBe(true) // a work failure is not a lifecycle change
  })

  it('binds to the epoch at issue time, so a later lease is independent', () => {
    let epoch = 0
    const first = openLifecycleLease(() => epoch)
    epoch = 1
    const second = openLifecycleLease(() => epoch)
    expect(first.valid).toBe(false)
    expect(second.valid).toBe(true)
  })
})
