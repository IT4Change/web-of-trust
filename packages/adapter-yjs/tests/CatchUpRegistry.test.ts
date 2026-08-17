import { describe, it, expect, vi } from 'vitest'

import { CatchUpRegistry } from '../src/CatchUpRegistry'

describe('CatchUpRegistry', () => {
  it('führt offene Dokumente zusammen und meldet Sammelzustand', () => {
    const registry = new CatchUpRegistry()
    const seen: boolean[] = []
    registry.subscribe((snapshot) => seen.push(snapshot.syncing))

    registry.update({ docId: 'personal', inFlight: true, outstanding: true, reason: 'in-flight' })
    registry.update({ docId: 'space-a', inFlight: true, outstanding: true, reason: 'in-flight' })
    expect(registry.getOverview().outstanding.map((s) => s.docId)).toEqual(['personal', 'space-a'])

    registry.update({ docId: 'personal', inFlight: false, outstanding: false })
    expect(registry.getOverview().outstanding.map((s) => s.docId)).toEqual(['space-a'])
    expect(registry.getOverview().syncing).toBe(true)

    registry.update({ docId: 'space-a', inFlight: false, outstanding: false })
    expect(registry.getOverview().syncing).toBe(false)
    expect(seen).toEqual([true, true, true, false])
  })

  it('behält ein Dokument, dessen Lauf endete, aber eine Lücke hinterliess', () => {
    const registry = new CatchUpRegistry()
    registry.update({ docId: 'space-a', inFlight: false, outstanding: true, reason: 'gap-pending' })

    expect(registry.getOverview().syncing).toBe(true)
    expect(registry.getOverview().outstanding[0]).toMatchObject({ inFlight: false, reason: 'gap-pending' })
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

    expect(() => registry.update({ docId: 'a', inFlight: true, outstanding: true, reason: 'in-flight' })).not.toThrow()
    expect(healthy).toHaveBeenCalled()
  })

  it('vergisst Dokumente einzeln und die Sitzung ganz', () => {
    const registry = new CatchUpRegistry()
    registry.update({ docId: 'a', inFlight: true, outstanding: true, reason: 'in-flight' })
    registry.update({ docId: 'b', inFlight: true, outstanding: true, reason: 'in-flight' })

    registry.forget('a')
    expect(registry.getOverview().outstanding.map((s) => s.docId)).toEqual(['b'])

    registry.clear()
    expect(registry.getOverview().syncing).toBe(false)
  })

  it('eine freigegebene Quelle meldet nichts mehr und räumt ihren Eintrag ab', () => {
    const registry = new CatchUpRegistry()
    const source = registry.source('personal')
    source.update({ docId: 'personal', inFlight: true, outstanding: true, reason: 'in-flight' })
    expect(registry.getOverview().syncing).toBe(true)

    source.release()
    expect(registry.getOverview().syncing).toBe(false)

    // Der hängende alte Flight kehrt zurück — und bleibt wirkungslos.
    source.update({ docId: 'personal', inFlight: false, outstanding: true, reason: 'gap-pending' })
    expect(registry.getOverview().syncing).toBe(false)
  })

  it('eine neue Quelle entwertet die alte für dieselbe docId (Re-Login)', () => {
    const registry = new CatchUpRegistry()
    const alt = registry.source('personal')
    const neu = registry.source('personal')

    neu.update({ docId: 'personal', inFlight: true, outstanding: true, reason: 'in-flight' })
    // Der alte Lebenszyklus meldet „fertig" — das gilt der neuen Sitzung nicht.
    alt.update({ docId: 'personal', inFlight: false, outstanding: false })
    expect(registry.getOverview().syncing).toBe(true)

    // Und er darf auch den Eintrag der neuen Quelle nicht abräumen.
    alt.release()
    expect(registry.getOverview().syncing).toBe(true)
  })

  it('clear() nimmt auch den Besitz weg — nichts lässt sich wiederbeleben', () => {
    const registry = new CatchUpRegistry()
    const source = registry.source('a')
    source.update({ docId: 'a', inFlight: true, outstanding: true, reason: 'in-flight' })

    registry.clear()
    source.update({ docId: 'a', inFlight: true, outstanding: true, reason: 'in-flight' })
    expect(registry.getOverview().syncing).toBe(false)
  })
})
