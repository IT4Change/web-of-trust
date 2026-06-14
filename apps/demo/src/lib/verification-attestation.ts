import type { Attestation } from '@web_of_trust/core/types'

/**
 * Display label of a live verification-attestation. Single source of truth for
 * the demo's UI-facing string (VE-7: the literal is an ANZEIGE-Label only,
 * never a discriminator).
 */
export const VERIFICATION_ATTESTATION_CLAIM = 'in-person verifiziert'

/**
 * Derived-form predicate (VE-7). The demo's `Attestation` is the derived wire
 * form and carries no `type` array, so the canonical WotVerification `type`
 * marker (protocol `isVerificationAttestation(payload)`) is not available here.
 * This predicate works on the derived `claim` + signed `vcJws`; the marker is
 * enforced at the protocol boundary where the VC payload is verified.
 *
 * Dependency-free on purpose (no React hooks) so composition-root code like
 * AdapterContext can reuse it without importing a hook module.
 */
export function isVerificationAttestation(attestation: Attestation): boolean {
  return attestation.claim === VERIFICATION_ATTESTATION_CLAIM && Boolean(attestation.vcJws)
}
