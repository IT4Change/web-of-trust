import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { resetYjsPersonalDoc } from '@web_of_trust/adapter-yjs'
import { startRelay, makeIdentity, wait, waitFor, testMode, type StartedRelay } from './harness'
import { makeYjsClient, type YjsClient } from './yjs-client'

// Feldbefund 2026-08-17 (RLS-Web-App, Space 01ed6f32…): der Admin-Self-Leave
// blieb dauerhaft in "staged but NOT yet enforced (target generation 1)" hängen,
// obwohl Relay UND Client längst auf Generation 1 standen und der
// PendingRemoval-Datensatz phase: "committed" trug. Offen war allein der
// admin-remove — dessen Reject kam ohne thid an (matchte keinen Waiter → Timeout),
// und der ungebundene catch im Workflow verkleidete das als Rotations-Fehler.
//
// Dieser Test fährt den KOMPLETTEN Self-Leave eines Admins über den echten Relay
// und verlangt den Endzustand an beiden Enden: Generation rotiert, Admin-Autorität
// zurückgegeben, lokales Staging abgebaut. Er ist damit das Deploy-Gate für
// PR #347: schlägt einer der drei Schritte fehl, bricht er — vorher gab es für
// den Self-Leave-Endzustand keinen E2E.
//
// Wie der bestehende removal-negative-Test ist er remote-DESTRUKTIV (echte
// space-rotate → bleibender Generationssprung), daher dieselbe Gate-Logik.
const describeDestructive = testMode.skipDestructiveRemote ? describe.skip : describe

interface TestDoc {
  items: Record<string, { title: string }>
}

describeDestructive('VE-T admin self-leave end-state — real gated relay', () => {
  let relay: StartedRelay
  const cleanup: Array<() => Promise<void>> = []

  beforeEach(async () => {
    relay = await startRelay()
  })

  afterEach(async () => {
    for (const stop of cleanup.splice(0)) await stop().catch(() => {})
    await relay?.stop()
    // The PersonalDoc is a module singleton (see withPersonalDoc) — reset it so
    // no state leaks into other suites in this worker.
    await resetYjsPersonalDoc().catch(() => {})
  })

  it('the departing admin rotates, hands back broker authority and clears its staging; the remaining member keeps the space', async () => {
    const antonId = await makeIdentity()
    const timoId = await makeIdentity()
    const anton: YjsClient = await makeYjsClient({ relay, identity: antonId, withPersonalDoc: true })
    cleanup.push(() => anton.stop().finally(() => antonId.deleteStoredIdentity().catch(() => {})))
    const timo: YjsClient = await makeYjsClient({ relay, identity: timoId })
    cleanup.push(() => timo.stop().finally(() => timoId.deleteStoredIdentity().catch(() => {})))

    // Anton creates the space (sole admin — the field constellation) and invites Timo.
    const space = await anton.adapter.createSpace<TestDoc>('shared', { items: {} }, { name: 'Self-Leave Space' })
    const spaceId = space.id
    await wait(250)
    await anton.adapter.addMember(spaceId, timoId.getDid(), await timoId.getEncryptionPublicKeyBytes())
    await wait(500)

    const antonHandle = await anton.adapter.openSpace<TestDoc>(spaceId)
    const timoHandle = await timo.adapter.openSpace<TestDoc>(spaceId)
    await wait(150)

    // A pre-leave write proves the space is live before the departure.
    antonHandle.transact((d) => { d.items['hello'] = { title: 'von Anton' } })
    expect(await waitFor(() => timoHandle.getDoc().items['hello']?.title === 'von Anton', { timeoutMs: 10_000 })).toBe(true)

    expect((await relay.getSpace(spaceId))?.generation ?? 0).toBe(0)
    expect(await relay.getSpaceAdmins(spaceId)).toContain(antonId.getDid())

    // The user flow under test: Anton leaves. leaveSpace drives the full
    // two-phase self-leave (rotate → commit → admin-remove → finalize) and MUST
    // resolve without RemovalPendingNotEnforcedError against a healthy relay.
    antonHandle.close()
    await anton.adapter.leaveSpace(spaceId)

    // End state at the RELAY: generation advanced, Anton's admin authority gone.
    expect(await waitFor(async () => (await relay.getSpace(spaceId))?.generation === 1, { timeoutMs: 10_000 })).toBe(true)
    expect(await waitFor(async () => !(await relay.getSpaceAdmins(spaceId)).includes(antonId.getDid()), { timeoutMs: 10_000 })).toBe(true)

    // End state at the CLIENT: no parked staging record survives the leave —
    // exactly the record that stayed behind forever in the field.
    expect(await anton.docLogStore.getPendingRemoval(spaceId, antonId.getDid())).toBeNull()

    timoHandle.close()
  })
})
