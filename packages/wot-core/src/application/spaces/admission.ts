import type { SpaceAdmission } from '../../types/space'

/**
 * Vergleichs- und Ordnungsfunktionen ueber die Aufnahme-Kennung
 * (RLS-Spec 12 Regel 4). Die Kennung selbst ist die Schluesselgeneration, mit
 * der aufgenommen wurde — sie wird an ihren zwei Entstehungsorten direkt
 * gesetzt (Erstellen: 0, Einladung: `body.currentKeyGeneration`) und nie aus
 * lokalem Zustand abgeleitet.
 */

/** True, wenn beide Kennungen dieselbe Aufnahme bezeichnen (beide fehlend gilt als gleich). */
export function isSameAdmission(a: SpaceAdmission | null | undefined, b: SpaceAdmission | null | undefined): boolean {
  if (!a || !b) return !a && !b
  return a.keyGeneration === b.keyGeneration
}

/**
 * Ordnung ueber Aufnahme-Kennungen (aufsteigend nach Generation). Eine
 * Wiederaufnahme liegt stets hinter der vorherigen Aufnahme, weil die
 * Entfernung rotiert hat; damit ist die Ordnung zugleich das Monotonie-
 * Kriterium fuer die Uebernahme einer Kennung aus dem Metadata-Sync.
 */
export function compareAdmission(a: SpaceAdmission, b: SpaceAdmission): number {
  if (a.keyGeneration === b.keyGeneration) return 0
  return a.keyGeneration < b.keyGeneration ? -1 : 1
}
