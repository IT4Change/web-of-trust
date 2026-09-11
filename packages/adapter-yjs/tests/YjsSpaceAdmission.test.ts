import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type { PublicIdentitySession } from '../../wot-core/src/application/identity'
import { createTestIdentity } from '../../wot-core/tests/helpers/identity-session'
import { InMemoryMessagingAdapter, InMemoryKeyManagementAdapter, InMemorySpaceMetadataStorage, InMemoryCompactStore } from '@web_of_trust/core/adapters'
import { isSameAdmission, compareAdmission } from '@web_of_trust/core/application'
import type { IncomingSpaceInvite, SpaceAdmission } from '@web_of_trust/core/types'
import { YjsReplicationAdapter } from '../src/YjsReplicationAdapter'

// RLS-Spec 12 Regel 4: jede Aufnahme in einen Space ist durch ihre Einladung
// identifiziert. Die Kennung wandert als SpaceInfo.admission /
// IncomingSpaceInvite.admission durch Adapter und Persistenz — eine
// Wiederaufnahme ist damit auch fuer ein Geraet erkennbar, das Entfernung und
// Wiederaufnahme offline verpasst hat.

const wait = (ms = 300) => new Promise((r) => setTimeout(r, ms))
interface TestDoc { items: Record<string, { title: string }> }

describe('Yjs Space-Admission (Aufnahme-Kennung)', () => {
  let alice: PublicIdentitySession, bob: PublicIdentitySession, carol: PublicIdentitySession
  let aliceMsg: InMemoryMessagingAdapter, bobMsg: InMemoryMessagingAdapter, carolMsg: InMemoryMessagingAdapter
  let aliceAdapter: YjsReplicationAdapter
  const started: YjsReplicationAdapter[] = []

  function makeAdapter(identity: PublicIdentitySession, messaging: InMemoryMessagingAdapter, opts?: {
    keyManagement?: InMemoryKeyManagementAdapter
    metadataStorage?: InMemorySpaceMetadataStorage
    compactStore?: InMemoryCompactStore
  }): YjsReplicationAdapter {
    const adapter = new YjsReplicationAdapter({
      identity,
      messaging,
      brokerUrls: ['wss://broker.example.com'],
      keyManagement: opts?.keyManagement ?? new InMemoryKeyManagementAdapter(),
      metadataStorage: opts?.metadataStorage,
      compactStore: opts?.compactStore,
    })
    started.push(adapter)
    return adapter
  }

  beforeEach(async () => {
    InMemoryMessagingAdapter.resetAll()
    alice = (await createTestIdentity('alice-pass')).identity
    bob = (await createTestIdentity('bob-pass')).identity
    carol = (await createTestIdentity('carol-pass')).identity
    aliceMsg = new InMemoryMessagingAdapter()
    bobMsg = new InMemoryMessagingAdapter()
    carolMsg = new InMemoryMessagingAdapter()
    await aliceMsg.connect(alice.getDid())
    await bobMsg.connect(bob.getDid())
    await carolMsg.connect(carol.getDid())
    aliceAdapter = makeAdapter(alice, aliceMsg)
    await aliceAdapter.start()
  })

  afterEach(async () => {
    for (const adapter of started.splice(0)) { try { await adapter.stop() } catch {} }
    InMemoryMessagingAdapter.resetAll()
    for (const id of [alice, bob, carol]) { try { await id.deleteStoredIdentity() } catch {} }
  })

  it('e) Creator: admission trägt Generation 0 und die eigene Capability', async () => {
    const space = await aliceAdapter.createSpace<TestDoc>('shared', { items: {} }, { name: 'S', members: [alice.getDid()] })
    expect(space.admission).toBeDefined()
    expect(space.admission!.keyGeneration).toBe(0)
    expect(space.admission!.capabilityId).toMatch(/^[0-9a-f]{64}$/)
    expect((await aliceAdapter.getSpace(space.id))!.admission).toEqual(space.admission)
  })

  it('a) Einladung annehmen: IncomingSpaceInvite.admission == SpaceInfo.admission, Generation = Invite-Generation', async () => {
    const receiver = makeAdapter(bob, bobMsg)
    await receiver.start()
    const events: IncomingSpaceInvite[] = []
    receiver.onSpaceInvite((invite) => events.push(invite))

    const space = await aliceAdapter.createSpace<TestDoc>('shared', { items: {} }, { name: 'Garten', members: [alice.getDid()] })
    await aliceAdapter.addMember(space.id, bob.getDid(), await bob.getEncryptionPublicKeyBytes())
    await wait()

    expect(events).toHaveLength(1)
    expect(events[0].admission.keyGeneration).toBe(0)
    expect(events[0].admission.capabilityId).toMatch(/^[0-9a-f]{64}$/)
    const bobSpace = await receiver.getSpace(space.id)
    expect(bobSpace!.admission).toEqual(events[0].admission)
    // Die Kennung ist per Mitglied ausgestellt — Bob erbt NICHT Alices Kennung.
    expect(bobSpace!.admission!.capabilityId).not.toBe(space.admission!.capabilityId)
  })

  it('b) Entfernung + erneute Einladung: neue admission, echt größer als die alte', async () => {
    const receiver = makeAdapter(bob, bobMsg)
    await receiver.start()
    const events: IncomingSpaceInvite[] = []
    receiver.onSpaceInvite((invite) => events.push(invite))

    const space = await aliceAdapter.createSpace<TestDoc>('shared', { items: {} }, { name: 'S', members: [alice.getDid()] })
    await aliceAdapter.addMember(space.id, bob.getDid(), await bob.getEncryptionPublicKeyBytes())
    await wait()
    const first = events[0].admission

    await aliceAdapter.removeMember(space.id, bob.getDid())
    await wait()
    await aliceAdapter.addMember(space.id, bob.getDid(), await bob.getEncryptionPublicKeyBytes())
    await wait()

    expect(events.length).toBeGreaterThanOrEqual(2)
    const second = events[events.length - 1].admission
    expect(isSameAdmission(first, second)).toBe(false)
    expect(compareAdmission(second, first)).toBeGreaterThan(0)
    expect((await receiver.getSpace(space.id))!.admission).toEqual(second)
  })

  it('c) Rotation ohne Wiederaufnahme (anderes Mitglied entfernt) lässt admission unverändert', async () => {
    const receiver = makeAdapter(bob, bobMsg)
    await receiver.start()
    const bobKeys = (receiver as unknown as { keyManagement: InMemoryKeyManagementAdapter }).keyManagement

    const space = await aliceAdapter.createSpace<TestDoc>('shared', { items: {} }, { name: 'S', members: [alice.getDid()] })
    await aliceAdapter.addMember(space.id, bob.getDid(), await bob.getEncryptionPublicKeyBytes())
    await aliceAdapter.addMember(space.id, carol.getDid(), await carol.getEncryptionPublicKeyBytes())
    await wait()
    const bobBefore = (await receiver.getSpace(space.id))!.admission!
    const aliceBefore = (await aliceAdapter.getSpace(space.id))!.admission!

    await aliceAdapter.removeMember(space.id, carol.getDid())
    await wait()

    // Rotation hat stattgefunden …
    expect(await bobKeys.getCurrentGeneration(space.id)).toBeGreaterThan(bobBefore.keyGeneration)
    // … die Aufnahme-Kennung bleibt davon unberührt.
    expect((await receiver.getSpace(space.id))!.admission).toEqual(bobBefore)
    expect((await aliceAdapter.getSpace(space.id))!.admission).toEqual(aliceBefore)
  })

  it('d) Reload: persistierte admission bleibt erhalten', async () => {
    const metadataStorage = new InMemorySpaceMetadataStorage()
    const compactStore = new InMemoryCompactStore()
    const keyManagement = new InMemoryKeyManagementAdapter()

    const first = makeAdapter(alice, aliceMsg, { keyManagement, metadataStorage, compactStore })
    await first.start()
    const space = await first.createSpace<TestDoc>('shared', { items: {} }, { name: 'Persistent' })
    await wait(100)
    await first.stop()

    const second = makeAdapter(alice, aliceMsg, { keyManagement, metadataStorage, compactStore })
    await second.start()
    expect((await second.getSpace(space.id))!.admission).toEqual(space.admission)
  })

  it('d) Alt-Space ohne gespeicherte admission wird beim Restore lazy abgeleitet und persistiert', async () => {
    const metadataStorage = new InMemorySpaceMetadataStorage()
    const compactStore = new InMemoryCompactStore()
    const keyManagement = new InMemoryKeyManagementAdapter()

    const first = makeAdapter(alice, aliceMsg, { keyManagement, metadataStorage, compactStore })
    await first.start()
    const space = await first.createSpace<TestDoc>('shared', { items: {} }, { name: 'Legacy' })
    await wait(100)
    await first.stop()

    // Bestand simulieren: Metadata aus der Zeit vor dieser Kennung.
    const stored = (await metadataStorage.loadSpaceMetadata(space.id))!
    delete (stored.info as { admission?: SpaceAdmission }).admission
    await metadataStorage.saveSpaceMetadata(stored)

    const second = makeAdapter(alice, aliceMsg, { keyManagement, metadataStorage, compactStore })
    await second.start()
    const restored = (await second.getSpace(space.id))!
    expect(restored.admission).toEqual(space.admission)
    expect((await metadataStorage.loadSpaceMetadata(space.id))!.info.admission).toEqual(space.admission)
  })
})
