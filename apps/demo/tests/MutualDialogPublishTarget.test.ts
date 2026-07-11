/**
 * Publish-Ziel des Verbunden-Dialogs (Consent-Modell): der Dialog akzeptiert
 * beim „Veröffentlichen"-Klick die NEUESTE empfangene Verifikations-Attestation
 * des Peers — nie eine ältere, evtl. bewusst depublizierte (Codex-Delta-Review
 * zu #267, Blocker). Selektion lebt als pure Funktion in
 * lib/verification-attestation.ts (newestVerificationAttestationFrom) und ist
 * die einzige Quelle des Dialog-publishTarget (useMemo in App.tsx).
 */
import { describe, it, expect } from 'vitest'
import type { Attestation } from '@web_of_trust/core/types'
import { newestVerificationAttestationFrom } from '../src/lib/verification-attestation'

const MY_DID = 'did:key:z6MkMe'
const PEER_DID = 'did:key:z6MkPeer'
const OTHER_DID = 'did:key:z6MkOther'

function makeVerification(
  id: string,
  from: string,
  createdAt: string,
  options: { isVerification?: boolean } = {},
): Attestation {
  return {
    id,
    from,
    to: MY_DID,
    claim: 'in-person verifiziert',
    createdAt,
    vcJws: 'eyJhbGciOiJFZERTQSJ9.payload.signature',
    isVerification: options.isVerification ?? true,
  }
}

describe('newestVerificationAttestationFrom (Verbunden-Dialog publish target)', () => {
  it('Blocker-Szenario: publish click accepts ONLY the newest attestation — a deliberately depublished older one stays false', () => {
    // Ältere Verifikation: der User hat sie nach dem Publish bewusst wieder
    // depubliziert (accepted:false). Neuere: frische Re-Verifikation.
    const older = makeVerification('urn:uuid:ver-old', PEER_DID, '2026-07-01T10:00:00Z')
    const newer = makeVerification('urn:uuid:ver-new', PEER_DID, '2026-07-08T18:00:00Z')
    const accepted = new Map<string, boolean>([
      [older.id, false],
      [newer.id, false],
    ])

    // Unsortierte Liste (älteste zuerst) — genau der Fall, in dem ein blindes
    // find() die alte Attestation getroffen hätte.
    const target = newestVerificationAttestationFrom([older, newer], PEER_DID)

    // = „Veröffentlichen"-Klick im Dialog: nur das Ziel wird akzeptiert.
    expect(target).not.toBeNull()
    accepted.set(target!.id, true)

    expect(accepted.get(newer.id)).toBe(true)
    expect(accepted.get(older.id)).toBe(false)
  })

  it('picks the newest by createdAt regardless of array order', () => {
    const a = makeVerification('urn:uuid:ver-a', PEER_DID, '2026-07-03T09:00:00Z')
    const b = makeVerification('urn:uuid:ver-b', PEER_DID, '2026-07-07T09:00:00Z')
    const c = makeVerification('urn:uuid:ver-c', PEER_DID, '2026-07-05T09:00:00Z')

    expect(newestVerificationAttestationFrom([b, a, c], PEER_DID)?.id).toBe('urn:uuid:ver-b')
    expect(newestVerificationAttestationFrom([a, c, b], PEER_DID)?.id).toBe('urn:uuid:ver-b')
  })

  it('ignores other peers and non-verification attestations', () => {
    const otherPeer = makeVerification('urn:uuid:ver-other', OTHER_DID, '2026-07-09T09:00:00Z')
    const nonVerification = makeVerification('urn:uuid:att-generic', PEER_DID, '2026-07-09T10:00:00Z', {
      isVerification: false,
    })
    const match = makeVerification('urn:uuid:ver-match', PEER_DID, '2026-07-02T09:00:00Z')

    expect(
      newestVerificationAttestationFrom([otherPeer, nonVerification, match], PEER_DID)?.id,
    ).toBe('urn:uuid:ver-match')
  })

  it('returns null when the peer has no verification attestation (dialog renders no publish button)', () => {
    const nonVerification = makeVerification('urn:uuid:att-generic', PEER_DID, '2026-07-09T10:00:00Z', {
      isVerification: false,
    })

    expect(newestVerificationAttestationFrom([], PEER_DID)).toBeNull()
    expect(newestVerificationAttestationFrom([nonVerification], PEER_DID)).toBeNull()
  })
})
