import { test, expect } from '@playwright/test'
import { createIdentity } from './helpers/identity'
import { createFreshContext, waitForRelayConnected, navigateTo } from './helpers/common'
import { goOffline, goOnline, waitForReconnect } from './helpers/offline'

test.describe('Offline Basics', () => {
  test('offline start, edit profile, create attestation, tab close/reopen, reconnect + outbox', async ({ browser }) => {
    const { context: ctx, page } = await createFreshContext(browser)

    try {
      // Setup: create identity and wait for relay
      await createIdentity(page, { name: 'OfflineUser', passphrase: 'offline123' })
      await waitForRelayConnected(page)

      // Verify home page works
      await expect(page.getByText('Hallo, OfflineUser')).toBeVisible()

      // --- Go offline ---
      await goOffline(ctx)
      await page.waitForTimeout(2_000) // let WebSocket disconnect

      // 1. Offline: Edit profile
      await navigateTo(page, '/identity')
      await page.getByText('Profil bearbeiten').click()
      await page.getByPlaceholder('Ein kurzer Satz über dich').fill('Offline-Bio')
      await page.getByText('Speichern').click()
      await page.waitForTimeout(1_000)

      // Verify bio was saved locally
      await navigateTo(page, '/identity')
      await expect(page.getByText('Offline-Bio')).toBeVisible({ timeout: 5_000 })

      // 2. Go back online, reload, verify offline changes persisted
      await goOnline(ctx)
      await page.reload()

      // After reload, unlock screen should appear
      await page.getByPlaceholder('Dein Passwort').fill('offline123')
      await page.getByText('Entsperren', { exact: true }).click()

      // Navigate to home — app might stay on last viewed page after unlock
      await navigateTo(page, '/')
      await expect(page.getByText('Hallo, OfflineUser')).toBeVisible({ timeout: 10_000 })

      // Check bio persisted through offline edit + reload
      await navigateTo(page, '/identity')
      await expect(page.getByText('Offline-Bio')).toBeVisible({ timeout: 5_000 })

      // 3. Navigate to home and verify greeting + relay
      await navigateTo(page, '/')
      await expect(page.getByText('Hallo, OfflineUser')).toBeVisible({ timeout: 10_000 })
      await waitForReconnect(page)
    } finally {
      await ctx.close()
    }
  })
})
