import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { PublicIdentitySession } from '../../wot-core/src/application/identity'
import { createTestIdentity } from '../../wot-core/tests/helpers/identity-session'
import { InMemoryMessagingAdapter, InMemorySpaceMetadataStorage, InMemoryKeyManagementAdapter } from '@web_of_trust/core/adapters'
import { YjsReplicationAdapter } from '../src/YjsReplicationAdapter'

/**
 * Reseed regression (Anton, 19.07.2026): after a seed recovery the restored
 * space metadata carries the ORIGIN device's createdAt. The ghost-space
 * cleanup measured its age against that clock, saw "24 minutes old, no key,
 * empty doc" and DELETED the freshly restored space — the deletion even syncs
 * back through the PersonalDoc. The grace period must run on the LOCAL
 * first-seen clock instead.
 */
const TestDoc = () => ({ items: {} as Record<string, { title: string }> })

function createAdapter(
  identity: PublicIdentitySession,
  messaging: InMemoryMessagingAdapter,
  metadataStorage: InMemorySpaceMetadataStorage,
  keyManagement: InMemoryKeyManagementAdapter,
) {
  return new YjsReplicationAdapter({
    identity,
    messaging,
    brokerUrls: ['wss://broker.example.com'],
    keyManagement,
    metadataStorage,
  })
}

/** Simulates "metadata synced, group keys still in flight" on the recovery device. */
function withoutGroupKeys(storage: InMemorySpaceMetadataStorage): InMemorySpaceMetadataStorage {
  return new Proxy(storage, {
    get(target, prop, receiver) {
      if (prop === 'loadGroupKeys') return async () => []
      const value = Reflect.get(target, prop, receiver)
      return typeof value === 'function' ? value.bind(target) : value
    },
  }) as InMemorySpaceMetadataStorage
}

describe('reseed ghost-space grace period', () => {
  let alice: PublicIdentitySession
  let sharedMeta: InMemorySpaceMetadataStorage
  let device1: YjsReplicationAdapter
  let msg1: InMemoryMessagingAdapter

  beforeEach(async () => {
    InMemoryMessagingAdapter.resetAll()
    alice = (await createTestIdentity('alice-reseed')).identity
    sharedMeta = new InMemorySpaceMetadataStorage()
    msg1 = new InMemoryMessagingAdapter()
    await msg1.connect(alice.getDid())
    device1 = createAdapter(alice, msg1, sharedMeta, new InMemoryKeyManagementAdapter())
    await device1.start()
  })

  afterEach(async () => {
    vi.useRealTimers()
    await device1.stop().catch(() => {})
    InMemoryMessagingAdapter.resetAll()
    try { await alice.deleteStoredIdentity() } catch { /* ignore */ }
  })

  it('does NOT delete a keyless restored space whose origin createdAt is old', async () => {
    const space = await device1.createSpace('shared', TestDoc(), { name: 'Malina', members: [alice.getDid()] })

    // 24 minutes later a recovery device restores — keys not yet synced.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(Date.now() + 24 * 60_000))

    const msg2 = new InMemoryMessagingAdapter()
    await msg2.connect(alice.getDid())
    const device2 = createAdapter(alice, msg2, withoutGroupKeys(sharedMeta), new InMemoryKeyManagementAdapter())
    await device2.start() // → restoreSpacesFromMetadata

    // The space survives (grace runs on LOCAL first-seen, not origin createdAt) —
    // and above all: the synced metadata was NOT destroyed.
    const metaAfter = await sharedMeta.loadAllSpaceMetadata()
    expect(metaAfter.map((m) => m.info.id)).toContain(space.id)

    await device2.stop().catch(() => {})
  })

  it('still cleans a true ghost after the LOCAL grace elapses', async () => {
    const space = await device1.createSpace('shared', TestDoc(), { name: 'Geist', members: [alice.getDid()] })

    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(Date.now() + 24 * 60_000))

    const msg2 = new InMemoryMessagingAdapter()
    await msg2.connect(alice.getDid())
    const device2 = createAdapter(alice, msg2, withoutGroupKeys(sharedMeta), new InMemoryKeyManagementAdapter())
    await device2.start() // first sight — arms the local clock, must not delete

    expect((await sharedMeta.loadAllSpaceMetadata()).map((m) => m.info.id)).toContain(space.id)

    // Locally known for 11 minutes, still no key, still empty → real ghost.
    vi.setSystemTime(new Date(Date.now() + 11 * 60_000))
    await device2.restoreSpacesFromMetadata()

    expect((await sharedMeta.loadAllSpaceMetadata()).map((m) => m.info.id)).not.toContain(space.id)

    await device2.stop().catch(() => {})
  })
})
