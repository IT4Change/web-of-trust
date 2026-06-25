import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type { PublicIdentitySession } from '../../wot-core/src/application/identity'
import { createTestIdentity } from '../../wot-core/tests/helpers/identity-session'
import {
  InMemoryMessagingAdapter,
  InProcessLogBroker,
  InMemorySpaceMetadataStorage,
  InMemoryKeyManagementAdapter,
  InMemoryDocLogStore,
} from '@web_of_trust/core/adapters'
import { KEY_ROTATION_MESSAGE_TYPE } from '@web_of_trust/core/protocol'
import type { WireMessage } from '@web_of_trust/core/ports'
import { AutomergeReplicationAdapter } from '../src/AutomergeReplicationAdapter'
import { InMemoryRepoStorageAdapter } from '../src/InMemoryRepoStorageAdapter'

/**
 * Hold every `key-rotation/1.0` message addressed to this messaging adapter until
 * {@link MessageHold.release} — makes a still-active member a deterministic LEGITIME
 * LAGGER (VE-C2). Mirrors the Yjs adapter's secure-removal lagger test.
 */
interface MessageHold {
  release: () => Promise<void>
  held: number
}
function holdKeyRotations(messaging: InMemoryMessagingAdapter): MessageHold {
  const buffered: WireMessage[] = []
  const internal = messaging as unknown as { deliverToSelf: (m: WireMessage) => Promise<void> }
  const original = internal.deliverToSelf.bind(messaging)
  internal.deliverToSelf = async (envelope: WireMessage) => {
    if ((envelope as { type?: unknown }).type === KEY_ROTATION_MESSAGE_TYPE) {
      buffered.push(envelope)
      return
    }
    return original(envelope)
  }
  return {
    get held() {
      return buffered.length
    },
    release: async () => {
      internal.deliverToSelf = original
      const toDeliver = buffered.splice(0)
      for (const m of toDeliver) await original(m)
    },
  }
}

// Slice SR / VE-C1 + VE-C3 — adapter-level wiring of the two-phase secure removal
// for the Automerge engine (parity with YjsSecureRemoval). The engine-neutral safety
// invariants live in wot-core's SecureRemovalWorkflow tests; this proves the Automerge
// adapter wires stage → space-rotate → commit to a real broker end-to-end.

const wait = (ms = 150) => new Promise((r) => setTimeout(r, ms))
const BROKER_URLS = ['wss://broker.example.com']
const DEVICE_ALICE = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const DEVICE_BOB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

interface TestDoc {
  items: Record<string, { title: string }>
}

function brokerGeneration(broker: InProcessLogBroker, docId: string): number | undefined {
  return (broker as unknown as { docs: Map<string, { generation: number }> }).docs.get(docId)?.generation
}

function adapterGeneration(adapter: AutomergeReplicationAdapter, spaceId: string): Promise<number> {
  return (adapter as unknown as { keyManagement: InMemoryKeyManagementAdapter }).keyManagement.getCurrentGeneration(spaceId)
}

function pendingRemoval(adapter: AutomergeReplicationAdapter, spaceId: string, removedDid: string) {
  return (adapter as unknown as { docLogStore: InMemoryDocLogStore }).docLogStore.getPendingRemoval(spaceId, removedDid)
}

describe('AutomergeReplicationAdapter — Slice SR secure removal (VE-C1 wiring)', () => {
  let alice: PublicIdentitySession
  let bob: PublicIdentitySession
  let broker: InProcessLogBroker
  let aliceMessaging: InMemoryMessagingAdapter
  let bobMessaging: InMemoryMessagingAdapter
  let aliceAdapter: AutomergeReplicationAdapter
  let bobAdapter: AutomergeReplicationAdapter

  async function makeAdapter(
    identity: PublicIdentitySession,
    messaging: InMemoryMessagingAdapter,
    deviceId: string,
  ): Promise<AutomergeReplicationAdapter> {
    const docLogStore = new InMemoryDocLogStore()
    await docLogStore.init()
    await docLogStore.setDeviceId(deviceId)
    return new AutomergeReplicationAdapter({
      identity,
      messaging,
      brokerUrls: BROKER_URLS,
      keyManagement: new InMemoryKeyManagementAdapter(),
      metadataStorage: new InMemorySpaceMetadataStorage(),
      repoStorage: new InMemoryRepoStorageAdapter(),
      docLogStore,
      enableLogSync: true,
      deviceId,
    })
  }

  beforeEach(async () => {
    InMemoryMessagingAdapter.resetAll()
    broker = new InProcessLogBroker()
    alice = (await createTestIdentity('alice-pass')).identity
    bob = (await createTestIdentity('bob-pass')).identity
    aliceMessaging = new InMemoryMessagingAdapter({ broker, socketId: 'alice-socket' })
    bobMessaging = new InMemoryMessagingAdapter({ broker, socketId: 'bob-socket' })
    await aliceMessaging.connect(alice.getDid())
    await bobMessaging.connect(bob.getDid())
    aliceAdapter = await makeAdapter(alice, aliceMessaging, DEVICE_ALICE)
    bobAdapter = await makeAdapter(bob, bobMessaging, DEVICE_BOB)
    await aliceAdapter.start()
    await bobAdapter.start()
  })

  afterEach(async () => {
    await aliceAdapter.stop()
    await bobAdapter.stop()
    InMemoryMessagingAdapter.resetAll()
    try { await alice.deleteStoredIdentity() } catch {}
    try { await bob.deleteStoredIdentity() } catch {}
  })

  async function createSharedSpace(): Promise<string> {
    const space = await aliceAdapter.createSpace<TestDoc>('shared', { items: {} }, { name: 'Removal Space' })
    await wait()
    const bobEncKey = await bob.getEncryptionPublicKeyBytes()
    await aliceAdapter.addMember(space.id, bob.getDid(), bobEncKey)
    await wait(250)
    return space.id
  }

  it('removeMember runs the two-phase flow end-to-end: broker rotated, generation advanced, member dropped, staging cleared', async () => {
    const spaceId = await createSharedSpace()
    expect((await aliceAdapter.getSpace(spaceId))!.members).toContain(bob.getDid())
    expect(await adapterGeneration(aliceAdapter, spaceId)).toBe(0)
    expect(brokerGeneration(broker, spaceId) ?? 0).toBe(0)

    await aliceAdapter.removeMember(spaceId, bob.getDid())
    await wait(250)

    expect(await adapterGeneration(aliceAdapter, spaceId)).toBe(1)
    expect(brokerGeneration(broker, spaceId)).toBe(1)
    expect((await aliceAdapter.getSpace(spaceId))!.members).not.toContain(bob.getDid())
    expect(await pendingRemoval(aliceAdapter, spaceId, bob.getDid())).toBeNull()
  })

  it('post-enforcement: a removed member can no longer land a write at the broker (its old-generation log-entry is gated out)', async () => {
    const spaceId = await createSharedSpace()
    const bobHandle = await bobAdapter.openSpace<TestDoc>(spaceId)
    const aliceHandle = await aliceAdapter.openSpace<TestDoc>(spaceId)

    bobHandle.transact((doc) => { doc.items['pre'] = { title: 'pre-removal' } })
    await wait(250)
    expect(aliceHandle.getDoc().items['pre']?.title).toBe('pre-removal')

    await aliceAdapter.removeMember(spaceId, bob.getDid())
    await wait(250)
    expect(brokerGeneration(broker, spaceId)).toBe(1)

    bobHandle.transact((doc) => { doc.items['post'] = { title: 'post-removal-should-be-gated' } })
    await wait(300)
    expect(aliceHandle.getDoc().items['post']).toBeUndefined()

    bobHandle.close()
    aliceHandle.close()
  })

  it('VE-C2 legitimate lagger: a still-active member that missed the rotation gets KEY_GENERATION_STALE, catches up, re-emits, and converges (no SEQ_COLLISION, no double-effect)', async () => {
    // Parity with the Yjs lagger test. Three members: Alice (admin), Bob (the LAGGER,
    // stays active), Carol (removed). Alice removes Carol → rotation to gen 1. Bob is
    // HELD on the key-rotation, writes a stale gen-0 entry → broker rejects
    // KEY_GENERATION_STALE → the re-emit parks. Then Bob receives the rotation →
    // imports gen-1 → replayPendingReemits drains → re-emit under a NEW seq + gen 1 →
    // converges to Alice. Because VE-C2 lives in the engine-neutral coordinator, the
    // Automerge adapter inherits it once replayPendingReemits is wired on rotation-apply.
    const carol = (await createTestIdentity('carol-pass')).identity
    const carolMessaging = new InMemoryMessagingAdapter({ broker, socketId: 'carol-socket' })
    await carolMessaging.connect(carol.getDid())
    const carolAdapter = await makeAdapter(carol, carolMessaging, 'cccccccc-cccc-4ccc-8ccc-cccccccccccc')
    await carolAdapter.start()

    try {
      const space = await aliceAdapter.createSpace<TestDoc>('shared', { items: {} }, { name: 'Lagger Space' })
      const spaceId = space.id
      await wait()
      await aliceAdapter.addMember(spaceId, bob.getDid(), await bob.getEncryptionPublicKeyBytes())
      await wait(200)
      await aliceAdapter.addMember(spaceId, carol.getDid(), await carol.getEncryptionPublicKeyBytes())
      await wait(250)

      const bobHandle = await bobAdapter.openSpace<TestDoc>(spaceId)
      const aliceHandle = await aliceAdapter.openSpace<TestDoc>(spaceId)
      await wait(200)

      // Baseline: a pre-rotation write from Bob replicates to Alice (Bob is active).
      bobHandle.transact((doc) => { doc.items['pre'] = { title: 'pre-rotation' } })
      await wait(250)
      expect(aliceHandle.getDoc().items['pre']?.title).toBe('pre-rotation')
      expect(await adapterGeneration(bobAdapter, spaceId)).toBe(0)

      // HOLD Bob's key-rotation so he stays the lagger on gen 0.
      const hold = holdKeyRotations(bobMessaging)

      await aliceAdapter.removeMember(spaceId, carol.getDid())
      await wait(300)
      expect(brokerGeneration(broker, spaceId)).toBe(1)
      expect(await adapterGeneration(aliceAdapter, spaceId)).toBe(1)
      expect(await adapterGeneration(bobAdapter, spaceId)).toBe(0)
      expect(hold.held).toBeGreaterThanOrEqual(1)

      // Bob writes under the stale gen-0 key → KEY_GENERATION_STALE → re-emit parks →
      // not yet at Alice.
      bobHandle.transact((doc) => { doc.items['lag'] = { title: 'written-while-lagging' } })
      await wait(300)
      expect(aliceHandle.getDoc().items['lag']).toBeUndefined()

      // The rotation arrives → Bob imports gen 1 → drains the parked re-emit → converges.
      await hold.release()
      await wait(500)

      expect(await adapterGeneration(bobAdapter, spaceId)).toBe(1)
      expect(aliceHandle.getDoc().items['lag']?.title).toBe('written-while-lagging')
      expect(Object.keys(aliceHandle.getDoc().items).filter((k) => k === 'lag')).toHaveLength(1)
      expect(aliceHandle.getDoc().items['pre']?.title).toBe('pre-rotation')

      bobHandle.close()
      aliceHandle.close()
    } finally {
      await carolAdapter.stop()
      try { await carol.deleteStoredIdentity() } catch {}
    }
  })
})
