import { describe, it, expect } from 'vitest'
import { hasNamedRoots, assertValidNamedRootName, isValidNamedRootName } from '../src/application/spaces/replication-capabilities'
import * as ports from '../src/ports'
import type { SpaceHandle } from '../src/ports/ReplicationAdapter'

function stubHandle(extra: Record<string, unknown> = {}): SpaceHandle<unknown> {
  return {
    id: 'space-1',
    info: () => ({ id: 'space-1' }) as never,
    getDoc: () => ({}),
    getMeta: () => ({}),
    transact: () => {},
    onRemoteUpdate: () => () => {},
    close: () => {},
    ...extra,
  } as SpaceHandle<unknown>
}

describe('NamedRootsCapable', () => {
  it('hasNamedRoots is false for a plain handle', () => {
    expect(hasNamedRoots(stubHandle())).toBe(false)
  })

  it('hasNamedRoots requires all three methods', () => {
    expect(hasNamedRoots(stubHandle({ getRoot: () => ({}) }))).toBe(false)
    expect(hasNamedRoots(stubHandle({ getRoot: () => ({}), transactRoot: () => {} }))).toBe(false)
    expect(hasNamedRoots(stubHandle({
      getRoot: () => ({}),
      transactRoot: () => {},
      transactRootDurable: async () => {},
    }))).toBe(true)
  })

  it('hasNamedRoots tolerates null/undefined', () => {
    expect(hasNamedRoots(null as never)).toBe(false)
    expect(hasNamedRoots(undefined as never)).toBe(false)
  })

  it('accepts lowerCamelCase names', () => {
    for (const name of ['profiles', 'p', 'profileIndex', 'a1', 'x0Y9']) {
      expect(isValidNamedRootName(name)).toBe(true)
      expect(() => assertValidNamedRootName(name)).not.toThrow()
    }
  })

  it('rejects names outside ^[a-z][A-Za-z0-9]*$', () => {
    for (const name of ['', 'Profiles', '1abc', 'a-b', 'a.b', 'a b', 'ä', 'a_b']) {
      expect(isValidNamedRootName(name)).toBe(false)
      expect(() => assertValidNamedRootName(name)).toThrow()
    }
  })

  it('reserves adapter-internal underscore names', () => {
    for (const name of ['_meta', '_members', '_admins']) {
      expect(isValidNamedRootName(name)).toBe(false)
      expect(() => assertValidNamedRootName(name)).toThrow(/reserved|reserviert/i)
    }
  })

  it('rejects the doc root "data"', () => {
    expect(isValidNamedRootName('data')).toBe(false)
    expect(() => assertValidNamedRootName('data')).toThrow(/data/)
  })

  it('rejects non-string names', () => {
    expect(isValidNamedRootName(42 as never)).toBe(false)
    expect(() => assertValidNamedRootName(undefined as never)).toThrow()
  })

  it('ships the guard from the published ports subpath', () => {
    expect(typeof (ports as Record<string, unknown>).hasNamedRoots).toBe('function')
    expect(typeof (ports as Record<string, unknown>).assertValidNamedRootName).toBe('function')
  })
})
