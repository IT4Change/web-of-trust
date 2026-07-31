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
import { derivePrivateSpaceGenesis } from '@web_of_trust/core/protocol'
import { AutomergeReplicationAdapter } from '../src/AutomergeReplicationAdapter'
import { InMemoryRepoStorageAdapter } from '../src/InMemoryRepoStorageAdapter'

const BROKER_URLS = ['wss://broker.example.com']
const PRIVATE_META = { name: 'Privat', appTag: 'rls-private', modules: ['feed'] }

async function makeAdapter(identity: PublicIdentitySession, broker: InProcessLogBroker, socketId: string, deviceId: string): Promise<AutomergeReplicationAdapter> {
  const messaging = new InMemoryMessagingAdapter({ broker, socketId })
  await messaging.connect(identity.getDid())
  const docLogStore = new InMemoryDocLogStore()
  await docLogStore.init()
  await docLogStore.setDeviceId(deviceId)
  return new AutomergeReplicationAdapter({
    identity, messaging, brokerUrls: BROKER_URLS,
    keyManagement: new InMemoryKeyManagementAdapter(),
    metadataStorage: new InMemorySpaceMetadataStorage(),
    repoStorage: new InMemoryRepoStorageAdapter(),
    docLogStore, enableLogSync: true, deviceId,
  })
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
    const adapter = await makeAdapter(identity, broker, 'detps-am-single', 'd1111111-1111-4111-8111-111111111111')
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

  it('two devices of the same identity derive the same private space; register is idempotent (no conflict)', async () => {
    const broker = new InProcessLogBroker()
    const created = await createTestIdentity('detps-am-multi')
    const a = created.identity
    const b = await recoverTestIdentity(created.mnemonic, 'detps-am-multi')
    cleanup.push(async () => { await a.deleteStoredIdentity() })
    cleanup.push(async () => { await b.deleteStoredIdentity() })

    const genesis = await derivePrivateSpaceGenesis((info, length) => a.deriveFrameworkKey(info, length))

    const adapterA = await makeAdapter(a, broker, 'detps-am-a', 'a1111111-1111-4111-8111-111111111111')
    await adapterA.start(); cleanup.push(async () => { await adapterA.stop() })
    const adapterB = await makeAdapter(b, broker, 'detps-am-b', 'b2222222-2222-4222-8222-222222222222')
    await adapterB.start(); cleanup.push(async () => { await adapterB.stop() })

    const sa = await adapterA.openOrCreateDeterministicPrivateSpace({ items: {} }, PRIVATE_META)
    const sb = await adapterB.openOrCreateDeterministicPrivateSpace({ items: {} }, PRIVATE_META)

    expect(sa.id).toBe(genesis.spaceId)
    expect(sb.id).toBe(genesis.spaceId)
    expect((await adapterA.getSpace(genesis.spaceId))?.id).toBe(genesis.spaceId)
    expect((await adapterB.getSpace(genesis.spaceId))?.id).toBe(genesis.spaceId)
  })
})
