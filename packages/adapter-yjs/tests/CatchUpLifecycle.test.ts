import { describe, it, expect, vi } from 'vitest'

import { CatchUpRegistry } from '../src/CatchUpRegistry'
import { YjsReplicationAdapter } from '../src/YjsReplicationAdapter'

/**
 * Lebenszyklus-Matrix des Space-Coordinators (#343).
 *
 * Der Coordinator soll GENAU EINE stabile Instanz je docId sein, und seine
 * Beobachtbarkeit gehört dem jeweils aktuellen Adapter-Lebenszyklus. Beides
 * bricht nur unter Überlappung — nebenläufiger Aufbau, Cleanup oder
 * Sitzungswechsel mitten im Await. Genau die stehen hier.
 *
 * Geprüft wird die echte Methode an einem schmalen Fake: das gegatete Await ist
 * der Punkt, an dem der Wettlauf entsteht.
 */

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (err: unknown) => void
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

interface AdapterFake extends Record<string, unknown> {
  coordinators: Map<string, unknown>
  catchUpSources: Map<string, unknown>
  catchUpUnsubs: Map<string, () => void>
  coordinatorFlights: Map<string, unknown>
  spaces: Map<string, unknown>
  lifecycleEpoch: number
}

function makeAdapterFake(registry: CatchUpRegistry, state: unknown, gate: Promise<unknown>): AdapterFake {
  const fake = {
    logSyncEnabled: true,
    lifecycleEpoch: 1,
    coordinators: new Map<string, unknown>(),
    catchUpSources: new Map<string, unknown>(),
    catchUpUnsubs: new Map<string, () => void>(),
    coordinatorFlights: new Map<string, unknown>(),
    spaces: new Map<string, unknown>([['space-1', state]]),
    catchUpRegistry: registry,
    // Das gegatete Await: hier landet Cleanup oder Stop dazwischen.
    ensureDocLogStore: async () => { await gate; return { init: async () => {} } },
    ensureDeviceId: async () => 'device-1',
    // Nur so viel Umgebung, wie der Coordinator-Konstruktor anfasst — er
    // speichert seine Konfiguration, ohne sie zu benutzen.
    messaging: { sendControlFrame: async () => ({}), send: async () => ({}) },
    identity: { getDid: () => 'did:key:test', signEd25519: async () => new Uint8Array() },
    crypto: {},
    keyManagement: {
      getCurrentGeneration: async () => 0,
      getKeyByGeneration: async () => null,
      getAvailableGenerations: async () => [0],
    },
    authorKid: () => 'did:key:test#sig-0',
    spaceCapabilitySource: () => ({ getCapabilityJws: async () => null }),
    yjsEngineHooks: () => ({}),
    makeWriteRejectHandler: () => undefined,
    writeFullStateViaLog: async () => {},
    onSecurityError: undefined,
  } as unknown as AdapterFake
  Object.setPrototypeOf(fake, YjsReplicationAdapter.prototype)
  return fake
}

const build = (fake: AdapterFake, state: unknown) =>
  (YjsReplicationAdapter.prototype as unknown as {
    getOrCreateCoordinator: (state: unknown) => Promise<unknown>
  }).getOrCreateCoordinator.call(fake, state)

/** Nichts installiert, nichts beansprucht, nichts in der Registry. */
function expectNothingInstalled(fake: AdapterFake, registry: CatchUpRegistry) {
  expect(fake.coordinators.size).toBe(0)
  expect(fake.catchUpSources.size).toBe(0)
  expect(fake.catchUpUnsubs.size).toBe(0)
  expect(fake.coordinatorFlights.size).toBe(0)
  expect(registry.getSnapshot().syncing).toBe(false)
  expect(registry.getSnapshot().outstanding).toEqual([])
}

describe('Space-Coordinator — Lebenszyklus unter Überlappung', () => {
  it('nebenläufiger Aufbau ergibt EINEN Coordinator und EINE Meldequelle', async () => {
    const registry = new CatchUpRegistry()
    const gate = deferred<void>()
    const state = { info: { id: 'space-1', members: [] } }
    const fake = makeAdapterFake(registry, state, gate.promise)

    const [a, b] = [build(fake, state), build(fake, state)]
    gate.resolve()
    const [first, second] = await Promise.all([a, b])

    // Der zweite Aufrufer darf den Eintrag des ersten NICHT überschreiben —
    // an ihm hängen Listener und Meldequelle.
    expect(first).toBe(second)
    expect(fake.coordinators.size).toBe(1)
    expect(fake.catchUpSources.size).toBe(1)
    expect(fake.coordinatorFlights.size).toBe(0)
  })

  it('Cleanup während des Aufbaus installiert nichts', async () => {
    const registry = new CatchUpRegistry()
    const gate = deferred<void>()
    const state = { info: { id: 'space-1', members: [] } }
    const fake = makeAdapterFake(registry, state, gate.promise)

    const building = build(fake, state)
    fake.spaces.delete('space-1') // cleanupSpaceLocally fällt ins Await

    gate.resolve()
    expect(await building).toBeNull()
    expectNothingInstalled(fake, registry)
  })

  it('Sitzungswechsel während des Aufbaus installiert nichts', async () => {
    const registry = new CatchUpRegistry()
    const gate = deferred<void>()
    const state = { info: { id: 'space-1', members: [] } }
    const fake = makeAdapterFake(registry, state, gate.promise)

    const building = build(fake, state)
    fake.lifecycleEpoch = 2 // stop() fällt ins Await

    gate.resolve()
    expect(await building).toBeNull()
    expectNothingInstalled(fake, registry)
  })

  it('ein gescheiterter Aufbau blockiert den nächsten Versuch nicht', async () => {
    const registry = new CatchUpRegistry()
    const gate = deferred<void>()
    const state = { info: { id: 'space-1', members: [] } }
    const fake = makeAdapterFake(registry, state, gate.promise)

    const failing = build(fake, state)
    gate.reject(new Error('Store kaputt'))
    await expect(failing).rejects.toThrow('Store kaputt')
    // Der Single-Flight darf nicht vergiftet zurückbleiben.
    expect(fake.coordinatorFlights.size).toBe(0)

    const secondGate = deferred<void>()
    fake.ensureDocLogStore = async () => { await secondGate.promise; return { init: async () => {} } }
    const retry = build(fake, state)
    secondGate.resolve()

    expect(await retry).not.toBeNull()
    expect(fake.coordinators.size).toBe(1)
    expect(fake.catchUpSources.size).toBe(1)
  })

  it('nach dem Freigeben meldet der Space nicht mehr in die Registry', async () => {
    const registry = new CatchUpRegistry()
    const gate = deferred<void>()
    const state = { info: { id: 'space-1', members: [] } }
    const fake = makeAdapterFake(registry, state, gate.promise)

    const building = build(fake, state)
    gate.resolve()
    const coordinator = (await building) as { subscribeCatchUpState: unknown }
    expect(coordinator).not.toBeNull()

    // Der Space verschwindet — Abmelder und Quelle gehen mit.
    ;(YjsReplicationAdapter.prototype as unknown as {
      releaseCatchUpSource: (id: string) => void
    }).releaseCatchUpSource.call(fake, 'space-1')

    expect(fake.catchUpSources.size).toBe(0)
    expect(fake.catchUpUnsubs.size).toBe(0)
    expect(registry.getSnapshot().syncing).toBe(false)
  })

  it('meldet einen laufenden Catch-up sofort beim Abonnieren', async () => {
    const registry = new CatchUpRegistry()
    const gate = deferred<void>()
    const state = { info: { id: 'space-1', members: [] } }
    const fake = makeAdapterFake(registry, state, gate.promise)
    const building = build(fake, state)
    gate.resolve()
    const coordinator = (await building) as {
      subscribeCatchUpState: (l: (s: unknown) => void) => () => void
    }

    // Der Snapshot geht beim Abonnieren mit — ein Lebenszyklus, der mitten in
    // einen laufenden Catch-up kommt, sieht ihn statt ihn zu verpassen.
    const seen = vi.fn()
    coordinator.subscribeCatchUpState(seen)
    expect(seen).toHaveBeenCalledWith(expect.objectContaining({ docId: 'space-1' }))
  })
})
