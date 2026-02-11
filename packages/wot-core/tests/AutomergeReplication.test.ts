import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as Automerge from '@automerge/automerge'
import { WotIdentity } from '../src/identity/WotIdentity'
import { AutomergeReplicationAdapter } from '../src/adapters/replication/AutomergeReplicationAdapter'
import { InMemoryMessagingAdapter } from '../src/adapters/messaging/InMemoryMessagingAdapter'
import { GroupKeyService } from '../src/services/GroupKeyService'

// Simple doc schema for testing
interface TestDoc {
  counter: number
  items: string[]
}

function createAdapter(identity: WotIdentity, messaging: InMemoryMessagingAdapter) {
  return new AutomergeReplicationAdapter({
    identity,
    messaging,
    groupKeyService: new GroupKeyService(),
  })
}

describe('AutomergeReplicationAdapter', () => {
  let alice: WotIdentity
  let bob: WotIdentity
  let aliceMessaging: InMemoryMessagingAdapter
  let bobMessaging: InMemoryMessagingAdapter
  let aliceAdapter: AutomergeReplicationAdapter
  let bobAdapter: AutomergeReplicationAdapter

  beforeEach(async () => {
    InMemoryMessagingAdapter.resetAll()

    alice = new WotIdentity()
    bob = new WotIdentity()
    await alice.create('alice-pass', false)
    await bob.create('bob-pass', false)

    aliceMessaging = new InMemoryMessagingAdapter()
    bobMessaging = new InMemoryMessagingAdapter()
    await aliceMessaging.connect(alice.getDid())
    await bobMessaging.connect(bob.getDid())

    aliceAdapter = createAdapter(alice, aliceMessaging)
    bobAdapter = createAdapter(bob, bobMessaging)

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

  describe('Space Lifecycle', () => {
    it('should create a space with an Automerge doc', async () => {
      const space = await aliceAdapter.createSpace<TestDoc>('shared', {
        counter: 0,
        items: [],
      })

      expect(space.id).toBeTruthy()
      expect(space.type).toBe('shared')
      expect(space.members).toContain(alice.getDid())
      expect(space.createdAt).toBeTruthy()
    })

    it('should list created spaces', async () => {
      await aliceAdapter.createSpace<TestDoc>('shared', { counter: 0, items: [] })
      await aliceAdapter.createSpace<TestDoc>('personal', { counter: 0, items: [] })

      const spaces = await aliceAdapter.getSpaces()
      expect(spaces.length).toBe(2)
      expect(spaces.map(s => s.type)).toContain('shared')
      expect(spaces.map(s => s.type)).toContain('personal')
    })

    it('should get a specific space', async () => {
      const created = await aliceAdapter.createSpace<TestDoc>('shared', {
        counter: 0,
        items: [],
      })
      const retrieved = await aliceAdapter.getSpace(created.id)
      expect(retrieved).not.toBeNull()
      expect(retrieved!.id).toBe(created.id)
    })

    it('should return null for unknown space', async () => {
      const result = await aliceAdapter.getSpace('nonexistent')
      expect(result).toBeNull()
    })
  })

  describe('SpaceHandle + Transact', () => {
    it('should open a handle and read initial state', async () => {
      const space = await aliceAdapter.createSpace<TestDoc>('shared', {
        counter: 42,
        items: ['hello'],
      })

      const handle = await aliceAdapter.openSpace<TestDoc>(space.id)
      const doc = handle.getDoc()

      expect(doc.counter).toBe(42)
      expect(doc.items).toEqual(['hello'])

      handle.close()
    })

    it('should transact and update the doc', async () => {
      const space = await aliceAdapter.createSpace<TestDoc>('shared', {
        counter: 0,
        items: [],
      })

      const handle = await aliceAdapter.openSpace<TestDoc>(space.id)
      handle.transact(doc => {
        doc.counter = 10
        doc.items.push('test')
      })

      const doc = handle.getDoc()
      expect(doc.counter).toBe(10)
      expect(doc.items).toEqual(['test'])

      handle.close()
    })

    it('should produce encrypted changes on transact', async () => {
      const space = await aliceAdapter.createSpace<TestDoc>('shared', {
        counter: 0,
        items: [],
      })

      // Add Bob as member first
      const bobEncPub = await bob.getEncryptionPublicKeyBytes()
      await aliceAdapter.addMember(space.id, bob.getDid(), bobEncPub)

      // Collect messages sent
      const sentMessages: any[] = []
      bobMessaging.onMessage(env => sentMessages.push(env))

      const handle = await aliceAdapter.openSpace<TestDoc>(space.id)

      // Wait for Bob to receive messages
      await new Promise(r => setTimeout(r, 10))
      sentMessages.length = 0 // Clear invite messages

      handle.transact(doc => {
        doc.counter = 99
      })

      // Give messaging a tick
      await new Promise(r => setTimeout(r, 10))

      expect(sentMessages.length).toBeGreaterThan(0)
      expect(sentMessages[0].type).toBe('content')
      // Payload should be encrypted (not plaintext Automerge changes)
      const payload = JSON.parse(sentMessages[0].payload)
      expect(payload.spaceId).toBe(space.id)
      expect(payload.generation).toBeTypeOf('number')
      expect(payload.ciphertext).toBeTruthy()

      handle.close()
    })
  })

  describe('Space Invite + Sync', () => {
    it('should send encrypted group key to new member via space-invite', async () => {
      const space = await aliceAdapter.createSpace<TestDoc>('shared', {
        counter: 0,
        items: [],
      })

      const inviteMessages: any[] = []
      bobMessaging.onMessage(env => inviteMessages.push(env))

      const bobEncPub = await bob.getEncryptionPublicKeyBytes()
      await aliceAdapter.addMember(space.id, bob.getDid(), bobEncPub)

      await new Promise(r => setTimeout(r, 10))

      const invite = inviteMessages.find(m => m.type === 'space-invite')
      expect(invite).toBeTruthy()
      expect(invite.toDid).toBe(bob.getDid())
      expect(invite.fromDid).toBe(alice.getDid())
    })

    it('should allow Bob to join a space after receiving invite', async () => {
      const space = await aliceAdapter.createSpace<TestDoc>('shared', {
        counter: 0,
        items: [],
      })

      const bobEncPub = await bob.getEncryptionPublicKeyBytes()
      await aliceAdapter.addMember(space.id, bob.getDid(), bobEncPub)

      // Wait for invite to arrive
      await new Promise(r => setTimeout(r, 50))

      // Bob should have the space now
      const bobSpace = await bobAdapter.getSpace(space.id)
      expect(bobSpace).not.toBeNull()
      expect(bobSpace!.members).toContain(bob.getDid())
    })

    it('should sync changes from Alice to Bob', async () => {
      const space = await aliceAdapter.createSpace<TestDoc>('shared', {
        counter: 0,
        items: [],
      })

      // Add Bob
      const bobEncPub = await bob.getEncryptionPublicKeyBytes()
      await aliceAdapter.addMember(space.id, bob.getDid(), bobEncPub)
      await new Promise(r => setTimeout(r, 50))

      // Alice makes a change
      const aliceHandle = await aliceAdapter.openSpace<TestDoc>(space.id)
      aliceHandle.transact(doc => {
        doc.counter = 42
        doc.items.push('from-alice')
      })

      // Wait for encrypted change to propagate
      await new Promise(r => setTimeout(r, 50))

      // Bob should see the change
      const bobHandle = await bobAdapter.openSpace<TestDoc>(space.id)
      const bobDoc = bobHandle.getDoc()
      expect(bobDoc.counter).toBe(42)
      expect(bobDoc.items).toContain('from-alice')

      aliceHandle.close()
      bobHandle.close()
    })

    it('should sync bidirectionally (Alice ↔ Bob)', async () => {
      const space = await aliceAdapter.createSpace<TestDoc>('shared', {
        counter: 0,
        items: [],
      })

      const bobEncPub = await bob.getEncryptionPublicKeyBytes()
      await aliceAdapter.addMember(space.id, bob.getDid(), bobEncPub)
      await new Promise(r => setTimeout(r, 50))

      // Alice changes
      const aliceHandle = await aliceAdapter.openSpace<TestDoc>(space.id)
      aliceHandle.transact(doc => {
        doc.items.push('alice-item')
      })
      await new Promise(r => setTimeout(r, 50))

      // Bob changes
      const bobHandle = await bobAdapter.openSpace<TestDoc>(space.id)
      bobHandle.transact(doc => {
        doc.items.push('bob-item')
      })
      await new Promise(r => setTimeout(r, 50))

      // Both should have both items (CRDT merge)
      const aliceDoc = aliceHandle.getDoc()
      const bobDoc = bobHandle.getDoc()

      expect(aliceDoc.items).toContain('alice-item')
      expect(aliceDoc.items).toContain('bob-item')
      expect(bobDoc.items).toContain('alice-item')
      expect(bobDoc.items).toContain('bob-item')

      aliceHandle.close()
      bobHandle.close()
    })
  })

  describe('Key Rotation', () => {
    it('should rotate key when member is removed', async () => {
      const space = await aliceAdapter.createSpace<TestDoc>('shared', {
        counter: 0,
        items: [],
      })

      const bobEncPub = await bob.getEncryptionPublicKeyBytes()
      await aliceAdapter.addMember(space.id, bob.getDid(), bobEncPub)
      await new Promise(r => setTimeout(r, 50))

      // Remove Bob — should trigger key rotation
      await aliceAdapter.removeMember(space.id, bob.getDid())

      // Verify key generation incremented
      const generation = aliceAdapter.getKeyGeneration(space.id)
      expect(generation).toBe(1) // Was 0, now 1
    })

    it('should prevent removed member from decrypting new changes', async () => {
      // Create a third user (Carol) to verify she still gets updates
      const carol = new WotIdentity()
      await carol.create('carol-pass', false)
      const carolMessaging = new InMemoryMessagingAdapter()
      await carolMessaging.connect(carol.getDid())
      const carolAdapter = createAdapter(carol, carolMessaging)
      await carolAdapter.start()

      const space = await aliceAdapter.createSpace<TestDoc>('shared', {
        counter: 0,
        items: [],
      })

      const bobEncPub = await bob.getEncryptionPublicKeyBytes()
      const carolEncPub = await carol.getEncryptionPublicKeyBytes()
      await aliceAdapter.addMember(space.id, bob.getDid(), bobEncPub)
      await aliceAdapter.addMember(space.id, carol.getDid(), carolEncPub)
      await new Promise(r => setTimeout(r, 50))

      // Remove Bob
      await aliceAdapter.removeMember(space.id, bob.getDid())
      await new Promise(r => setTimeout(r, 50))

      // Alice makes a change with the new key
      const aliceHandle = await aliceAdapter.openSpace<TestDoc>(space.id)
      aliceHandle.transact(doc => {
        doc.counter = 999
      })
      await new Promise(r => setTimeout(r, 50))

      // Carol should see the change (she got the rotated key)
      const carolHandle = await carolAdapter.openSpace<TestDoc>(space.id)
      expect(carolHandle.getDoc().counter).toBe(999)

      // Bob should NOT have the new key and cannot decrypt
      // His space should still show the old state
      const bobSpace = await bobAdapter.getSpace(space.id)
      if (bobSpace) {
        const bobHandle = await bobAdapter.openSpace<TestDoc>(space.id)
        expect(bobHandle.getDoc().counter).not.toBe(999)
        bobHandle.close()
      }

      aliceHandle.close()
      carolHandle.close()
      await carolAdapter.stop()
      try { await carol.deleteStoredIdentity() } catch {}
    })
  })

  describe('onRemoteUpdate', () => {
    it('should fire callback when remote changes arrive', async () => {
      const space = await aliceAdapter.createSpace<TestDoc>('shared', {
        counter: 0,
        items: [],
      })

      const bobEncPub = await bob.getEncryptionPublicKeyBytes()
      await aliceAdapter.addMember(space.id, bob.getDid(), bobEncPub)
      await new Promise(r => setTimeout(r, 50))

      const bobHandle = await bobAdapter.openSpace<TestDoc>(space.id)
      let updateFired = false
      bobHandle.onRemoteUpdate(() => {
        updateFired = true
      })

      // Alice makes a change
      const aliceHandle = await aliceAdapter.openSpace<TestDoc>(space.id)
      aliceHandle.transact(doc => {
        doc.counter = 7
      })

      await new Promise(r => setTimeout(r, 50))

      expect(updateFired).toBe(true)

      aliceHandle.close()
      bobHandle.close()
    })
  })

  describe('Adapter State', () => {
    it('should track replication state', async () => {
      expect(aliceAdapter.getState()).toBe('idle')
    })

    it('should stop cleanly', async () => {
      await aliceAdapter.stop()
      expect(aliceAdapter.getState()).toBe('idle')
    })
  })
})
