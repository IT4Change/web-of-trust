import { describe, it, expect, afterEach } from 'vitest'
import type { PublicIdentitySession } from '../../wot-core/src/application/identity'
import { createTestIdentity } from '../../wot-core/tests/helpers/identity-session'
import { InMemoryMessagingAdapter, InMemoryKeyManagementAdapter, InMemoryCompactStore } from '@web_of_trust/core/adapters'
import type { SpaceInfo } from '@web_of_trust/core/types'
import { AutomergeReplicationAdapter } from '../src/AutomergeReplicationAdapter'
import { AutomergeSpaceMetadataStorage } from '../src/AutomergeSpaceMetadataStorage'

// RLS-Spec 12 Regel 4 (Automerge-Spiegel der Yjs-Tests): die Aufnahme-Kennung
// ist die Schluesselgeneration der Aufnahme; fuer bereits geladene Spaces
// uebernimmt sie der Metadata-Sync — monoton, nie abwaerts.

interface TestDoc { items: Record<string, { title: string }> }
const cleanups: Array<() => Promise<void>> = []

/** PersonalDoc-Backing wie im Betrieb: Lesen liefert eine Kopie, Schreiben ersetzt sie. */
function storageOverDoc(): AutomergeSpaceMetadataStorage {
  let doc: any = { spaces: {}, groupKeys: {}, capabilitySigningSeeds: {} }
  const read = () => JSON.parse(JSON.stringify(doc))
  return new AutomergeSpaceMetadataStorage({
    getPersonalDoc: read,
    changePersonalDoc: (fn) => { const s = read(); fn(s); doc = JSON.parse(JSON.stringify(s)); return doc },
  })
}

function loadedInfo(adapter: AutomergeReplicationAdapter, spaceId: string): SpaceInfo {
  return (adapter as unknown as { spaces: Map<string, { info: SpaceInfo }> }).spaces.get(spaceId)!.info
}

afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup()
  InMemoryMessagingAdapter.resetAll()
})

async function makePeer(passphrase: string, metadata: AutomergeSpaceMetadataStorage): Promise<{ identity: PublicIdentitySession; adapter: AutomergeReplicationAdapter }> {
  const identity = (await createTestIdentity(passphrase)).identity
  const messaging = new InMemoryMessagingAdapter()
  await messaging.connect(identity.getDid())
  const adapter = new AutomergeReplicationAdapter({
    identity,
    messaging,
    brokerUrls: ['wss://broker.example.com'],
    keyManagement: new InMemoryKeyManagementAdapter(),
    metadataStorage: metadata,
    compactStore: new InMemoryCompactStore(),
  })
  await adapter.start()
  cleanups.push(async () => {
    try { await adapter.stop() } catch {}
    try { await identity.deleteStoredIdentity() } catch {}
  })
  return { identity, adapter }
}

describe('Automerge Space-Admission (Aufnahme-Kennung)', () => {
  it('Creator: Aufnahme mit der Genesis-Generation 0', async () => {
    const { adapter } = await makePeer('am-adm-create', storageOverDoc())
    const space = await adapter.createSpace<TestDoc>('shared', { items: {} }, { name: 'S' })
    expect(space.admission).toEqual({ keyGeneration: 0 })
  })

  it('Metadata-Sync übernimmt eine höhere Kennung für einen bereits geladenen Space, eine niedrigere nicht', async () => {
    const metadata = storageOverDoc()
    const { adapter } = await makePeer('am-adm-sync', metadata)
    const space = await adapter.createSpace<TestDoc>('shared', { items: {} }, { name: 'S' })
    expect(loadedInfo(adapter, space.id).admission).toEqual({ keyGeneration: 0 })

    // Ein anderes Geraet derselben Identitaet hat die Wiederaufnahme erlebt und
    // seine Kennung in die geteilte Metadata geschrieben.
    const stored = (await metadata.loadSpaceMetadata(space.id))!
    stored.info.admission = { keyGeneration: 2 }
    await metadata.saveSpaceMetadata(stored)
    await adapter.restoreSpacesFromMetadata()
    expect(loadedInfo(adapter, space.id).admission).toEqual({ keyGeneration: 2 })

    // Monotonie: ein per LWW zurueckgeschriebener alter Stand dreht nichts zurueck.
    const stale = (await metadata.loadSpaceMetadata(space.id))!
    stale.info.admission = { keyGeneration: 1 }
    await metadata.saveSpaceMetadata(stale)
    await adapter.restoreSpacesFromMetadata()
    expect(loadedInfo(adapter, space.id).admission).toEqual({ keyGeneration: 2 })
  })

  it('Serializer-Roundtrip: Kennung überlebt, Bestand ohne Feld bleibt undefined', async () => {
    const storage = storageOverDoc()
    const base = { id: 's1', type: 'shared' as const, members: ['did:key:zAlice'], createdAt: '2026-01-01T00:00:00.000Z' }
    await storage.saveSpaceMetadata({ info: { ...base, admission: { keyGeneration: 4 } }, documentId: 'd1', documentUrl: 'automerge:d1', memberEncryptionKeys: {} })
    expect((await storage.loadSpaceMetadata('s1'))!.info.admission).toEqual({ keyGeneration: 4 })

    await storage.saveSpaceMetadata({ info: { ...base, id: 's2' }, documentId: 'd2', documentUrl: 'automerge:d2', memberEncryptionKeys: {} })
    expect((await storage.loadSpaceMetadata('s2'))!.info.admission).toBeUndefined()
  })
})
