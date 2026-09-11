import type {
  BrokerConfirmationBinding,
  PendingRemoval,
  PendingRemovalWriteExpectation,
} from '../../ports/DocLogStore'
import { stagedMaterialKey } from '../../ports/DocLogStore'

/**
 * #366 — Die Staging-Identitaet eines Records, reduziert auf die Felder, die
 * BEIDE Store-Formen ohne Dekodierung tragen (die In-Memory-Form und die
 * base64-kodierte IndexedDB-Form). Genug fuer die Bestaetigungsbindung.
 */
export interface StagingIdentity {
  stagingId?: string
  materialFingerprint?: string
  newGeneration: number
}

/**
 * Darf `removal` ueber `stored` geschrieben werden?
 *
 * Ohne `expect` unbedingt (Test-/Seed-Pfad). Sonst entscheidet ausschliesslich
 * die explizit genannte Form — es gibt keinen Zustand mehr, der jede Erwartung
 * erfuellt:
 *
 *  - `absent`  — nur wenn gar kein Record da ist.
 *  - `legacy`  — nur ueber GENAU den unveraenderten Record ohne Staging-Identitaet,
 *    den der Aufrufer gelesen hat. Hat ihn inzwischen jemand migriert (dann
 *    traegt er eine stagingId) oder ersetzt (andere Generation / anderes
 *    Material), ist das ein Konflikt. Ohne diese Pruefung koennte ein Aufrufer,
 *    der lange vor seinem Migrations-Write gelesen hat, ein inzwischen
 *    bestaetigtes Staging mit seinem alten Snapshot ueberschreiben.
 *  - `staging` — nur ueber den Record mit genau dieser stagingId.
 */
export function matchesStagingExpectation(
  stored: PendingRemoval | null | undefined,
  expect?: PendingRemovalWriteExpectation,
): boolean {
  if (!expect) return true
  if (!stored) return expect.kind === 'absent'
  switch (expect.kind) {
    case 'absent':
      return false
    case 'staging':
      return stored.stagingId === expect.stagingId
    case 'legacy':
      return (
        stored.stagingId === undefined &&
        stored.newGeneration === expect.newGeneration &&
        stored.materialFingerprint === expect.materialFingerprint &&
        stagedMaterialKey(stored.stagedKeyMaterial) === expect.material
      )
  }
}

/**
 * Gehoert eine Broker-Bestaetigung zum AKTUELL gespeicherten Material?
 *
 * Ohne `binding` (Test-/Seed-Pfad) bleibt es beim alten, ungebundenen Verhalten.
 * Mit `binding` muessen stagingId, Generation UND Fingerprint uebereinstimmen;
 * ein Legacy-Record ohne diese Felder kann eine Bestaetigung nicht decken und
 * wird damit als ueberschrieben behandelt.
 */
export function matchesConfirmationBinding(
  stored: StagingIdentity,
  binding?: BrokerConfirmationBinding,
): boolean {
  if (!binding) return true
  return (
    stored.stagingId === binding.stagingId &&
    stored.materialFingerprint === binding.materialFingerprint &&
    stored.newGeneration === binding.newGeneration
  )
}
