import type { ProtocolCryptoAdapter } from '../../protocol/crypto/ports'
import type { KeyManagementPort } from '../../ports/key-management'
import type { SpaceAdmission } from '../../types/space'
import { bytesToHex } from '../../protocol/crypto/hex'

export interface DeriveAdmissionOptions {
  crypto: Pick<ProtocolCryptoAdapter, 'sha256'>
  keyPort: Pick<KeyManagementPort, 'getOwnCapability'>
  spaceId: string
  /** Generation der angewandten Einladung (beim Erstellen 0). */
  generation: number
}

/**
 * Leitet die Aufnahme-Kennung (RLS-Spec 12 Regel 4) aus der eigenen Capability
 * dieser Generation ab. Reine Funktion ueber den KeyManagementPort: keine
 * Schreibzugriffe, kein Adapter-Zustand. Ohne eigene Capability (Alt-Space,
 * Fremd-Generation) bleibt `capabilityId` null — die Generation allein ist dann
 * die schwaechere, aber gueltige Kennung.
 */
export async function deriveAdmission(options: DeriveAdmissionOptions): Promise<SpaceAdmission> {
  const { crypto, keyPort, spaceId, generation } = options
  const capabilityJws = await keyPort.getOwnCapability(spaceId, generation)
  if (!capabilityJws) return { keyGeneration: generation, capabilityId: null }
  const digest = await crypto.sha256(new TextEncoder().encode(capabilityJws))
  return { keyGeneration: generation, capabilityId: bytesToHex(digest) }
}

/** True, wenn beide Kennungen dieselbe Aufnahme bezeichnen (beide fehlend gilt als gleich). */
export function isSameAdmission(a: SpaceAdmission | null | undefined, b: SpaceAdmission | null | undefined): boolean {
  if (!a || !b) return !a && !b
  return a.keyGeneration === b.keyGeneration && a.capabilityId === b.capabilityId
}

/**
 * Ordnung ueber Aufnahme-Kennungen: erst `keyGeneration`, dann `capabilityId`
 * als String (null < String). Eine Wiederaufnahme liegt damit stets hinter der
 * vorherigen Aufnahme, solange die Generation gestiegen ist.
 */
export function compareAdmission(a: SpaceAdmission, b: SpaceAdmission): number {
  if (a.keyGeneration !== b.keyGeneration) return a.keyGeneration < b.keyGeneration ? -1 : 1
  if (a.capabilityId === b.capabilityId) return 0
  if (a.capabilityId === null) return -1
  if (b.capabilityId === null) return 1
  return a.capabilityId < b.capabilityId ? -1 : 1
}
