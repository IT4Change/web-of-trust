import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as Y from 'yjs'
import type { PublicIdentitySession } from '../../wot-core/src/application/identity'
import { createTestIdentity } from '../../wot-core/tests/helpers/identity-session'
import {
  InMemoryMessagingAdapter, InMemoryKeyManagementAdapter, InMemoryCompactStore,
  PersonalDocSpaceMetadataStorage,
} from '@web_of_trust/core/adapters'
import { isSameAdmission, compareAdmission, buildSpaceInviteBody, deliverInboxMessage } from '@web_of_trust/core/application'
import { WebCryptoProtocolCryptoAdapter } from '@web_of_trust/core/protocol-adapters'
import { SPACE_INVITE_MESSAGE_TYPE } from '@web_of_trust/core/protocol'
import type { IncomingSpaceInvite, SpaceInfo } from '@web_of_trust/core/types'
import { YjsReplicationAdapter } from '../src/YjsReplicationAdapter'

// RLS-Spec 12 Regel 4: jede Aufnahme in einen Space ist durch ihre Einladung
// identifiziert — hier durch die Schluesselgeneration, mit der aufgenommen
// wurde. Eine Entfernung rotiert (Sync 005), eine Wiederaufnahme traegt also
// zwingend eine hoehere Generation; eine blosse Rotation aendert nichts.

const wait = (ms = 300) => new Promise((r) => setTimeout(r, ms))
const BROKER_URLS = ['wss://broker.example.com']
const protocolCrypto = new WebCryptoProtocolCryptoAdapter()
interface TestDoc { items: Record<string, { title: string }> }

/**
 * Metadata im PersonalDoc — der ECHTE Serializer. Zwei Storages ueber demselben
 * Y.Doc modellieren zwei Geraete derselben Identitaet: was Geraet A schreibt,
 * liest Geraet B als KOPIE (keine geteilten Objektreferenzen wie beim
 * InMemory-Store).
 */
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

describe('Yjs Space-Admission (Aufnahme-Kennung)', () => {
  let alice: PublicIdentitySession, bob: PublicIdentitySession, carol: PublicIdentitySession
  let aliceMsg: InMemoryMessagingAdapter
  let aliceKeys: InMemoryKeyManagementAdapter
  let aliceAdapter: YjsReplicationAdapter
  const started: YjsReplicationAdapter[] = []

  function makeAdapter(identity: PublicIdentitySession, messaging: InMemoryMessagingAdapter, opts?: {
    keyManagement?: InMemoryKeyManagementAdapter
    metadataStorage?: PersonalDocSpaceMetadataStorage
    compactStore?: InMemoryCompactStore
  }): YjsReplicationAdapter {
    const adapter = new YjsReplicationAdapter({
      identity,
      messaging,
      brokerUrls: BROKER_URLS,
      keyManagement: opts?.keyManagement ?? new InMemoryKeyManagementAdapter(),
      metadataStorage: opts?.metadataStorage,
      compactStore: opts?.compactStore,
    })
    started.push(adapter)
    return adapter
  }

  /** Eine spec-konforme Einladung an bob, gebaut aus Alices aktuellem Key-Material. */
  async function sendInviteToBob(spaceId: string): Promise<void> {
    const body = await buildSpaceInviteBody({
      keyPort: aliceKeys, spaceId, recipientDid: bob.getDid(),
      brokerUrls: BROKER_URLS, adminDids: [alice.getDid()],
    })
    const envelope = await deliverInboxMessage({
      type: SPACE_INVITE_MESSAGE_TYPE,
      body: body as unknown as Record<string, unknown>,
      from: alice.getDid(),
      to: bob.getDid(),
      recipientEncryptionPublicKey: await bob.getEncryptionPublicKeyBytes(),
      sign: (input) => alice.signEd25519(input),
      crypto: protocolCrypto,
    })
    await aliceMsg.send(envelope)
  }

  /** Der geladene (In-RAM) Stand eines Space im Adapter. */
  function loadedInfo(adapter: YjsReplicationAdapter, spaceId: string): SpaceInfo {
    return (adapter as unknown as { spaces: Map<string, { info: SpaceInfo }> }).spaces.get(spaceId)!.info
  }

  beforeEach(async () => {
    InMemoryMessagingAdapter.resetAll()
    alice = (await createTestIdentity('alice-pass')).identity
    bob = (await createTestIdentity('bob-pass')).identity
    carol = (await createTestIdentity('carol-pass')).identity
    aliceMsg = new InMemoryMessagingAdapter()
    await aliceMsg.connect(alice.getDid())
    aliceKeys = new InMemoryKeyManagementAdapter()
    aliceAdapter = makeAdapter(alice, aliceMsg, { keyManagement: aliceKeys })
    await aliceAdapter.start()
  })

  afterEach(async () => {
    for (const adapter of started.splice(0)) { try { await adapter.stop() } catch {} }
    InMemoryMessagingAdapter.resetAll()
    for (const id of [alice, bob, carol]) { try { await id.deleteStoredIdentity() } catch {} }
  })

  it('Creator: Aufnahme mit der Genesis-Generation 0', async () => {
    const space = await aliceAdapter.createSpace<TestDoc>('shared', { items: {} }, { name: 'S', members: [alice.getDid()] })
    expect(space.admission).toEqual({ keyGeneration: 0 })
    expect((await aliceAdapter.getSpace(space.id))!.admission).toEqual({ keyGeneration: 0 })
  })

  it('Creator auf zwei Geräten (deterministischer privater Space): beide { keyGeneration: 0 }', async () => {
    // Zweites Geraet derselben Identitaet, eigene durable Stores — der Wert
    // haengt an der Generation, nicht an lokalem Schluessel- oder Zeitzustand.
    const deviceB = makeAdapter(alice, new InMemoryMessagingAdapter(), { keyManagement: new InMemoryKeyManagementAdapter() })
    await deviceB.start()
    const spaceA = await aliceAdapter.openOrCreateDeterministicPrivateSpace<TestDoc>({ items: {} }, { name: 'Privat', appTag: 'rls-private' })
    const spaceB = await deviceB.openOrCreateDeterministicPrivateSpace<TestDoc>({ items: {} }, { name: 'Privat', appTag: 'rls-private' })
    expect(spaceA.id).toBe(spaceB.id)
    expect(spaceA.admission).toEqual({ keyGeneration: 0 })
    expect(spaceB.admission).toEqual(spaceA.admission)
  })

  it('Einladung annehmen: IncomingSpaceInvite.admission == SpaceInfo.admission == Invite-Generation', async () => {
    const bobMsg = new InMemoryMessagingAdapter()
    await bobMsg.connect(bob.getDid())
    const receiver = makeAdapter(bob, bobMsg)
    await receiver.start()
    const events: IncomingSpaceInvite[] = []
    receiver.onSpaceInvite((invite) => events.push(invite))

    const space = await aliceAdapter.createSpace<TestDoc>('shared', { items: {} }, { name: 'Garten', members: [alice.getDid()] })
    await aliceAdapter.addMember(space.id, bob.getDid(), await bob.getEncryptionPublicKeyBytes())
    await wait()

    expect(events).toHaveLength(1)
    expect(events[0].admission).toEqual({ keyGeneration: 0 })
    expect((await receiver.getSpace(space.id))!.admission).toEqual(events[0].admission)
  })

  it('Entfernung + erneute Einladung: neue Kennung, echt größer als die alte', async () => {
    const bobMsg = new InMemoryMessagingAdapter()
    await bobMsg.connect(bob.getDid())
    const receiver = makeAdapter(bob, bobMsg)
    await receiver.start()
    const events: IncomingSpaceInvite[] = []
    receiver.onSpaceInvite((invite) => events.push(invite))

    const space = await aliceAdapter.createSpace<TestDoc>('shared', { items: {} }, { name: 'S', members: [alice.getDid()] })
    await aliceAdapter.addMember(space.id, bob.getDid(), await bob.getEncryptionPublicKeyBytes())
    await wait()
    const first = events[0].admission
    expect(first).toEqual({ keyGeneration: 0 })

    await aliceAdapter.removeMember(space.id, bob.getDid())
    await wait()
    await aliceAdapter.addMember(space.id, bob.getDid(), await bob.getEncryptionPublicKeyBytes())
    await wait()

    const second = events[events.length - 1].admission
    expect(isSameAdmission(first, second)).toBe(false)
    expect(compareAdmission(second, first)).toBeGreaterThan(0)
    expect((await receiver.getSpace(space.id))!.admission).toEqual(second)
  })

  it('Doppel-Einladung an ein bestehendes Mitglied (gleiche Generation) ist KEINE Wiederaufnahme', async () => {
    const bobMsg = new InMemoryMessagingAdapter()
    await bobMsg.connect(bob.getDid())
    const receiver = makeAdapter(bob, bobMsg)
    await receiver.start()

    const space = await aliceAdapter.createSpace<TestDoc>('shared', { items: {} }, { name: 'S', members: [alice.getDid()] })
    await aliceAdapter.addMember(space.id, bob.getDid(), await bob.getEncryptionPublicKeyBytes())
    await wait()
    const before = (await receiver.getSpace(space.id))!.admission!

    // Zweite Einladung ohne vorherige Entfernung: gleiche Generation.
    await sendInviteToBob(space.id)
    await wait()

    const after = (await receiver.getSpace(space.id))!.admission!
    expect(isSameAdmission(before, after)).toBe(true)
    expect(after).toEqual({ keyGeneration: 0 })
  })

  it('Rotation ohne Wiederaufnahme (anderes Mitglied entfernt) lässt die Kennung unverändert', async () => {
    const bobMsg = new InMemoryMessagingAdapter()
    await bobMsg.connect(bob.getDid())
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

  it('Metadata-Sync: ein Gerät, das die Wiederaufnahme-Einladung nie sah, übernimmt die neue Kennung ohne Neustart', async () => {
    // Zwei Geraete derselben DID ueber EINEM PersonalDoc (echter Serializer).
    const bobMetaDoc = new Y.Doc()
    const bobMsgA = new InMemoryMessagingAdapter()
    const bobMsgB = new InMemoryMessagingAdapter()
    await bobMsgA.connect(bob.getDid())
    await bobMsgB.connect(bob.getDid())
    const deviceA = makeAdapter(bob, bobMsgA, { metadataStorage: metadataInPersonalDoc(bobMetaDoc), compactStore: new InMemoryCompactStore() })
    const deviceB = makeAdapter(bob, bobMsgB, { metadataStorage: metadataInPersonalDoc(bobMetaDoc), compactStore: new InMemoryCompactStore() })
    await deviceA.start()
    await deviceB.start()

    const space = await aliceAdapter.createSpace<TestDoc>('shared', { items: {} }, { name: 'S', members: [alice.getDid()] })
    await aliceAdapter.addMember(space.id, bob.getDid(), await bob.getEncryptionPublicKeyBytes())
    await wait()
    expect(loadedInfo(deviceB, space.id).admission).toEqual({ keyGeneration: 0 })

    // Gerät B geht offline und verpasst Entfernung UND Wiederaufnahme.
    await bobMsgB.disconnect()
    await aliceAdapter.removeMember(space.id, bob.getDid())
    await wait()
    await aliceAdapter.addMember(space.id, bob.getDid(), await bob.getEncryptionPublicKeyBytes())
    await wait()
    const newAdmission = loadedInfo(deviceA, space.id).admission!
    expect(compareAdmission(newAdmission, { keyGeneration: 0 })).toBeGreaterThan(0)
    expect(loadedInfo(deviceB, space.id).admission).toEqual({ keyGeneration: 0 }) // noch der alte Stand

    // Der Metadata-Sync (kein Neustart) traegt die Kennung zu B.
    await deviceB.restoreSpacesFromMetadata()
    expect(loadedInfo(deviceB, space.id).admission).toEqual(newAdmission)
  })

  it('Monotonie: eine niedrigere Kennung aus der Metadata wird NICHT übernommen', async () => {
    const metaDoc = new Y.Doc()
    const storage = metadataInPersonalDoc(metaDoc)
    const adapter = makeAdapter(alice, aliceMsg, { keyManagement: aliceKeys, metadataStorage: storage, compactStore: new InMemoryCompactStore() })
    await adapter.start()
    const space = await adapter.createSpace<TestDoc>('shared', { items: {} }, { name: 'S' })
    await wait(100)

    // Der geladene Stand ist bereits eine Wiederaufnahme (Generation 2) …
    loadedInfo(adapter, space.id).admission = { keyGeneration: 2 }
    // … waehrend ein nachzuegelndes Geraet per LWW den alten Stand zurueckschreibt.
    const stale = (await storage.loadSpaceMetadata(space.id))!
    stale.info.admission = { keyGeneration: 0 }
    await storage.saveSpaceMetadata(stale)

    await adapter.restoreSpacesFromMetadata()
    expect(loadedInfo(adapter, space.id).admission).toEqual({ keyGeneration: 2 })
  })

  it('Bestand: Alt-Metadata ohne Kennung bleibt ohne Kennung; erst die Wiederaufnahme setzt sie', async () => {
    const bobMetaDoc = new Y.Doc()
    const bobMsg = new InMemoryMessagingAdapter()
    await bobMsg.connect(bob.getDid())
    const bobKeys = new InMemoryKeyManagementAdapter()
    const bobCompact = new InMemoryCompactStore()
    const bobStorage = metadataInPersonalDoc(bobMetaDoc)
    const receiver = makeAdapter(bob, bobMsg, { keyManagement: bobKeys, metadataStorage: bobStorage, compactStore: bobCompact })
    await receiver.start()

    const space = await aliceAdapter.createSpace<TestDoc>('shared', { items: {} }, { name: 'S', members: [alice.getDid()] })
    await aliceAdapter.addMember(space.id, bob.getDid(), await bob.getEncryptionPublicKeyBytes())
    await wait()
    await receiver.stop()

    // Bestand simulieren: Metadata aus der Zeit vor der Aufnahme-Kennung.
    const stored = (await bobStorage.loadSpaceMetadata(space.id))!
    delete stored.info.admission
    await bobStorage.saveSpaceMetadata(stored)
    expect((await bobStorage.loadSpaceMetadata(space.id))!.info.admission).toBeUndefined()

    const restarted = makeAdapter(bob, bobMsg, { keyManagement: bobKeys, metadataStorage: bobStorage, compactStore: bobCompact })
    await restarted.start()
    // Nichts leitet nachtraeglich ab — der Bestand gilt als freigegeben.
    expect((await restarted.getSpace(space.id))!.admission).toBeUndefined()

    // Erst eine neu angewandte Einladung erzeugt die Kennung.
    await sendInviteToBob(space.id)
    await wait()
    expect((await restarted.getSpace(space.id))!.admission).toEqual({ keyGeneration: 0 })
  })
})
