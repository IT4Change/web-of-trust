import { test, expect, type Page } from '@playwright/test'
import { readFileSync } from 'fs'
import { createIdentity, unlockIdentity } from './helpers/identity'
import { createFreshContext, waitForRelayConnected, navigateTo } from './helpers/common'
import { performMutualVerification } from './helpers/verification'

// Dual-Broker Stage A (#251) — the camp scenario, end to end in the browser.
//
// Role mapping (see playwright.config.ts): this project's dev server runs with
// PRIMARY = relay 2 ("festival box", killable — no other spec uses it) and
// SECONDARY = the shared suite relay ("public server"). The spec proves the
// Stage A promise: when the box dies, an app that fans out over both brokers
// keeps working THROUGH the server — including a client that boots fresh with
// the primary already dead (start-anywhere), and delivery to a receiver whose
// primary is gone.
//
// The two documented Stage A limits are NOT bugs and NOT tested here: brokers
// never talk to each other (a single-homed receiver misses foreign-broker
// messages) and discovery stays single-homed until Stage A.2.

const STATE_FILE = '/tmp/wot-e2e-state.json'

/** Per-broker connection states via the D2 observability channel (primary first). */
async function brokerStates(page: Page): Promise<string[]> {
  return page.evaluate(async () => {
    const collect = (window as unknown as { __wotDebug?: () => Promise<{ brokerStates?: string[] }> }).__wotDebug
    if (typeof collect !== 'function') return []
    const snap = await collect()
    return snap.brokerStates ?? []
  })
}

/**
 * Hard-kill the primary relay's whole PROCESS GROUP. relay2 is spawned detached
 * (see global-setup) precisely so this reaches the node child behind the tsx
 * wrapper — SIGKILL is never forwarded, a plain kill(pid) would orphan the
 * actual server and it would keep serving the port.
 */
function killPrimaryRelay(): void {
  const state = JSON.parse(readFileSync(STATE_FILE, 'utf-8')) as { relay2Pid?: number }
  if (!state.relay2Pid) throw new Error('dual-broker spec: no relay2Pid in e2e state file')
  process.kill(-state.relay2Pid, 'SIGKILL')
}

test.describe('Dual-Broker Stage A — the box dies, the network survives', () => {
  test('fanout + delivery keep working over the secondary after the primary is killed', async ({ browser }) => {
    const { context: aliceCtx, page: alicePage } = await createFreshContext(browser)
    const { context: bobCtx, page: bobPage } = await createFreshContext(browser)

    try {
      await createIdentity(alicePage, { name: 'Alice', passphrase: 'alice123pw' })
      await createIdentity(bobPage, { name: 'Bob', passphrase: 'bob12345pw' })

      await waitForRelayConnected(alicePage)
      await waitForRelayConnected(bobPage)

      // Both clients hold BOTH brokers (I-START-ANYWHERE aggregate + per-child truth).
      await expect.poll(() => brokerStates(alicePage), { timeout: 15_000 }).toEqual(['connected', 'connected'])
      await expect.poll(() => brokerStates(bobPage), { timeout: 15_000 }).toEqual(['connected', 'connected'])

      // Contact prerequisite for attestations — established while both brokers live.
      await performMutualVerification(alicePage, bobPage)

      // ── The festival box dies. ──────────────────────────────────────────────
      killPrimaryRelay()

      // Both multiplexers notice the dead child; the aggregate stays connected
      // (the reconnect loop keeps redialing the primary — child state truth).
      for (const page of [alicePage, bobPage]) {
        await expect
          .poll(async () => (await brokerStates(page))[0], { timeout: 30_000 })
          .not.toBe('connected')
        expect((await brokerStates(page))[1]).toBe('connected')
      }

      // Bob restarts on the dead primary (start-anywhere): a fresh app boot must
      // settle on the surviving secondary instead of hanging on the first dial.
      await bobPage.reload()
      await unlockIdentity(bobPage, 'bob12345pw')
      await waitForRelayConnected(bobPage)
      const bobStatesAfterBoot = await brokerStates(bobPage)
      expect(bobStatesAfterBoot[1]).toBe('connected')
      expect(bobStatesAfterBoot[0]).not.toBe('connected')

      // Alice sends an attestation — the inbox fanout has only the secondary left.
      await navigateTo(alicePage, '/attestations/new')
      await alicePage.locator('select').selectOption({ label: 'Bob' })
      await alicePage.locator('textarea').fill('Hat die Box überlebt')
      await alicePage.getByRole('button', { name: 'Bestätigung erstellen' }).click()
      await alicePage.waitForURL('/attestations', { timeout: 10_000 })

      // Bob receives it — necessarily via the secondary; his primary is dead.
      await bobPage.getByText('Neue Bestätigung von').waitFor({ timeout: 30_000 })
      await expect(bobPage.getByText('Hat die Box überlebt')).toBeVisible()
      expect((await brokerStates(bobPage))[0]).not.toBe('connected')
    } finally {
      await aliceCtx.close()
      await bobCtx.close()
    }
  })
})
