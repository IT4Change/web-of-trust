import { describe, it, expect, afterEach } from 'vitest'
import * as Y from 'yjs'
import type { PublicIdentitySession } from '../../wot-core/src/application/identity'
import { createTestIdentity, recoverTestIdentity } from '../../wot-core/tests/helpers/identity-session'
import {
  InMemoryMessagingAdapter,
  InMemoryCompactStore,
  InMemoryDocLogStore,
  InMemoryKeyManagementAdapter,
  InProcessLogBroker,
  PersonalDocSpaceMetadataStorage,
} from '@web_of_trust/core/adapters'
import { derivePrivateSpaceGenesis, SPACE_REGISTER_MESSAGE_TYPE } from '@web_of_trust/core/protocol'
import { YjsReplicationAdapter } from '../src/YjsReplicationAdapter'

const BROKER_URLS = ['wss://broker.example.com']

/** Deterministic wait — no fixed sleeps (CI runners are far slower than dev boxes). */
async function waitUntil(cond: () => boolean, what: string, timeoutMs = 15_000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (cond()) return
    await new Promise((r) => setTimeout(r, 10))
  }
  throw new Error(`Timed out waiting for ${what}`)
}
const PRIVATE_META = { name: 'Privat', appTag: 'rls-private', modules: ['feed'] }

function metadataInPersonalDoc(doc: Y.Doc): PersonalDocSpaceMetadataStorage {
  const roots = ['spaces', 'groupKeys', 'capabilitySigningSeeds']
  const read = () => Object.fromEntries(roots.map((root) => [root, doc.getMap(root).toJSON()]))
  const write = (state: Record<string, Record<string, unknown>>) => {
    doc.transact(() => {
      for (const root of roots) {
        const map = doc.getMap(root)
        map.clear()
        for (const [key, value] of Object.entries(state[root] ?? {})) map.set(key, value)
      }
    }, 'local')
  }
  return new PersonalDocSpaceMetadataStorage({
    getPersonalDoc: read,
    changePersonalDoc: (change) => { const s = read(); change(s); write(s) },
  })
}

async function makeDocLogStore(deviceId: string): Promise<InMemoryDocLogStore> {
  const store = new InMemoryDocLogStore()
  await store.init()
  await store.setDeviceId(deviceId)
  return store
}

/** The durable stores that survive a process restart (same device, same disk). */
interface DurableStores {
  metadataStorage: PersonalDocSpaceMetadataStorage
  keyManagement: InMemoryKeyManagementAdapter
  compactStore: InMemoryCompactStore
  docLogStore: InMemoryDocLogStore
}

async function makeStores(deviceId: string, metadataStorage?: PersonalDocSpaceMetadataStorage): Promise<DurableStores> {
  return {
    metadataStorage: metadataStorage ?? metadataInPersonalDoc(new Y.Doc()),
    keyManagement: new InMemoryKeyManagementAdapter(),
    compactStore: new InMemoryCompactStore(),
    docLogStore: await makeDocLogStore(deviceId),
  }
}

async function makeAdapter(identity: PublicIdentitySession, broker: InProcessLogBroker, socketId: string, deviceId: string, stores?: DurableStores): Promise<{ adapter: YjsReplicationAdapter; messaging: InMemoryMessagingAdapter }> {
  const messaging = new InMemoryMessagingAdapter({ broker, socketId })
  await messaging.connect(identity.getDid())
  const durable = stores ?? await makeStores(deviceId)
  const adapter = new YjsReplicationAdapter({
    identity, messaging, brokerUrls: BROKER_URLS,
    metadataStorage: durable.metadataStorage,
    keyManagement: durable.keyManagement,
    compactStore: durable.compactStore,
    docLogStore: durable.docLogStore, enableLogSync: true, deviceId,
  })
  return { adapter, messaging }
}

/** Counts space-register control frames a given messaging adapter sends. */
function countSpaceRegisters(messaging: InMemoryMessagingAdapter): () => number {
  let count = 0
  const base = messaging.sendControlFrame!.bind(messaging)
  ;(messaging as unknown as { sendControlFrame: typeof messaging.sendControlFrame }).sendControlFrame = async (frame) => {
    if ((frame as { type?: string }).type === SPACE_REGISTER_MESSAGE_TYPE) count += 1
    return base(frame)
  }
  return () => count
}

/**
 * Scripted durability boundary for the lifecycle repro: call 1 blocks on a gate
 * (the flight that will outlive its session), call 2 throws (the new session's
 * flight fails), call 3+ succeeds.
 */
function metadataGateThenFail(doc: Y.Doc): { storage: PersonalDocSpaceMetadataStorage; saveCalls: () => number; release: () => void } {
  const storage = metadataInPersonalDoc(doc)
  const realSave = storage.saveSpaceMetadata.bind(storage)
  let calls = 0
  let release: () => void = () => {}
  const gate = new Promise<void>((r) => { release = r })
  storage.saveSpaceMetadata = async (meta) => {
    calls += 1
    if (calls === 1) { await gate; return realSave(meta) }
    if (calls === 2) throw new Error('injected durability failure: second flight')
    return realSave(meta)
  }
  return { storage, saveCalls: () => calls, release: () => release() }
}

/** Fault injection at a durability boundary: the first saveSpaceMetadata throws. */
function metadataFailingOnce(doc: Y.Doc): { storage: PersonalDocSpaceMetadataStorage; saveCalls: () => number } {
  const storage = metadataInPersonalDoc(doc)
  const realSave = storage.saveSpaceMetadata.bind(storage)
  let calls = 0
  storage.saveSpaceMetadata = async (meta) => {
    calls += 1
    if (calls === 1) throw new Error('injected durability failure: saveSpaceMetadata')
    return realSave(meta)
  }
  return { storage, saveCalls: () => calls }
}

describe('Deterministic private space (Sync 001) — Yjs adapter contract', () => {
  const cleanup: Array<() => Promise<void>> = []
  afterEach(async () => {
    while (cleanup.length) await cleanup.pop()!().catch(() => {})
    InMemoryMessagingAdapter.resetAll()
  })

  it('openOrCreate returns the derived genesis id and is idempotent on the same device', async () => {
    const broker = new InProcessLogBroker()
    const { identity } = await createTestIdentity('detps-single')
    cleanup.push(async () => { await identity.deleteStoredIdentity() })
    const { adapter } = await makeAdapter(identity, broker, 'detps-single', 'd1111111-1111-4111-8111-111111111111')
    await adapter.start()
    cleanup.push(async () => { await adapter.stop() })

    const genesis = await derivePrivateSpaceGenesis((info, length) => identity.deriveFrameworkKey(info, length))

    const first = await adapter.openOrCreateDeterministicPrivateSpace({ items: {} }, PRIVATE_META)
    expect(first.id).toBe(genesis.spaceId)
    expect(first.appTag).toBe('rls-private')

    const second = await adapter.openOrCreateDeterministicPrivateSpace({ items: {} }, PRIVATE_META)
    expect(second.id).toBe(genesis.spaceId) // idempotent: same space, no duplicate
    expect((await adapter.getSpaces()).filter((s) => s.appTag === 'rls-private')).toHaveLength(1)
  })

  it('resumes the missing phases after a failed create instead of reporting success', async () => {
    const broker = new InProcessLogBroker()
    const { identity } = await createTestIdentity('detps-fault')
    cleanup.push(async () => { await identity.deleteStoredIdentity() })
    const { storage, saveCalls } = metadataFailingOnce(new Y.Doc())
    const { adapter } = await makeAdapter(identity, broker, 'detps-fault', 'f1111111-1111-4111-8111-111111111111', await makeStores('f1111111-1111-4111-8111-111111111111', storage))
    await adapter.start()
    cleanup.push(async () => { await adapter.stop() })

    const genesis = await derivePrivateSpaceGenesis((info, length) => identity.deriveFrameworkKey(info, length))

    // First attempt fails AT the durability boundary — after the space entered
    // this.spaces, before its metadata was persisted.
    await expect(adapter.openOrCreateDeterministicPrivateSpace({ items: {} }, PRIVATE_META)).rejects.toThrow(/injected durability failure/)
    expect(await storage.loadSpaceMetadata(genesis.spaceId)).toBeNull()

    // The retry must RESUME the missing phase, not early-return the half state.
    const space = await adapter.openOrCreateDeterministicPrivateSpace({ items: {} }, PRIVATE_META)
    expect(space.id).toBe(genesis.spaceId)
    expect(saveCalls()).toBeGreaterThan(1)
    expect(await storage.loadSpaceMetadata(genesis.spaceId)).not.toBeNull()
    expect((await adapter.getSpaces()).filter((s) => s.appTag === 'rls-private')).toHaveLength(1)
  })

  it('publishes on a fresh instance when a previous process died before space-register', async () => {
    // Restart contract: completion must NOT be a RAM claim. Instance A persists
    // metadata but its publication never reaches the broker; the process dies.
    // Instance B (same durable stores, fresh RAM) restores the space and MUST
    // still register it instead of reporting a complete private space.
    const broker = new InProcessLogBroker()
    const { identity } = await createTestIdentity('detps-restart')
    cleanup.push(async () => { await identity.deleteStoredIdentity() })
    const DEVICE = 'e1111111-1111-4111-8111-111111111111'
    const stores = await makeStores(DEVICE)

    const { adapter: adapterA, messaging: messagingA } = await makeAdapter(identity, broker, 'detps-restart-a', DEVICE, stores)
    // Publication of instance A fails (broker unreachable for control frames).
    ;(messagingA as unknown as { sendControlFrame: () => Promise<never> }).sendControlFrame = async () => {
      throw new Error('injected: control frame never reached the broker')
    }
    await adapterA.start()
    await adapterA.openOrCreateDeterministicPrivateSpace({ items: {} }, PRIVATE_META).catch(() => {})
    const genesis = await derivePrivateSpaceGenesis((info, length) => identity.deriveFrameworkKey(info, length))
    // Metadata IS durable, so the restart sees the space — but it was never registered.
    expect(await stores.metadataStorage.loadSpaceMetadata(genesis.spaceId)).not.toBeNull()
    await adapterA.stop()

    // ── restart ──
    const { adapter: adapterB, messaging: messagingB } = await makeAdapter(identity, broker, 'detps-restart-b', DEVICE, stores)
    const registersB = countSpaceRegisters(messagingB)
    await adapterB.start()
    cleanup.push(async () => { await adapterB.stop() })
    await adapterB.restoreSpacesFromMetadata()

    const space = await adapterB.openOrCreateDeterministicPrivateSpace({ items: {} }, PRIVATE_META)
    expect(space.id).toBe(genesis.spaceId)
    // The contract: after open-or-create returns, the space IS registered.
    expect(registersB()).toBeGreaterThan(0)
  }, 60_000)

  it('a flight that outlived stop() must not certify the new session', async () => {
    // Lifecycle contract: flight A hangs before its metadata write, the adapter is
    // stopped and started, flight B fails at the same boundary, then A runs out.
    // A must NOT mark the space provisioned — otherwise the next call early-returns
    // and B's failed state is never resumed.
    const broker = new InProcessLogBroker()
    const { identity } = await createTestIdentity('detps-lifecycle')
    cleanup.push(async () => { await identity.deleteStoredIdentity() })
    const DEVICE = 'a9999999-9999-4999-8999-999999999999'
    const { storage, saveCalls, release } = metadataGateThenFail(new Y.Doc())
    const { adapter } = await makeAdapter(identity, broker, 'detps-lifecycle', DEVICE, await makeStores(DEVICE, storage))
    await adapter.start()
    cleanup.push(async () => { await adapter.stop() })

    const flightA = adapter.openOrCreateDeterministicPrivateSpace({ items: {} }, PRIVATE_META).catch(() => null)
    await waitUntil(() => saveCalls() >= 1, 'flight A to reach the gated metadata write')

    await adapter.stop()
    await adapter.start()

    // B fails at the same durability boundary in the NEW session.
    await expect(adapter.openOrCreateDeterministicPrivateSpace({ items: {} }, PRIVATE_META)).rejects.toThrow(/second flight/)

    release()
    await flightA // the stale flight runs out; it must not certify anything

    // The next call must RESUME B's failed state (a third metadata write).
    await adapter.openOrCreateDeterministicPrivateSpace({ items: {} }, PRIVATE_META)
    expect(saveCalls()).toBeGreaterThan(2)
  }, 60_000)

  it('concurrent open-or-create calls share one flight and yield one space', async () => {
    const broker = new InProcessLogBroker()
    const { identity } = await createTestIdentity('detps-concurrent')
    cleanup.push(async () => { await identity.deleteStoredIdentity() })
    const { adapter } = await makeAdapter(identity, broker, 'detps-concurrent', 'c1111111-1111-4111-8111-111111111111')
    await adapter.start()
    cleanup.push(async () => { await adapter.stop() })

    const results = await Promise.all([
      adapter.openOrCreateDeterministicPrivateSpace({ items: {} }, PRIVATE_META),
      adapter.openOrCreateDeterministicPrivateSpace({ items: {} }, PRIVATE_META),
      adapter.openOrCreateDeterministicPrivateSpace({ items: {} }, PRIVATE_META),
    ])
    expect(new Set(results.map((r) => r.id)).size).toBe(1)
    expect((await adapter.getSpaces()).filter((s) => s.appTag === 'rls-private')).toHaveLength(1)
  })

  it('two devices of the same identity derive the same private space; register is idempotent (no conflict)', async () => {
    const broker = new InProcessLogBroker()
    const created = await createTestIdentity('detps-multi')
    const a = created.identity
    const b = await recoverTestIdentity(created.mnemonic, 'detps-multi') // same seed → same derivation
    cleanup.push(async () => { await a.deleteStoredIdentity() })
    cleanup.push(async () => { await b.deleteStoredIdentity() })

    const genesis = await derivePrivateSpaceGenesis((info, length) => a.deriveFrameworkKey(info, length))

    const { adapter: adapterA } = await makeAdapter(a, broker, 'detps-a', 'a1111111-1111-4111-8111-111111111111')
    await adapterA.start(); cleanup.push(async () => { await adapterA.stop() })
    const { adapter: adapterB } = await makeAdapter(b, broker, 'detps-b', 'b2222222-2222-4222-8222-222222222222')
    await adapterB.start(); cleanup.push(async () => { await adapterB.stop() })

    const sa = await adapterA.openOrCreateDeterministicPrivateSpace({ items: {} }, PRIVATE_META)
    // Device B derives the SAME id and registers the SAME verification key → the
    // broker's first-writer-wins space-register is idempotent, not a conflict.
    const sb = await adapterB.openOrCreateDeterministicPrivateSpace({ items: {} }, PRIVATE_META)

    expect(sa.id).toBe(genesis.spaceId)
    expect(sb.id).toBe(genesis.spaceId)
    expect((await adapterA.getSpace(genesis.spaceId))?.id).toBe(genesis.spaceId)
    expect((await adapterB.getSpace(genesis.spaceId))?.id).toBe(genesis.spaceId)
  })
})
