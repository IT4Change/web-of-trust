import { describe, it, expect, afterEach } from 'vitest'
import type { PublicIdentitySession } from '../../wot-core/src/application/identity'
import { createTestIdentity } from '../../wot-core/tests/helpers/identity-session'
import { InMemoryMessagingAdapter, InMemoryKeyManagementAdapter, InMemoryCompactStore, InMemorySpaceMetadataStorage, InMemoryDocLogStore, InProcessLogBroker } from '@web_of_trust/core/adapters'
import { InMemoryRepoStorageAdapter } from '../src/InMemoryRepoStorageAdapter'
import { compareAdmission } from '@web_of_trust/core/application'
import type { SpaceInfo } from '@web_of_trust/core/types'
import { AutomergeReplicationAdapter } from '../src/AutomergeReplicationAdapter'

// RLS-Spec 12 Regel 4 (Automerge-Spiegel): die Aufnahme-Kennung ist eine
// Projektion des _members-Event-Sets, nie ein gespeicherter Wert. Auch der
// Austritt (leaveSpace) schreibt sein removed-Ereignis dorthin (Yjs-Paritaet),
// eine Wiederaufnahme danach ist also erkennbar.

interface TestDoc { items: Record<string, { title: string }> }
const wait = (ms = 400) => new Promise((r) => setTimeout(r, ms))
const cleanups: Array<() => Promise<void>> = []

function loadedInfo(adapter: AutomergeReplicationAdapter, spaceId: string): SpaceInfo {
  return (adapter as unknown as { spaces: Map<string, { info: SpaceInfo }> }).spaces.get(spaceId)!.info
}

async function createPeer(passphrase: string): Promise<{ identity: PublicIdentitySession; adapter: AutomergeReplicationAdapter }> {
  const identity = (await createTestIdentity(passphrase)).identity
  const messaging = new InMemoryMessagingAdapter()
  await messaging.connect(identity.getDid())
  const adapter = new AutomergeReplicationAdapter({
    identity,
    messaging,
    brokerUrls: ['wss://broker.example.com'],
    keyManagement: new InMemoryKeyManagementAdapter(),
    metadataStorage: new InMemorySpaceMetadataStorage(),
    compactStore: new InMemoryCompactStore(),
  })
  await adapter.start()
  cleanups.push(async () => {
    try { await adapter.stop() } catch {}
    try { await identity.deleteStoredIdentity() } catch {}
  })
  return { identity, adapter }
}

/**
 * Zwei Geraete am selben In-Process-Broker mit log-sync — die Konfiguration, in
 * der die Membership-Ereignisse als durable Log-Eintraege reisen (persist before
 * send). Der Austritt muss die verbleibenden Mitglieder auf diesem Weg
 * erreichen, BEVOR das austretende Geraet lokal aufraeumt.
 */
async function createLogSyncPeer(passphrase: string, broker: InProcessLogBroker, socketId: string, deviceId: string): Promise<{ identity: PublicIdentitySession; adapter: AutomergeReplicationAdapter; docLogStore: InMemoryDocLogStore }> {
  const identity = (await createTestIdentity(passphrase)).identity
  const messaging = new InMemoryMessagingAdapter({ broker, socketId })
  await messaging.connect(identity.getDid())
  const docLogStore = new InMemoryDocLogStore()
  await docLogStore.init()
  await docLogStore.setDeviceId(deviceId)
  const adapter = new AutomergeReplicationAdapter({
    identity,
    messaging,
    brokerUrls: ['wss://broker.example.com'],
    keyManagement: new InMemoryKeyManagementAdapter(),
    metadataStorage: new InMemorySpaceMetadataStorage(),
    repoStorage: new InMemoryRepoStorageAdapter(),
    docLogStore,
    enableLogSync: true,
    deviceId,
  })
  await adapter.start()
  cleanups.push(async () => {
    try { await adapter.stop() } catch {}
    try { await identity.deleteStoredIdentity() } catch {}
  })
  return { identity, adapter, docLogStore }
}

/** Anzahl durabler Log-Eintraege, die der Broker fuer ein Doc haelt (Durabilitaets-Beweis). */
function brokerEntryCount(broker: InProcessLogBroker, docId: string): number {
  return (broker as unknown as { docs: Map<string, { entries: Map<string, unknown> }> }).docs.get(docId)?.entries.size ?? 0
}

/** Laesst den naechsten durablen Append EINMAL werfen. */
function armAppendFailure(store: InMemoryDocLogStore): void {
  const realAppend = store.appendLocalEntry.bind(store)
  let armed = true
  ;(store as unknown as { appendLocalEntry: typeof store.appendLocalEntry }).appendLocalEntry = (async (params: any) => {
    if (armed) {
      armed = false
      throw new Error('simulated durable append failure (leaveSpace)')
    }
    return realAppend(params)
  }) as typeof store.appendLocalEntry
}

afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup()
  InMemoryMessagingAdapter.resetAll()
})

describe('Automerge Space-Admission (Aufnahme-Kennung)', () => {
  it('Creator: Aufnahme mit der Genesis-Generation 0', async () => {
    const alice = await createPeer('am-adm-create')
    const space = await alice.adapter.createSpace<TestDoc>('shared', { items: {} }, { name: 'S' })
    expect(space.admission).toEqual({ keyGeneration: 0 })
    expect(loadedInfo(alice.adapter, space.id).admission).toEqual({ keyGeneration: 0 })
  })

  it('Entfernung + Wiederaufnahme: höhere Kennung beim Eingeladenen', async () => {
    const alice = await createPeer('am-adm-alice')
    const bob = await createPeer('am-adm-bob')
    const space = await alice.adapter.createSpace<TestDoc>('shared', { items: {} }, { name: 'S' })
    await alice.adapter.addMember(space.id, bob.identity.getDid(), await bob.identity.getEncryptionPublicKeyBytes())
    await wait()
    const first = (await bob.adapter.getSpace(space.id))!.admission!
    expect(first).toEqual({ keyGeneration: 0 })

    await alice.adapter.removeMember(space.id, bob.identity.getDid())
    await wait()
    await alice.adapter.addMember(space.id, bob.identity.getDid(), await bob.identity.getEncryptionPublicKeyBytes())
    await wait()

    const second = (await bob.adapter.getSpace(space.id))!.admission!
    expect(compareAdmission(second, first)).toBeGreaterThan(0)
  })

  it('Selbst-Verlassen (leaveSpace) + erneute Einladung: neue, höhere Kennung', async () => {
    const broker = new InProcessLogBroker()
    const alice = await createLogSyncPeer('am-leave-alice', broker, 'alice-socket', '11111111-1111-4111-8111-111111111111')
    const bob = await createLogSyncPeer('am-leave-bob', broker, 'bob-socket', '22222222-2222-4222-8222-222222222222')
    const space = await alice.adapter.createSpace<TestDoc>('shared', { items: {} }, { name: 'S' })
    await wait()
    await alice.adapter.addMember(space.id, bob.identity.getDid(), await bob.identity.getEncryptionPublicKeyBytes())
    await wait()
    expect((await bob.adapter.getSpace(space.id))!.admission).toEqual({ keyGeneration: 0 })

    // Austritt über die öffentliche Methode: das kanonische removed-Ereignis
    // muss Alice erreichen, sonst wäre die Wiederaufnahme nicht erkennbar.
    await bob.adapter.leaveSpace(space.id)
    await wait()
    expect(await bob.adapter.getSpace(space.id)).toBeNull()
    expect(loadedInfo(alice.adapter, space.id).members).not.toContain(bob.identity.getDid())

    await alice.adapter.addMember(space.id, bob.identity.getDid(), await bob.identity.getEncryptionPublicKeyBytes())
    await wait()
    const again = (await bob.adapter.getSpace(space.id))!.admission!
    expect(compareAdmission(again, { keyGeneration: 0 })).toBeGreaterThan(0)
  })

  it('Selbst-Verlassen lässt die Kennung eines Dritten unverändert', async () => {
    const broker = new InProcessLogBroker()
    const alice = await createLogSyncPeer('am-third-alice', broker, 'alice-socket', '11111111-1111-4111-8111-111111111111')
    const bob = await createLogSyncPeer('am-third-bob', broker, 'bob-socket', '22222222-2222-4222-8222-222222222222')
    const carol = await createLogSyncPeer('am-third-carol', broker, 'carol-socket', '33333333-3333-4333-8333-333333333333')
    const space = await alice.adapter.createSpace<TestDoc>('shared', { items: {} }, { name: 'S' })
    await wait()
    await alice.adapter.addMember(space.id, bob.identity.getDid(), await bob.identity.getEncryptionPublicKeyBytes())
    await wait()
    await alice.adapter.addMember(space.id, carol.identity.getDid(), await carol.identity.getEncryptionPublicKeyBytes())
    await wait()
    const carolBefore = (await carol.adapter.getSpace(space.id))!.admission!
    const aliceBefore = loadedInfo(alice.adapter, space.id).admission!

    await bob.adapter.leaveSpace(space.id)
    await wait()

    expect(loadedInfo(alice.adapter, space.id).members).not.toContain(bob.identity.getDid())
    expect((await carol.adapter.getSpace(space.id))!.admission).toEqual(carolBefore)
    expect(loadedInfo(alice.adapter, space.id).admission).toEqual(aliceBefore)
  })
  it('Austritt mit fehlgeschlagenem Log-Append: kein Cleanup — der Retry repariert die Durabilität, erst dann wird aufgeräumt', async () => {
    const broker = new InProcessLogBroker()
    const alice = await createLogSyncPeer('am-retry-alice', broker, 'alice-socket', '11111111-1111-4111-8111-111111111111')
    const bob = await createLogSyncPeer('am-retry-bob', broker, 'bob-socket', '22222222-2222-4222-8222-222222222222')
    const space = await alice.adapter.createSpace<TestDoc>('shared', { items: {} }, { name: 'S' })
    await wait()
    await alice.adapter.addMember(space.id, bob.identity.getDid(), await bob.identity.getEncryptionPublicKeyBytes())
    await wait()

    // Erster Austritt: der durable Append wirft NACH der lokalen Doc-Mutation.
    armAppendFailure(bob.docLogStore)
    await expect(bob.adapter.leaveSpace(space.id)).rejects.toThrow(/simulated durable append failure/)
    await wait()
    // Kein Cleanup: der Space ist lokal noch da …
    expect(await bob.adapter.getSpace(space.id)).not.toBeNull()
    // … das removed-Ereignis lokal bereits angewandt …
    expect(loadedInfo(bob.adapter, space.id).members).not.toContain(bob.identity.getDid())
    // … aber Alice weiß nichts davon (nichts wurde durabel geloggt).
    expect(loadedInfo(alice.adapter, space.id).members).toContain(bob.identity.getDid())
    const entriesAfterFailure = brokerEntryCount(broker, space.id)

    // Zweiter Austritt: der Retry darf NICHT auf die lokale Präsenz des
    // Ereignisses kurzschließen, sondern muss den Reparaturpfad von
    // commitMembershipEventDurable laufen lassen — der Broker-Log MUSS wachsen.
    await bob.adapter.leaveSpace(space.id)
    await wait()
    expect(brokerEntryCount(broker, space.id)).toBeGreaterThan(entriesAfterFailure)
    expect(await bob.adapter.getSpace(space.id)).toBeNull()
    expect(loadedInfo(alice.adapter, space.id).members).not.toContain(bob.identity.getDid())
  })
})
