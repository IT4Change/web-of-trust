import { describe, it, expect } from 'vitest'

import { CatchUpRegistry } from '../src/CatchUpRegistry'
import { YjsReplicationAdapter } from '../src/YjsReplicationAdapter'

/**
 * Lebenszyklus-Grenze des Space-Coordinators (#343, Loop-Review Blocker 2).
 *
 * `getOrCreateCoordinator()` wartet auf LogStore und Device-ID. Fällt ein
 * Cleanup oder ein `stop()` in eines dieser Awaits, darf die überholte
 * Fortsetzung danach WEDER eine Meldequelle beanspruchen NOCH einen Coordinator
 * über dem entfernten Space installieren. Nicht jeder produktive Aufrufer
 * übergibt eine Lease — die Prüfung muss also in der Methode selbst sitzen.
 *
 * Geprüft wird die echte Methode an einem schmalen Fake: das gegatete Await
 * ist der Punkt, an dem der Wettlauf entsteht.
 */

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => { resolve = r })
  return { promise, resolve }
}

function makeAdapterFake(registry: CatchUpRegistry, state: unknown, gate: Promise<unknown>) {
  const fake: Record<string, unknown> = {
    logSyncEnabled: true,
    lifecycleEpoch: 1,
    coordinators: new Map<string, unknown>(),
    spaces: new Map<string, unknown>([['space-1', state]]),
    catchUpRegistry: registry,
    catchUpSources: new Map<string, unknown>(),
    // Das gegatete Await: hier landet der Cleanup dazwischen.
    ensureDocLogStore: async () => { await gate; return { init: async () => {} } },
    ensureDeviceId: async () => 'device-1',
  }
  Object.setPrototypeOf(fake, YjsReplicationAdapter.prototype)
  return fake
}

describe('getOrCreateCoordinator — Cleanup während des Aufbaus', () => {
  it('claimt keine Quelle und installiert keinen Coordinator für einen entfernten Space', async () => {
    const registry = new CatchUpRegistry()
    const gate = deferred<void>()
    const state = { info: { id: 'space-1', members: [] } }
    const fake = makeAdapterFake(registry, state, gate.promise)

    const building = (YjsReplicationAdapter.prototype as unknown as {
      getOrCreateCoordinator: (state: unknown) => Promise<unknown>
    }).getOrCreateCoordinator.call(fake, state)

    // Cleanup fällt mitten in das Await: der Space ist weg.
    ;(fake.spaces as Map<string, unknown>).delete('space-1')

    gate.resolve()
    const coordinator = await building

    expect(coordinator).toBeNull()
    expect((fake.coordinators as Map<string, unknown>).size).toBe(0)
    expect(registry.getSnapshot().syncing).toBe(false)
    expect(registry.getSnapshot().outstanding).toEqual([])
  })

  it('bricht ebenso ab, wenn die Sitzung selbst gewechselt hat (stop)', async () => {
    const registry = new CatchUpRegistry()
    const gate = deferred<void>()
    const state = { info: { id: 'space-1', members: [] } }
    const fake = makeAdapterFake(registry, state, gate.promise)

    const building = (YjsReplicationAdapter.prototype as unknown as {
      getOrCreateCoordinator: (state: unknown) => Promise<unknown>
    }).getOrCreateCoordinator.call(fake, state)

    // stop() erhöht die Lebenszyklus-Epoche; der Space bleibt formal bestehen.
    fake.lifecycleEpoch = 2

    gate.resolve()
    expect(await building).toBeNull()
    expect((fake.coordinators as Map<string, unknown>).size).toBe(0)
    expect(registry.getSnapshot().syncing).toBe(false)
  })
})
