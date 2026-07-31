import { describe, it, expect, afterEach } from 'vitest'
import type { PublicIdentitySession } from '../../wot-core/src/application/identity'
import { createTestIdentity, recoverTestIdentity } from '../../wot-core/tests/helpers/identity-session'
import {
  InMemoryMessagingAdapter,
  InProcessLogBroker,
  InMemorySpaceMetadataStorage,
  InMemoryKeyManagementAdapter,
  InMemoryDocLogStore,
} from '@web_of_trust/core/adapters'
import { derivePrivateSpaceGenesis, SPACE_REGISTER_MESSAGE_TYPE } from '@web_of_trust/core/protocol'
import { AutomergeReplicationAdapter } from '../src/AutomergeReplicationAdapter'
import { InMemoryRepoStorageAdapter } from '../src/InMemoryRepoStorageAdapter'

const BROKER_URLS = ['wss://broker.example.com']
const PRIVATE_META = { name: 'Privat', appTag: 'rls-private', modules: ['feed'] }

/** The durable stores that survive a process restart (same device, same disk). */
interface DurableStores {
  metadataStorage: InMemorySpaceMetadataStorage
  keyManagement: InMemoryKeyManagementAdapter
  repoStorage: InMemoryRepoStorageAdapter
  docLogStore: InMemoryDocLogStore
}

async function makeStores(deviceId: string, metadataStorage?: InMemorySpaceMetadataStorage): Promise<DurableStores> {
  const docLogStore = new InMemoryDocLogStore()
  await docLogStore.init()
  await docLogStore.setDeviceId(deviceId)
  return {
    metadataStorage: metadataStorage ?? new InMemorySpaceMetadataStorage(),
    keyManagement: new InMemoryKeyManagementAdapter(),
    repoStorage: new InMemoryRepoStorageAdapter(),
    docLogStore,
  }
}

async function makeAdapter(identity: PublicIdentitySession, broker: InProcessLogBroker, socketId: string, deviceId: string, stores?: DurableStores): Promise<{ adapter: AutomergeReplicationAdapter; messaging: InMemoryMessagingAdapter }> {
  const messaging = new InMemoryMessagingAdapter({ broker, socketId })
  await messaging.connect(identity.getDid())
  const durable = stores ?? await makeStores(deviceId)
  const adapter = new AutomergeReplicationAdapter({
    identity, messaging, brokerUrls: BROKER_URLS,
    keyManagement: durable.keyManagement,
    metadataStorage: durable.metadataStorage,
    repoStorage: durable.repoStorage,
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

/** Fault injection at a durability boundary: the first saveSpaceMetadata throws. */
function metadataFailingOnce(): { storage: InMemorySpaceMetadataStorage; saveCalls: () => number } {
  const storage = new InMemorySpaceMetadataStorage()
  const realSave = storage.saveSpaceMetadata.bind(storage)
  let calls = 0
  storage.saveSpaceMetadata = async (meta) => {
    calls += 1
    if (calls === 1) throw new Error('injected durability failure: saveSpaceMetadata')
    return realSave(meta)
  }
  return { storage, saveCalls: () => calls }
}

// Parity with adapter-yjs/tests/DeterministicPrivateSpace.test.ts — the same
// deterministic-genesis contract must hold identically for the Automerge engine.
describe('Deterministic private space (Sync 001) — Automerge adapter contract', () => {
  const cleanup: Array<() => Promise<void>> = []
  afterEach(async () => {
    while (cleanup.length) await cleanup.pop()!().catch(() => {})
    InMemoryMessagingAdapter.resetAll()
  })

  it('openOrCreate returns the derived genesis id and is idempotent on the same device', async () => {
    const broker = new InProcessLogBroker()
    const { identity } = await createTestIdentity('detps-am-single')
    cleanup.push(async () => { await identity.deleteStoredIdentity() })
    const { adapter } = await makeAdapter(identity, broker, 'detps-am-single', 'd1111111-1111-4111-8111-111111111111')
    await adapter.start()
    cleanup.push(async () => { await adapter.stop() })

    const genesis = await derivePrivateSpaceGenesis((info, length) => identity.deriveFrameworkKey(info, length))

    const first = await adapter.openOrCreateDeterministicPrivateSpace({ items: {} }, PRIVATE_META)
    expect(first.id).toBe(genesis.spaceId)
    expect(first.appTag).toBe('rls-private')

    const second = await adapter.openOrCreateDeterministicPrivateSpace({ items: {} }, PRIVATE_META)
    expect(second.id).toBe(genesis.spaceId)
    expect((await adapter.getSpaces()).filter((s) => s.appTag === 'rls-private')).toHaveLength(1)
  })

  it('resumes the missing phases after a failed create instead of reporting success', async () => {
    const broker = new InProcessLogBroker()
    const { identity } = await createTestIdentity('detps-am-fault')
    cleanup.push(async () => { await identity.deleteStoredIdentity() })
    const { storage, saveCalls } = metadataFailingOnce()
    const { adapter } = await makeAdapter(identity, broker, 'detps-am-fault', 'f1111111-1111-4111-8111-111111111111', await makeStores('f1111111-1111-4111-8111-111111111111', storage))
    await adapter.start()
    cleanup.push(async () => { await adapter.stop() })

    const genesis = await derivePrivateSpaceGenesis((info, length) => identity.deriveFrameworkKey(info, length))

    await expect(adapter.openOrCreateDeterministicPrivateSpace({ items: {} }, PRIVATE_META)).rejects.toThrow(/injected durability failure/)
    expect(await storage.loadSpaceMetadata(genesis.spaceId)).toBeNull()

    const space = await adapter.openOrCreateDeterministicPrivateSpace({ items: {} }, PRIVATE_META)
    expect(space.id).toBe(genesis.spaceId)
    expect(saveCalls()).toBeGreaterThan(1)
    expect(await storage.loadSpaceMetadata(genesis.spaceId)).not.toBeNull()
    expect((await adapter.getSpaces()).filter((s) => s.appTag === 'rls-private')).toHaveLength(1)
  })

  it('publishes on a fresh instance when a previous process died before space-register', async () => {
    // Restart contract (parity with Yjs): completion must NOT be a RAM claim.
    const broker = new InProcessLogBroker()
    const { identity } = await createTestIdentity('detps-am-restart')
    cleanup.push(async () => { await identity.deleteStoredIdentity() })
    const DEVICE = 'e1111111-1111-4111-8111-111111111111'
    const stores = await makeStores(DEVICE)

    const { adapter: adapterA, messaging: messagingA } = await makeAdapter(identity, broker, 'detps-am-restart-a', DEVICE, stores)
    ;(messagingA as unknown as { sendControlFrame: () => Promise<never> }).sendControlFrame = async () => {
      throw new Error('injected: control frame never reached the broker')
    }
    await adapterA.start()
    await adapterA.openOrCreateDeterministicPrivateSpace({ items: {} }, PRIVATE_META).catch(() => {})
    const genesis = await derivePrivateSpaceGenesis((info, length) => identity.deriveFrameworkKey(info, length))
    expect(await stores.metadataStorage.loadSpaceMetadata(genesis.spaceId)).not.toBeNull()
    await adapterA.stop()

    // ── restart ──
    const { adapter: adapterB, messaging: messagingB } = await makeAdapter(identity, broker, 'detps-am-restart-b', DEVICE, stores)
    const registersB = countSpaceRegisters(messagingB)
    await adapterB.start()
    cleanup.push(async () => { await adapterB.stop() })
    await adapterB.restoreSpacesFromMetadata()

    const space = await adapterB.openOrCreateDeterministicPrivateSpace({ items: {} }, PRIVATE_META)
    expect(space.id).toBe(genesis.spaceId)
    expect(registersB()).toBeGreaterThan(0)
  })

  it('concurrent open-or-create calls share one flight and yield one space', async () => {
    const broker = new InProcessLogBroker()
    const { identity } = await createTestIdentity('detps-am-concurrent')
    cleanup.push(async () => { await identity.deleteStoredIdentity() })
    const { adapter } = await makeAdapter(identity, broker, 'detps-am-concurrent', 'c1111111-1111-4111-8111-111111111111')
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
    const created = await createTestIdentity('detps-am-multi')
    const a = created.identity
    const b = await recoverTestIdentity(created.mnemonic, 'detps-am-multi')
    cleanup.push(async () => { await a.deleteStoredIdentity() })
    cleanup.push(async () => { await b.deleteStoredIdentity() })

    const genesis = await derivePrivateSpaceGenesis((info, length) => a.deriveFrameworkKey(info, length))

    const { adapter: adapterA } = await makeAdapter(a, broker, 'detps-am-a', 'a1111111-1111-4111-8111-111111111111')
    await adapterA.start(); cleanup.push(async () => { await adapterA.stop() })
    const { adapter: adapterB } = await makeAdapter(b, broker, 'detps-am-b', 'b2222222-2222-4222-8222-222222222222')
    await adapterB.start(); cleanup.push(async () => { await adapterB.stop() })

    const sa = await adapterA.openOrCreateDeterministicPrivateSpace({ items: {} }, PRIVATE_META)
    const sb = await adapterB.openOrCreateDeterministicPrivateSpace({ items: {} }, PRIVATE_META)

    expect(sa.id).toBe(genesis.spaceId)
    expect(sb.id).toBe(genesis.spaceId)
    expect((await adapterA.getSpace(genesis.spaceId))?.id).toBe(genesis.spaceId)
    expect((await adapterB.getSpace(genesis.spaceId))?.id).toBe(genesis.spaceId)
  })
})
