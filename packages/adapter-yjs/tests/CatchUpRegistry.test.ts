import { describe, it, expect, vi } from 'vitest'

import { CatchUpRegistry } from '../src/CatchUpRegistry'

describe('CatchUpRegistry', () => {
  it('führt offene Dokumente zusammen und meldet Sammelzustand', () => {
    const registry = new CatchUpRegistry()
    const seen: boolean[] = []
    registry.subscribe((snapshot) => seen.push(snapshot.syncing))

    registry.update({ docId: 'personal', inFlight: true, outstanding: true, reason: 'in-flight' })
    registry.update({ docId: 'space-a', inFlight: true, outstanding: true, reason: 'in-flight' })
    expect(registry.getSnapshot().outstanding.map((s) => s.docId)).toEqual(['personal', 'space-a'])

    registry.update({ docId: 'personal', inFlight: false, outstanding: false })
    expect(registry.getSnapshot().outstanding.map((s) => s.docId)).toEqual(['space-a'])
    expect(registry.getSnapshot().syncing).toBe(true)

    registry.update({ docId: 'space-a', inFlight: false, outstanding: false })
    expect(registry.getSnapshot().syncing).toBe(false)
    expect(seen).toEqual([true, true, true, false])
  })

  it('behält ein Dokument, dessen Lauf endete, aber eine Lücke hinterliess', () => {
    const registry = new CatchUpRegistry()
    registry.update({ docId: 'space-a', inFlight: false, outstanding: true, reason: 'gap-pending' })

    expect(registry.getSnapshot().syncing).toBe(true)
    expect(registry.getSnapshot().outstanding[0]).toMatchObject({ inFlight: false, reason: 'gap-pending' })
  })

  it('meldet nur echte Wechsel', () => {
    const registry = new CatchUpRegistry()
    const listener = vi.fn()
    registry.subscribe(listener)

    registry.update({ docId: 'a', inFlight: true, outstanding: true, reason: 'in-flight' })
    registry.update({ docId: 'a', inFlight: true, outstanding: true, reason: 'in-flight' })
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('lässt einen fehlerhaften Abnehmer den Sync nicht stören', () => {
    const registry = new CatchUpRegistry()
    registry.subscribe(() => { throw new Error('kaputt') })
    const healthy = vi.fn()
    registry.subscribe(healthy)

    expect(() => registry.update({ docId: 'a', inFlight: true, outstanding: true })).not.toThrow()
    expect(healthy).toHaveBeenCalled()
  })

  it('vergisst Dokumente einzeln und die Sitzung ganz', () => {
    const registry = new CatchUpRegistry()
    registry.update({ docId: 'a', inFlight: true, outstanding: true })
    registry.update({ docId: 'b', inFlight: true, outstanding: true })

    registry.forget('a')
    expect(registry.getSnapshot().outstanding.map((s) => s.docId)).toEqual(['b'])

    registry.clear()
    expect(registry.getSnapshot().syncing).toBe(false)
  })
})
