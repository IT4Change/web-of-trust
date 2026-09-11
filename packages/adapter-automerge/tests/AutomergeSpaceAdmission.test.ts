import { describe, it, expect, afterEach } from 'vitest'
import type { PublicIdentitySession } from '../../wot-core/src/application/identity'
import { createTestIdentity } from '../../wot-core/tests/helpers/identity-session'
import { InMemoryMessagingAdapter, InMemoryKeyManagementAdapter, InMemoryCompactStore, InMemorySpaceMetadataStorage } from '@web_of_trust/core/adapters'
import { compareAdmission } from '@web_of_trust/core/application'
import type { SpaceInfo } from '@web_of_trust/core/types'
import { AutomergeReplicationAdapter } from '../src/AutomergeReplicationAdapter'

// RLS-Spec 12 Regel 4 (Automerge-Spiegel): die Aufnahme-Kennung ist eine
// Projektion des _members-Event-Sets, nie ein gespeicherter Wert.
// BEKANNTE GRENZE dieses Adapters: beim Selbst-Verlassen schreibt er kein
// removed-Ereignis, eine erneute Aufnahme danach ist hier nicht erkennbar
// (siehe Kommentar an computeMembershipProjection).

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
})
