import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type { PublicIdentitySession } from '../../wot-core/src/application/identity'
import { createTestIdentity } from '../../wot-core/tests/helpers/identity-session'
import { InMemoryMessagingAdapter, InMemoryKeyManagementAdapter } from '@web_of_trust/core/adapters'
import { assertSpaceInviteBody, assertKeyRotationBody } from '@web_of_trust/core/protocol'
import { AutomergeReplicationAdapter } from '../src/AutomergeReplicationAdapter'
import type { MessageEnvelope } from '@web_of_trust/core/types'

// 1.B.3-key-rotation wire-form guarantees, Automerge variant. The invite container also
// carries a plaintext `documentUrl` (automerge-repo doc id — routing metadata, NOT key
// material), so the C6 check asserts "no key material leaks" rather than an exact key set.

const wait = (ms = 300) => new Promise((r) => setTimeout(r, ms))
interface TestDoc { items: Record<string, { title: string }> }
const KEY_MATERIAL_MARKERS = ['spaceContentKey', 'spaceContentKeys', 'spaceCapabilitySigningKey', 'capability']

function inbox(messaging: InMemoryMessagingAdapter): MessageEnvelope[] {
  const captured: MessageEnvelope[] = []
  messaging.onMessage((envelope) => { captured.push(envelope) })
  return captured
}

describe('Automerge key-rotation + invite wire form (C5/C6/S2)', () => {
  let alice: PublicIdentitySession, bob: PublicIdentitySession, carol: PublicIdentitySession
  let aliceMsg: InMemoryMessagingAdapter, bobMsg: InMemoryMessagingAdapter, carolMsg: InMemoryMessagingAdapter
  let aliceAdapter: AutomergeReplicationAdapter
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
    aliceAdapter = new AutomergeReplicationAdapter({
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

  it('C6: space-invite carries no plaintext key material; ECIES body decrypts + validates', async () => {
    const space = await aliceAdapter.createSpace<TestDoc>('shared', { items: {} }, { name: 'S', members: [alice.getDid()] })
    await aliceAdapter.addMember(space.id, bob.getDid(), await bob.getEncryptionPublicKeyBytes())
    await wait()

    const invite = bobInbox.find((m) => m.type === 'space-invite')!
    expect(invite).toBeTruthy()
    const container = JSON.parse(invite.payload)
    expect(container.ecies?.ephemeralPublicKey).toBeTruthy()
    for (const marker of KEY_MATERIAL_MARKERS) expect(invite.payload).not.toContain(marker)

    const bytes = await bob.decryptForMe({
      ciphertext: new Uint8Array(container.ecies.ciphertext),
      nonce: new Uint8Array(container.ecies.nonce),
      ephemeralPublicKey: new Uint8Array(container.ecies.ephemeralPublicKey),
    })
    const body = JSON.parse(new TextDecoder().decode(bytes))
    expect(() => assertSpaceInviteBody(body)).not.toThrow()
    expect(body.spaceId).toBe(space.id)
  })

  it('C5 + S2 + C6: removeMember rotates to remaining only, member-updates everyone; key-rotation body encrypted + valid', async () => {
    const space = await aliceAdapter.createSpace<TestDoc>('shared', { items: {} }, { name: 'S', members: [alice.getDid()] })
    await aliceAdapter.addMember(space.id, bob.getDid(), await bob.getEncryptionPublicKeyBytes())
    await aliceAdapter.addMember(space.id, carol.getDid(), await carol.getEncryptionPublicKeyBytes())
    await wait()
    bobInbox.length = 0
    carolInbox.length = 0

    await aliceAdapter.removeMember(space.id, carol.getDid())
    await wait()

    expect(bobInbox.some((m) => m.type === 'key-rotation')).toBe(true)
    expect(carolInbox.some((m) => m.type === 'key-rotation')).toBe(false) // C5: not to the removed member
    expect(bobInbox.some((m) => m.type === 'member-update')).toBe(true)
    expect(carolInbox.some((m) => m.type === 'member-update')).toBe(true) // S2: removed member still notified

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
    expect(body.generation).toBe(1)
  })
})
