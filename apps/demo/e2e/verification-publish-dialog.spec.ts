import { test, expect } from '@playwright/test'
import { createIdentity } from './helpers/identity'
import { createFreshContext, waitForRelayConnected, navigateTo } from './helpers/common'
import {
  getVerificationCode,
  submitVerificationCode,
  confirmVerificationInFlow,
  confirmIncomingVerification,
} from './helpers/verification'

const PROFILES_URL = process.env.E2E_PROFILES_URL ?? 'http://localhost:9788'

/** Anzahl Verifikationen auf dem /v des DIDs (JWS-Payload dekodiert); -1 = nie publiziert (404). */
async function verificationCountOnServer(did: string): Promise<number> {
  const res = await fetch(`${PROFILES_URL}/p/${encodeURIComponent(did)}/v`)
  if (res.status === 404) return -1
  const jws = await res.text()
  const parts = jws.split('.')
  if (parts.length < 2) throw new Error(`Unexpected /v body: ${jws.slice(0, 40)}`)
  const payload = JSON.parse(Buffer.from(parts[1]!, 'base64url').toString('utf8')) as {
    verifications?: unknown[]
  }
  return payload.verifications?.length ?? 0
}

/**
 * Regressionstest des Consent-Modells (Teil A, Antons Entscheidung): der
 * Verbunden-Dialog ist der Publish-Consent. „Veröffentlichen" (Primär) akzeptiert
 * die eigene empfangene Verifikations-Attestation und lädt sie DIREKT auf den
 * Profilserver (/v) — ohne weiteren Toggle. „Schließen" lässt accepted:false,
 * es wird nichts publiziert (Depublish-Semantik; nachholbar über die
 * Bestätigungen-Liste).
 *
 * Beweis: Bob klickt „Veröffentlichen" → sein öffentliches Profil zeigt
 * „Verbunden mit 1 Person" (aus seinem /v). Alice klickt „Schließen" → ihr /v
 * bleibt leer (direkter Fetch + JWS-Decode).
 */
test.describe('Verification publish dialog (Consent-Modell)', () => {
  test('publish button uploads the verification, close button leaves it unpublished', async ({ browser }) => {
    const { context: aliceCtx, page: alicePage } = await createFreshContext(browser)
    const { context: bobCtx, page: bobPage } = await createFreshContext(browser)

    try {
      const { did: aliceDid } = await createIdentity(alicePage, { name: 'Alice', passphrase: 'alice123pw' })
      const { did: bobDid } = await createIdentity(bobPage, { name: 'Bob', passphrase: 'bob12345pw' })

      await waitForRelayConnected(alicePage)
      await waitForRelayConnected(bobPage)

      // Gegenseitige Verifikation — granular statt performMutualVerification,
      // weil der Helper die Verbunden-Dialoge per X wegklickt und wir hier die
      // BUTTONS des Dialogs brauchen.
      const code = await getVerificationCode(alicePage)
      await submitVerificationCode(bobPage, code)
      await confirmVerificationInFlow(bobPage)
      await bobPage.getByText('Verbindung erfolgreich!').waitFor({ timeout: 10_000 })
      await confirmIncomingVerification(alicePage)

      // Beide Seiten sehen den Verbunden-Dialog.
      await alicePage.getByText('seid verbunden!').waitFor({ timeout: 20_000 })
      await bobPage.getByText('seid verbunden!').waitFor({ timeout: 20_000 })

      // Bob: „Veröffentlichen" → accepted + direkter Upload, Dialog schließt.
      await bobPage.getByRole('button', { name: 'Veröffentlichen' }).click()
      await expect(bobPage.getByText('seid verbunden!')).toBeHidden()

      // Alice: „Schließen" → nichts wird publiziert, Dialog schließt.
      // (exact: true — der X-Button heißt „Dialog schließen".)
      await alicePage.getByRole('button', { name: 'Schließen', exact: true }).click()
      await expect(alicePage.getByText('seid verbunden!')).toBeHidden()

      // Beweis auf dem Profilserver: Bobs öffentliches Profil zeigt Alices
      // Verifikation (aus Bobs /v) — OHNE dass irgendjemand die
      // Bestätigungen-Liste angefasst hat.
      await navigateTo(alicePage, `/p/${bobDid}`)
      await expect(alicePage.getByText('Verbunden mit 1 Person')).toBeVisible({ timeout: 15_000 })

      // Alices /v bleibt leer: „Schließen" hat accepted:false gelassen.
      // (-1 = /v nie publiziert; 0 = leer publiziert — beides korrekt.)
      expect(await verificationCountOnServer(aliceDid)).toBeLessThanOrEqual(0)
    } finally {
      await aliceCtx.close()
      await bobCtx.close()
    }
  })
})
