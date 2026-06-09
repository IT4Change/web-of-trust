import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type { PublicIdentitySession } from '../../wot-core/src/application/identity'
import { createTestIdentity } from '../../wot-core/tests/helpers/identity-session'
import { InMemoryMessagingAdapter, InMemoryKeyManagementAdapter } from '@web_of_trust/core/adapters'
import { assertSpaceInviteBody, assertKeyRotationBody } from '@web_of_trust/core/protocol'
import { YjsReplicationAdapter } from '../src/YjsReplicationAdapter'
import type { MessageEnvelope } from '@web_of_trust/core/types'

// 1.B.3-key-rotation wire-form guarantees (Sync 003 ECIES container P1 + Sync 005 removal).
// C6: key material never travels plaintext; the whole spec body is ECIES-wrapped.
// C5/S2: removeMember sends key-rotation ONLY to remaining members, member-update to
// remaining + the removed member.

const wait = (ms = 300) => new Promise((r) => setTimeout(r, ms))
interface TestDoc { items: Record<string, { title: string }> }

const KEY_MATERIAL_MARKERS = ['spaceContentKey', 'spaceContentKeys', 'spaceCapabilitySigningKey', 'capability']

function inbox(messaging: InMemoryMessagingAdapter): MessageEnvelope[] {
  const captured: MessageEnvelope[] = []
  // Subscribe a capture-only listener (these recipients have no adapter of their own).
  messaging.onMessage((envelope) => {
    captured.push(envelope)
  })
  return captured
}

describe('Yjs key-rotation + invite wire form (C5/C6/S2)', () => {
  let alice: PublicIdentitySession, bob: PublicIdentitySession, carol: PublicIdentitySession
  let aliceMsg: InMemoryMessagingAdapter, bobMsg: InMemoryMessagingAdapter, carolMsg: InMemoryMessagingAdapter
  let aliceAdapter: YjsReplicationAdapter
  let bobInbox: MessageEnvelope[], carolInbox: MessageEnvelope[]

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
    bobInbox = inbox(bobMsg)
    carolInbox = inbox(carolMsg)
    aliceAdapter = new YjsReplicationAdapter({
      identity: alice,
      messaging: aliceMsg,
      brokerUrls: ['wss://broker.example.com'],
      keyManagement: new InMemoryKeyManagementAdapter(),
    })
    await aliceAdapter.start()
  })
  afterEach(async () => {
    await aliceAdapter.stop()
    InMemoryMessagingAdapter.resetAll()
    for (const id of [alice, bob, carol]) { try { await id.deleteStoredIdentity() } catch {} }
  })

  it('C6: space-invite payload is the ECIES container with no plaintext key material; body decrypts + validates', async () => {
    const space = await aliceAdapter.createSpace<TestDoc>('shared', { items: {} }, { name: 'S', members: [alice.getDid()] })
    await aliceAdapter.addMember(space.id, bob.getDid(), await bob.getEncryptionPublicKeyBytes())
    await wait()

    const invite = bobInbox.find((m) => m.type === 'space-invite')!
    expect(invite).toBeTruthy()
    // P1 container form: only ecies + optional encryptedDocSnapshot, no plaintext body.
    const container = JSON.parse(invite.payload)
    expect(Object.keys(container).sort()).toEqual(['ecies', 'encryptedDocSnapshot'])
    expect(container.ecies.ephemeralPublicKey).toBeTruthy()
    for (const marker of KEY_MATERIAL_MARKERS) expect(invite.payload).not.toContain(marker)

    // decrypt → spec body validates
    const bytes = await bob.decryptForMe({
      ciphertext: new Uint8Array(container.ecies.ciphertext),
      nonce: new Uint8Array(container.ecies.nonce),
      ephemeralPublicKey: new Uint8Array(container.ecies.ephemeralPublicKey),
    })
    const body = JSON.parse(new TextDecoder().decode(bytes))
    expect(() => assertSpaceInviteBody(body)).not.toThrow()
    expect(body.spaceId).toBe(space.id)
    expect(body.brokerUrls).toEqual(['wss://broker.example.com'])
  })

  it('C5 + S2 + C6: removeMember rotates to remaining only, member-updates everyone; key-rotation body is encrypted + valid', async () => {
    const space = await aliceAdapter.createSpace<TestDoc>('shared', { items: {} }, { name: 'S', members: [alice.getDid()] })
    await aliceAdapter.addMember(space.id, bob.getDid(), await bob.getEncryptionPublicKeyBytes())
    await aliceAdapter.addMember(space.id, carol.getDid(), await carol.getEncryptionPublicKeyBytes())
    await wait()
    bobInbox.length = 0
    carolInbox.length = 0

    await aliceAdapter.removeMember(space.id, carol.getDid())
    await wait()

    // C5: key-rotation reaches the remaining member (bob), NOT the removed member (carol).
    expect(bobInbox.some((m) => m.type === 'key-rotation')).toBe(true)
    expect(carolInbox.some((m) => m.type === 'key-rotation')).toBe(false)
    // S2: member-update reaches BOTH the remaining member and the removed member.
    expect(bobInbox.some((m) => m.type === 'member-update')).toBe(true)
    expect(carolInbox.some((m) => m.type === 'member-update')).toBe(true)

    // C6: the key-rotation payload to bob is the ECIES container, no plaintext key material.
    const rotation = bobInbox.find((m) => m.type === 'key-rotation')!
    const container = JSON.parse(rotation.payload)
    expect(Object.keys(container)).toEqual(['ecies'])
    for (const marker of KEY_MATERIAL_MARKERS) expect(rotation.payload).not.toContain(marker)

    const bytes = await bob.decryptForMe({
      ciphertext: new Uint8Array(container.ecies.ciphertext),
      nonce: new Uint8Array(container.ecies.nonce),
      ephemeralPublicKey: new Uint8Array(container.ecies.ephemeralPublicKey),
    })
    const body = JSON.parse(new TextDecoder().decode(bytes))
    expect(() => assertKeyRotationBody(body)).not.toThrow()
    expect(body.spaceId).toBe(space.id)
    expect(body.generation).toBe(1)
  })
})
