import { describe, it, expect, afterEach } from 'vitest'
import { createTestIdentity } from '../../wot-core/tests/helpers/identity-session'
import {
  InMemoryMessagingAdapter,
  InMemorySpaceMetadataStorage,
  InMemoryKeyManagementAdapter,
} from '@web_of_trust/core/adapters'
import { hasNamedRoots } from '@web_of_trust/core/application'
import { AutomergeReplicationAdapter } from '../src/AutomergeReplicationAdapter'
import { InMemoryRepoStorageAdapter } from '../src/InMemoryRepoStorageAdapter'

/**
 * Der Automerge-Adapter bietet NamedRootsCapable bewusst NICHT an. Automerge
 * kennt keinen benannten Wurzeltyp neben `data` — die Doc-Wurzel IST `data`.
 * Wurzeln muessten sich also einen Namensraum mit den App-Feldern teilen, und
 * die Zuordnung eines Speicherplatzes liesse sich nur noch am Zuschnitt der
 * Nutzdaten raten; ein Merge zweier Geraete kann so eine Heuristik aushebeln.
 * Lieber keine Capability als eine, die App-Daten umdeuten kann.
 *
 * Dieser Test haelt den fail-closed-Zustand fest: wer die Capability
 * nachruestet, muss ihn bewusst anfassen.
 */
describe('Automerge — NamedRootsCapable ist fail-closed', () => {
  const cleanup: Array<() => Promise<void>> = []
  afterEach(async () => {
    while (cleanup.length) await cleanup.pop()!().catch(() => {})
    InMemoryMessagingAdapter.resetAll()
  })

  it('hasNamedRoots ist false fuer ein Automerge-SpaceHandle', async () => {
    const { identity } = await createTestIdentity('am-named-roots-fail-closed')
    const messaging = new InMemoryMessagingAdapter()
    await messaging.connect(identity.getDid())
    const adapter = new AutomergeReplicationAdapter({
      identity,
      messaging,
      keyManagement: new InMemoryKeyManagementAdapter(),
      metadataStorage: new InMemorySpaceMetadataStorage(),
      repoStorage: new InMemoryRepoStorageAdapter(),
    })
    await adapter.start()
    const space = await adapter.createSpace<{ items: Record<string, unknown> }>('shared', { items: {} })
    const handle = await adapter.openSpace<{ items: Record<string, unknown> }>(space.id)
    cleanup.push(async () => { handle.close(); await adapter.stop(); await identity.deleteStoredIdentity() })

    expect(hasNamedRoots(handle)).toBe(false)
    // Keine der drei Methoden existiert — auch nicht halb.
    const probe = handle as unknown as Record<string, unknown>
    expect(probe.getRoot).toBeUndefined()
    expect(probe.transactRoot).toBeUndefined()
    expect(probe.transactRootDurable).toBeUndefined()
    // Der `data`-Pfad bleibt unveraendert nutzbar.
    handle.transact((doc) => { doc.items['a'] = { title: 'ok' } })
    expect((handle.getDoc().items['a'] as { title: string }).title).toBe('ok')
  })
})
