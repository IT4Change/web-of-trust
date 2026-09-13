import { describe, it, expect } from 'vitest'
import { hasNamedRoots, assertValidNamedRootName, isValidNamedRootName, toJsonValue, defineRootKey, freezeDeep } from '../src/application/spaces/replication-capabilities'
import * as ports from '../src/ports'
import type { SpaceHandle, NamedRootsCapable } from '../src/ports/ReplicationAdapter'

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
    // Nur der Capability-Guard gehoert neben die drei bestehenden Guards in
    // `ports`. Die Wurzel-Helfer sind Anwendungsschicht und werden bewusst NICHT
    // ueber `ports` veroeffentlicht (siehe Kommentar in ports/index.ts).
    expect(typeof (ports as Record<string, unknown>).hasNamedRoots).toBe('function')
    expect((ports as Record<string, unknown>).toJsonValue).toBeUndefined()
    expect((ports as Record<string, unknown>).assertValidNamedRootName).toBeUndefined()
  })
})

// rls#352 uebergibt ein `interface`, kein `type`. Ein interface hat KEINE
// implizite Index-Signatur und erfuellt `Record<string, unknown>` deshalb
// nicht — die Schranke ist bewusst `object`. Der Test ist ein Typtest: er
// schlaegt beim `tsc --noEmit`/Vitest-Transform fehl, wenn die Schranke
// wieder enger wird.
interface ProfileEntry {
  name: string
  tags: string[]
}
interface ProfilesRoot {
  [did: `did:key:${string}`]: ProfileEntry
}

describe('NamedRootsCapable — Typschranke', () => {
  it('akzeptiert einen interface-Typ als R', () => {
    const calls: string[] = []
    const handle = stubHandle({
      getRoot: (name: string) => { calls.push(`get:${name}`); return {} },
      transactRoot: (name: string, fn: (root: never) => void) => {
        calls.push(`tx:${name}`)
        fn({} as never)
      },
      transactRootDurable: async (name: string, fn: (root: never) => void) => {
        calls.push(`durable:${name}`)
        fn({} as never)
      },
    }) as SpaceHandle<unknown> & NamedRootsCapable

    // Ein interface OHNE Index-Signatur …
    const entry: ProfileEntry = handle.getRoot<ProfileEntry>('profiles')
    expect(entry).toEqual({})
    handle.transactRoot<ProfileEntry>('profiles', (root) => { root.name = 'x' })
    // … und eines MIT gemusterter Index-Signatur.
    const all: ProfilesRoot = handle.getRoot<ProfilesRoot>('profiles')
    expect(all).toEqual({})
    handle.transactRoot<ProfilesRoot>('profiles', (root) => {
      root['did:key:zAlice'] = { name: 'Alice', tags: [] }
    })
    expect(calls).toEqual(['get:profiles', 'tx:profiles', 'get:profiles', 'tx:profiles'])
  })

  it('akzeptiert weiterhin Record und nutzt es als Default', async () => {
    const handle = stubHandle({
      getRoot: () => ({ a: 1 }),
      transactRoot: (_name: string, fn: (root: never) => void) => fn({} as never),
      transactRootDurable: async (_name: string, fn: (root: never) => void) => fn({} as never),
    }) as SpaceHandle<unknown> & NamedRootsCapable
    const bare: Record<string, unknown> = handle.getRoot('profiles')
    expect(bare).toEqual({ a: 1 })
    await handle.transactRootDurable<ProfileEntry>('profiles', (root) => { root.name = 'y' })
  })
})

describe('toJsonValue — Wertvertrag benannter Wurzeln', () => {
  it('kopiert JSON-Werte tief', () => {
    const source = { a: [1, 'x', true, null], b: { c: { d: 2 } } }
    const clone = toJsonValue(source, 'root') as typeof source
    expect(clone).toEqual(source)
    expect(clone.b.c).not.toBe(source.b.c)
    expect(clone.a).not.toBe(source.a)
  })

  it('wirft auf JEDER Ebene bei Nicht-JSON — nicht nur oben', () => {
    expect(() => toJsonValue({ bad: () => {} }, 'root')).toThrow(/root\.bad/)
    expect(() => toJsonValue({ deep: { num: Infinity } }, 'root')).toThrow(/root\.deep\.num/)
    expect(() => toJsonValue({ deep: [1, Symbol('s')] }, 'root')).toThrow(/root\.deep\[1\]/)
    expect(() => toJsonValue({ big: 1n }, 'root')).toThrow(/root\.big/)
    expect(() => toJsonValue({ m: new Map() }, 'root')).toThrow(/root\.m/)
    expect(() => toJsonValue({ s: new Set() }, 'root')).toThrow(/root\.s/)
    expect(() => toJsonValue([undefined], 'root')).toThrow(/root\[0\]/)
  })

  it('wirft bei Zyklen statt in eine Endlosschleife zu laufen', () => {
    const cyclic: Record<string, unknown> = { a: 1 }
    cyclic.self = cyclic
    expect(() => toJsonValue(cyclic, 'root')).toThrow(/circular/)
  })

  it('folgt JSON-Semantik bei undefined-Properties und toJSON', () => {
    expect(toJsonValue({ a: 1, b: undefined }, 'root')).toEqual({ a: 1 })
    expect(toJsonValue({ at: new Date('2026-09-13T00:00:00.000Z') }, 'root'))
      .toEqual({ at: '2026-09-13T00:00:00.000Z' })
  })

  it('meldet fremde (CRDT-)Typen ueber isForeign', () => {
    class Foreign { constructor(readonly x = 1) {} }
    const foreign = new Foreign()
    expect(() => toJsonValue({ y: foreign }, 'root', (c) => c instanceof Foreign)).toThrow(/CRDT/)
  })

  it('lehnt prototyp-vergiftende Schluessel auf jeder Ebene ab', () => {
    // Weder Yjs noch Automerge tragen eine eigene __proto__-Property durch
    // ihren Binaer-Codec — also laut ablehnen statt still verlieren.
    expect(() => toJsonValue({ a: JSON.parse('{"__proto__":{"hidden":7}}') }, 'root')).toThrow(/__proto__/)
    expect(() => toJsonValue(JSON.parse('{"constructor":1}'), 'root')).toThrow(/constructor/)
    expect(() => toJsonValue({ deep: { list: [JSON.parse('{"prototype":1}')] } }, 'root')).toThrow(/prototype/)
  })

  it('defineRootKey schuetzt die Projektion, falls ein fremdes Geraet so einen Schluessel schreibt', () => {
    const projection: Record<string, unknown> = {}
    defineRootKey(projection, '__proto__', { hidden: 7 })
    expect(Object.keys(projection)).toEqual(['__proto__'])
    expect((projection as { hidden?: unknown }).hidden).toBeUndefined()
    expect(({} as { hidden?: unknown }).hidden).toBeUndefined()
  })

  it('lehnt Loecher in sparse Arrays ab', () => {
    expect(() => toJsonValue({ a: Array(1) }, 'root')).toThrow(/root\.a\[0\]/)
    const holed = [1, 2, 3]
    delete holed[1]
    expect(() => toJsonValue({ a: holed }, 'root')).toThrow(/root\.a\[1\]/)
  })

  it('freezeDeep macht einen Klon auf allen Ebenen unveraenderlich', () => {
    const frozen = freezeDeep(toJsonValue({ a: { b: [1, { c: 2 }] } }, 'root')) as Record<string, never>
    expect(() => { (frozen as Record<string, unknown>).x = 1 }).toThrow()
    expect(Object.isFrozen(frozen.a)).toBe(true)
    expect(Object.isFrozen((frozen.a as Record<string, unknown>).b)).toBe(true)
  })
})
