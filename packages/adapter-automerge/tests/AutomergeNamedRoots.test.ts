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
import { hasNamedRoots } from '@web_of_trust/core/application'
import type { NamedRootsCapable, SpaceHandle } from '@web_of_trust/core'
import type { AppendLocalEntryParams } from '@web_of_trust/core/ports'
import { AutomergeReplicationAdapter } from '../src/AutomergeReplicationAdapter'
import { InMemoryRepoStorageAdapter } from '../src/InMemoryRepoStorageAdapter'

const wait = (ms = 150) => new Promise((r) => setTimeout(r, ms))
const BROKER_URLS = ['wss://broker.example.com']
const DEVICE_ALICE = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const DEVICE_BOB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

interface TestDoc {
  items: Record<string, { title: string }>
  shared?: Record<string, unknown>
}

type RootsHandle<T> = SpaceHandle<T> & NamedRootsCapable

/** Gate den durablen Log-Append EINES Docs (Muster aus DurableTransact.test.ts). */
function gateableStore(store: InMemoryDocLogStore) {
  const real = store.appendLocalEntry.bind(store)
  let armedFor: string | null = null
  let release: () => void = () => {}
  const gate = new Promise<void>((r) => { release = r })
  let gatedOnce = false
  store.appendLocalEntry = async (params: AppendLocalEntryParams) => {
    if (armedFor !== null && params.docId === armedFor && !gatedOnce) {
      gatedOnce = true
      await gate
    }
    return real(params)
  }
  return { arm: (docId: string) => { armedFor = docId }, release: () => release() }
}

describe('Automerge — benannte Wurzel-Maps je Space-Doc (NamedRootsCapable)', () => {
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
    alice = (await createTestIdentity('alice-am-roots')).identity
    bob = (await createTestIdentity('bob-am-roots')).identity
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
    await aliceAdapter.stop().catch(() => {})
    await bobAdapter.stop().catch(() => {})
    InMemoryMessagingAdapter.resetAll()
    try { await alice.deleteStoredIdentity() } catch {}
    try { await bob.deleteStoredIdentity() } catch {}
  })

  async function createSharedSpace(): Promise<string> {
    const space = await aliceAdapter.createSpace<TestDoc>('shared', { items: {} }, { name: 'Roots Space' })
    await wait()
    const bobEncKey = await bob.getEncryptionPublicKeyBytes()
    await aliceAdapter.addMember(space.id, bob.getDid(), bobEncKey)
    await wait(250)
    return space.id
  }

  it('das Space-Handle bietet die Capability an', async () => {
    const spaceId = await createSharedSpace()
    const handle = await aliceAdapter.openSpace<TestDoc>(spaceId)
    expect(hasNamedRoots(handle)).toBe(true)
    handle.close()
  })

  it('verletzte Namen werfen synchron', async () => {
    const spaceId = await createSharedSpace()
    const handle = await aliceAdapter.openSpace<TestDoc>(spaceId) as RootsHandle<TestDoc>
    for (const bad of ['data', '_meta', '_members', 'Profiles', '1x', 'a-b', '']) {
      expect(() => handle.getRoot(bad)).toThrow()
      expect(() => handle.transactRoot(bad, () => {})).toThrow()
      // synchron, damit ein try/catch um den Aufruf greift — nicht als Rejection
      expect(() => handle.transactRootDurable(bad, () => {})).toThrow()
    }
    handle.close()
  })

  // Fall 5: Kopie-Semantik + JSON-Werte
  it('getRoot ist leer, solange nie geschrieben wurde, und liefert eine Kopie', async () => {
    const spaceId = await createSharedSpace()
    const handle = await aliceAdapter.openSpace<TestDoc>(spaceId) as RootsHandle<TestDoc>
    expect(handle.getRoot('profiles')).toEqual({})

    handle.transactRoot('profiles', (root) => {
      ;(root as Record<string, unknown>).a = { deep: { list: [1, 2, 3] } }
    })
    const snap = handle.getRoot<{ a: { deep: { list: number[] } } }>('profiles')
    expect(snap).toEqual({ a: { deep: { list: [1, 2, 3] } } })
    snap.a.deep.list.push(4)
    expect(handle.getRoot<{ a: { deep: { list: number[] } } }>('profiles').a.deep.list).toEqual([1, 2, 3])
    handle.close()
  })

  it('undefined loescht wie delete', async () => {
    const spaceId = await createSharedSpace()
    const handle = await aliceAdapter.openSpace<TestDoc>(spaceId) as RootsHandle<TestDoc>
    handle.transactRoot('profiles', (root) => {
      ;(root as Record<string, unknown>).a = 1
      ;(root as Record<string, unknown>).b = 2
      ;(root as Record<string, unknown>).c = 3
    })
    handle.transactRoot('profiles', (root) => {
      ;(root as Record<string, unknown>).a = undefined
      delete (root as Record<string, unknown>).b
    })
    expect(handle.getRoot('profiles')).toEqual({ c: 3 })
    handle.close()
  })

  it('eine geworfene Zuweisung laesst KEINEN Teil-Patch zurueck (Atomaritaet)', async () => {
    const spaceId = await createSharedSpace()
    const handle = await aliceAdapter.openSpace<TestDoc>(spaceId) as RootsHandle<TestDoc>
    expect(() => handle.transactRoot('profiles', (root) => {
      ;(root as Record<string, unknown>).good = 1
      ;(root as Record<string, unknown>).bad = () => {}
    })).toThrow()
    expect(handle.getRoot('profiles')).toEqual({})
    expect(() => handle.transactRootDurable('profiles', (root) => {
      ;(root as Record<string, unknown>).good = 1
      ;(root as Record<string, unknown>).deep = { n: Infinity }
    })).toThrow()
    expect(handle.getRoot('profiles')).toEqual({})
    handle.close()
  })

  it('prototyp-vergiftende Schluessel werden abgelehnt — auch verschachtelt', async () => {
    const spaceId = await createSharedSpace()
    const handle = await aliceAdapter.openSpace<TestDoc>(spaceId) as RootsHandle<TestDoc>
    expect(() => handle.transactRoot('profiles', (root) => {
      ;(root as Record<string, unknown>)['__proto__'] = { hidden: 7 }
    })).toThrow(/__proto__/)
    expect(() => handle.transactRoot('profiles', (root) => {
      ;(root as Record<string, unknown>).a = JSON.parse('{"__proto__":{"hidden":7},"n":1}')
    })).toThrow(/__proto__/)
    expect(handle.getRoot('profiles')).toEqual({})
    handle.close()
  })

  it('ein aus dem Entwurf entkommener Wert kann das Doc nicht nachtraeglich veraendern', async () => {
    const spaceId = await createSharedSpace()
    const handle = await aliceAdapter.openSpace<TestDoc>(spaceId) as RootsHandle<TestDoc>
    let leaked: Record<string, unknown> | undefined
    handle.transactRoot('profiles', (root) => {
      const r = root as Record<string, unknown>
      r.a = { n: 1 }
      leaked = r.a as Record<string, unknown>
      expect(() => { (r.a as Record<string, unknown>).bad = () => {} }).toThrow()
    })
    expect(() => { leaked!.n = 2 }).toThrow()
    expect(handle.getRoot('profiles')).toEqual({ a: { n: 1 } })

    expect(() => handle.transactRoot('profiles', (root) => {
      Object.defineProperty(root, 'sneaky', { value: 1, configurable: true, enumerable: true })
    })).toThrow(/defineProperty/)
    expect(handle.getRoot('profiles')).toEqual({ a: { n: 1 } })
    handle.close()
  })

  it('sparse Arrays werden abgelehnt, statt als undefined zurueckzukommen', async () => {
    const spaceId = await createSharedSpace()
    const handle = await aliceAdapter.openSpace<TestDoc>(spaceId) as RootsHandle<TestDoc>
    expect(() => handle.transactRoot('profiles', (root) => {
      ;(root as Record<string, unknown>).a = Array(1)
    })).toThrow()
    expect(handle.getRoot('profiles')).toEqual({})
    handle.close()
  })

  it('ein fehlender Schluessel liest sich als undefined, nicht als null', async () => {
    const spaceId = await createSharedSpace()
    const handle = await aliceAdapter.openSpace<TestDoc>(spaceId) as RootsHandle<TestDoc>
    handle.transactRoot('profiles', (root) => {
      const r = root as Record<string, unknown>
      expect(r.absent).toBeUndefined()
      r.explicitNull = null
      expect(r.explicitNull).toBeNull()
    })
    expect(handle.getRoot('profiles')).toEqual({ explicitNull: null })
    handle.close()
  })

  it('ein festgehaltener Entwurf kann nach der Transaktion nicht mehr schreiben', async () => {
    const spaceId = await createSharedSpace()
    const handle = await aliceAdapter.openSpace<TestDoc>(spaceId) as RootsHandle<TestDoc>
    let escaped: Record<string, unknown> | undefined
    handle.transactRoot('profiles', (root) => {
      escaped = root as Record<string, unknown>
      ;(root as Record<string, unknown>).a = 1
    })
    expect(() => { escaped!.b = 2 }).toThrow()
    expect(handle.getRoot('profiles')).toEqual({ a: 1 })
    handle.close()
  })

  it('Wurzel-Schluessel tauchen NICHT in getDoc() auf', async () => {
    const spaceId = await createSharedSpace()
    const handle = await aliceAdapter.openSpace<TestDoc>(spaceId) as RootsHandle<TestDoc>
    handle.transactRoot('profiles', (root) => { (root as Record<string, unknown>)['a'] = 1 })
    const doc = handle.getDoc() as Record<string, unknown>
    expect(Object.keys(doc).some((k) => k.startsWith('__root:'))).toBe(false)
    expect(doc.items).toEqual({})
    handle.close()
  })

  it('ein gewoehnliches transact sieht die Wurzeln nicht und kann sie nicht loeschen', async () => {
    const spaceId = await createSharedSpace()
    const handle = await aliceAdapter.openSpace<TestDoc>(spaceId) as RootsHandle<TestDoc>
    handle.transactRoot('profiles', (root) => { (root as Record<string, unknown>)['alice'] = { n: 'A' } })
    handle.transact((doc) => { doc.items['task'] = { title: 't' } })

    // Die klassische Abgleich-Schleife: loesche alles, was nicht im Soll steht.
    const desired = handle.getDoc() as Record<string, unknown>
    handle.transact((doc) => {
      const d = doc as unknown as Record<string, unknown>
      expect(Object.keys(d).some((k) => k.startsWith('__root:'))).toBe(false)
      expect('__root:profiles:alice' in d).toBe(false)
      for (const key of Object.keys(d)) if (!(key in desired)) delete d[key]
    })
    expect(handle.getRoot('profiles')).toEqual({ alice: { n: 'A' } })

    // Direkte Zugriffe auf einen Wurzelschluessel werden laut abgelehnt.
    expect(() => handle.transact((doc) => {
      delete (doc as unknown as Record<string, unknown>)['__root:profiles:alice']
    })).toThrow(/named root/)
    expect(() => handle.transact((doc) => {
      ;(doc as unknown as Record<string, unknown>)['__root:profiles:alice'] = { n: 'X' }
    })).toThrow(/named root/)
    expect(handle.getRoot('profiles')).toEqual({ alice: { n: 'A' } })
    handle.close()
  })

  it('die Huelle laesst den data-Pfad unveraendert — auch Arrays und der durable Pfad', async () => {
    const spaceId = await createSharedSpace()
    const handle = await aliceAdapter.openSpace<TestDoc>(spaceId) as RootsHandle<TestDoc>
    handle.transactRoot('profiles', (root) => { (root as Record<string, unknown>)['alice'] = { n: 'A' } })

    // Verschachtelte Mutation und Array-Operationen durch die Huelle hindurch.
    handle.transact((doc) => { doc.items['a'] = { title: 'one' } })
    handle.transact((doc) => { doc.items['a'].title = 'two' })
    handle.transact((doc) => { (doc as unknown as { list?: string[] }).list = ['x'] })
    handle.transact((doc) => { (doc as unknown as { list: string[] }).list.push('y') })
    handle.transact((doc) => { (doc as unknown as { list: string[] }).list.splice(0, 1) })
    // Und derselbe Weg ueber den oeffentlichen durablen Pfad, mit vorhandener Wurzel.
    await handle.transactDurable((doc) => { doc.items['b'] = { title: 'durable' } })

    const doc = handle.getDoc() as TestDoc & { list: string[] }
    expect(doc.items['a'].title).toBe('two')
    expect(doc.items['b'].title).toBe('durable')
    expect(doc.list).toEqual(['y'])
    expect(Object.keys(doc).some((k) => k.startsWith('__root:'))).toBe(false)
    expect(handle.getRoot('profiles')).toEqual({ alice: { n: 'A' } })
    handle.close()
  })

  // Fall 2: der eigentliche Fehlerfall (rls#353)
  it('nebenlaeufige Erstanlage: beide Geraete behalten BEIDE Schluessel', async () => {
    const spaceId = await createSharedSpace()
    const aliceHandle = await aliceAdapter.openSpace<TestDoc>(spaceId) as RootsHandle<TestDoc>
    const bobHandle = await bobAdapter.openSpace<TestDoc>(spaceId) as RootsHandle<TestDoc>

    aliceHandle.transactRoot('profiles', (root) => { (root as Record<string, unknown>)['alice'] = { n: 'A' } })
    bobHandle.transactRoot('profiles', (root) => { (root as Record<string, unknown>)['bob'] = { n: 'B' } })

    await wait(250)
    await aliceAdapter.requestSync(spaceId)
    await bobAdapter.requestSync(spaceId)
    await wait(250)

    expect(aliceHandle.getRoot('profiles')).toEqual({ alice: { n: 'A' }, bob: { n: 'B' } })
    expect(bobHandle.getRoot('profiles')).toEqual({ alice: { n: 'A' }, bob: { n: 'B' } })
    aliceHandle.close(); bobHandle.close()
  })

  it('LWW auf demselben Schluessel verliert keinen ANDEREN Schluessel', async () => {
    const spaceId = await createSharedSpace()
    const aliceHandle = await aliceAdapter.openSpace<TestDoc>(spaceId) as RootsHandle<TestDoc>
    const bobHandle = await bobAdapter.openSpace<TestDoc>(spaceId) as RootsHandle<TestDoc>

    aliceHandle.transactRoot('profiles', (root) => { (root as Record<string, unknown>)['keep'] = 'alice-only' })
    await wait(250)
    await bobAdapter.requestSync(spaceId)
    await wait(250)

    aliceHandle.transactRoot('profiles', (root) => { (root as Record<string, unknown>)['contested'] = 'A' })
    bobHandle.transactRoot('profiles', (root) => { (root as Record<string, unknown>)['contested'] = 'B' })
    await wait(250)
    await aliceAdapter.requestSync(spaceId)
    await bobAdapter.requestSync(spaceId)
    await wait(250)

    const a = aliceHandle.getRoot<Record<string, string>>('profiles')
    const b = bobHandle.getRoot<Record<string, string>>('profiles')
    expect(a).toEqual(b)
    expect(a.keep).toBe('alice-only')
    expect(['A', 'B']).toContain(a.contested)
    aliceHandle.close(); bobHandle.close()
  })

  // Fall 4
  it('onRemoteUpdate feuert bei einer Wurzel-Aenderung des anderen Geraets', async () => {
    const spaceId = await createSharedSpace()
    const aliceHandle = await aliceAdapter.openSpace<TestDoc>(spaceId) as RootsHandle<TestDoc>
    const bobHandle = await bobAdapter.openSpace<TestDoc>(spaceId) as RootsHandle<TestDoc>

    let fired = 0
    const unsub = bobHandle.onRemoteUpdate(() => { fired += 1 })
    aliceHandle.transactRoot('profiles', (root) => { (root as Record<string, unknown>)['alice'] = 1 })
    await wait(400)

    expect(fired).toBeGreaterThan(0)
    expect(bobHandle.getRoot('profiles')).toEqual({ alice: 1 })
    unsub(); aliceHandle.close(); bobHandle.close()
  })

  it('transactRootDurable loest erst nach dem Log-Append auf', async () => {
    // Eigener Adapter mit gegateter Append-Funktion — die Wurzel-Variante muss
    // dieselbe transaktionsgebundene Durabilitaetszusage haben wie transactDurable.
    const messaging = new InMemoryMessagingAdapter({ broker, socketId: 'am-roots-durable' })
    await messaging.connect(alice.getDid())
    const docLogStore = new InMemoryDocLogStore()
    await docLogStore.init()
    await docLogStore.setDeviceId('dddddddd-dddd-4ddd-8ddd-dddddddddddd')
    const gate = gateableStore(docLogStore)
    const adapter = new AutomergeReplicationAdapter({
      identity: alice, messaging, brokerUrls: BROKER_URLS,
      keyManagement: new InMemoryKeyManagementAdapter(),
      metadataStorage: new InMemorySpaceMetadataStorage(),
      repoStorage: new InMemoryRepoStorageAdapter(),
      docLogStore, enableLogSync: true, deviceId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    })
    await adapter.start()
    const space = await adapter.createSpace<TestDoc>('shared', { items: {} }, { name: 'Durable Roots' })
    const handle = await adapter.openSpace<TestDoc>(space.id) as RootsHandle<TestDoc>

    gate.arm(space.id)
    let settled = false
    const durable = handle.transactRootDurable('profiles', (root) => {
      ;(root as Record<string, unknown>)['durable'] = { n: 1 }
    }).then(() => { settled = true })

    await wait(80)
    expect(settled).toBe(false)
    gate.release()
    await durable
    expect(settled).toBe(true)
    expect(handle.getRoot('profiles')).toEqual({ durable: { n: 1 } })
    await expect(handle.transactRootDurable('profiles', () => {})).resolves.toBeUndefined()
    handle.close()
    await adapter.stop()
  })
})
