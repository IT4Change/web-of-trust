import type {
  BrokerConfirmationBinding,
  PendingRemovalWriteExpectation,
} from '../../ports/DocLogStore'

/**
 * #366 — Die Materialbindung eines gestagten Removals, reduziert auf die Felder,
 * die BEIDE Store-Formen tragen (die In-Memory-Form und die base64-kodierte
 * IndexedDB-Form). So teilen sich beide Stores exakt eine Vergleichsregel.
 */
export interface StagingIdentity {
  stagingId?: string
  materialFingerprint?: string
  newGeneration: number
}

/**
 * Darf `removal` ueber `stored` geschrieben werden?
 *
 * `expect` weggelassen / `expectedStagingId: undefined` → unbedingt.
 * `null` → es darf noch kein Record existieren (Anlegen).
 * String → der gespeicherte Record MUSS genau diese stagingId tragen.
 *
 * Ein gespeicherter Record OHNE stagingId stammt aus der Zeit vor #366, traegt
 * also keine Identitaet, gegen die man pruefen koennte. Er erfuellt jede
 * Erwartung und wird vom ersten Lauf uebernommen (der ihm eine stagingId gibt);
 * ab da greift der Schutz. Das ist die ehrliche Grenze der Garantie.
 */
export function matchesStagingExpectation(
  stored: StagingIdentity | null | undefined,
  expect?: PendingRemovalWriteExpectation,
): boolean {
  if (!expect || expect.expectedStagingId === undefined) return true
  if (!stored) return expect.expectedStagingId === null
  if (stored.stagingId === undefined) return true
  return stored.stagingId === expect.expectedStagingId
}

/**
 * Gehoert eine Broker-Bestaetigung zum AKTUELL gespeicherten Material?
 *
 * Ohne `binding` (Test-/Migrationspfad) bleibt es beim alten, ungebundenen
 * Verhalten. Mit `binding` muessen stagingId, Generation UND Fingerprint
 * uebereinstimmen; ein Legacy-Record ohne diese Felder kann eine Bestaetigung
 * nicht decken und wird damit als ueberschrieben behandelt.
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
