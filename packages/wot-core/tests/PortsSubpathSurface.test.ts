import { describe, it, expect } from 'vitest'
import * as ports from '../src/ports'

// Pins the published `@web_of_trust/core/ports` RUNTIME surface (#326 review):
// the capability guards have always shipped from this subpath. Moving their
// implementation must not silently drop them — external consumers import them
// from here, and internal type-only usage would never notice the loss.
describe('published ports subpath surface', () => {
  it('still ships the three replication capability guards as functions', () => {
    expect(typeof ports.hasMembershipActivity).toBe('function')
    expect(typeof ports.hasSecureSelfLeave).toBe('function')
    expect(typeof ports.hasDeterministicPrivateSpace).toBe('function')
    expect(typeof ports.hasDurableTransact).toBe('function')
  })
})
