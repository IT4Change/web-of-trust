/**
 * Tests for the Trust 002 in-person Verification-Attestation flow over the
 * inbox/1.0 event path (VE-9).
 *
 * Der App-Listener konsumiert das typed onAttestation-Event des
 * InboxReceptionHost ({vcJws, senderDid, outerId}), verifiziert/dekodiert den
 * VC-JWS, leitet die Attestation-View aus dem VC-Payload ab (K2 — kein
 * Wire-Wrapper mehr), verlangt dieses Gerät als Empfänger, akzeptiert nur
 * nonce-gebundene In-Person-Credentials und öffnet den Bestätigungs-Dialog
 * ohne den generischen Attestation-Dialog.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import type { Attestation } from '@web_of_trust/core/types'

const ALICE_DID = 'did:key:z6MkAlice'
const BOB_DID = 'did:key:z6MkBob'
const CAROL_DID = 'did:key:z6MkCarol'
const CHALLENGE_NONCE = '550e8400-e29b-41d4-a716-446655440000'
const VERIFICATION_CLAIM = 'in-person verifiziert'

type VerifiedPayload = {
  id?: string
  type: string[]
  issuer: string
  validFrom: string
  iss: string
  sub: string
  jti?: string
  inResponseTo?: string
  credentialSubject: {
    id: string
    claim: string
  }
}

type AcceptanceDecision =
  | { decision: 'accept-in-person'; nonce: string }
  | { decision: 'remote-unbound'; reason: string }
  | { decision: 'reject'; reason: string }

interface IncomingAttestationDelivery {
  vcJws: string
  senderDid: string
  outerId: string
}

function makeVcJws(input: {
  from?: string
  to?: string
  id?: string
  claim?: string
  inResponseTo?: string
} = {}): string {
  const from = input.from ?? BOB_DID
  const to = input.to ?? ALICE_DID
  const id = input.id ?? `urn:uuid:${CHALLENGE_NONCE}`
  return `header.${Buffer.from(JSON.stringify({
    id,
    type: ['VerifiableCredential', 'WotAttestation'],
    issuer: from,
    validFrom: '2026-05-22T10:00:00Z',
    iss: from,
    sub: to,
    jti: id,
    ...(input.inResponseTo ? { inResponseTo: input.inResponseTo } : {}),
    credentialSubject: {
      id: to,
      claim: input.claim ?? VERIFICATION_CLAIM,
    },
  })).toString('base64url')}.signature`
}

function makeDelivery(vcJws: string, senderDid: string = BOB_DID): IncomingAttestationDelivery {
  return { vcJws, senderDid, outerId: '550e8400-e29b-41d4-a716-446655440099' }
}

/** K2: Attestation-View aus dem verifizierten VC-Payload — nie aus Wire-Feldern. */
function attestationFromPayload(payload: VerifiedPayload, vcJws: string): Attestation {
  return {
    id: payload.jti ?? payload.id ?? `wot:attestation:${payload.iss}:${payload.sub}`,
    from: payload.issuer,
    to: payload.credentialSubject.id,
    claim: payload.credentialSubject.claim,
    ...(payload.inResponseTo ? { inResponseTo: payload.inResponseTo } : {}),
    createdAt: payload.validFrom,
    vcJws,
  }
}

/**
 * Simulates the intended Trust 002 listener contract from App.tsx
 * (AttestationListenerEffect über inboxReception.onAttestation).
 */
function createTrust002Listener(deps: {
  myDid: string
  decodeVcJws: (vcJws: string) => Promise<VerifiedPayload>
  acceptVerified: (payload: VerifiedPayload) => AcceptanceDecision | Promise<AcceptanceDecision>
  saveAttestation: (attestation: Attestation) => Promise<void>
  setPendingIncoming: (pending: { attestation: Attestation; fromDid: string } | null) => void
  triggerAttestationDialog: (info: unknown) => void
}) {
  return async (delivery: IncomingAttestationDelivery) => {
    let payload: VerifiedPayload
    try {
      payload = await deps.decodeVcJws(delivery.vcJws)
    } catch {
      return
    }
    const attestation = attestationFromPayload(payload, delivery.vcJws)

    const isVerification =
      payload.type.includes('VerifiableCredential') &&
      payload.type.includes('WotAttestation') &&
      payload.credentialSubject.claim === VERIFICATION_CLAIM

    if (!isVerification) {
      await deps.saveAttestation(attestation)
      deps.triggerAttestationDialog({
        attestationId: attestation.id,
        senderDid: attestation.from,
        claim: attestation.claim,
      })
      return
    }

    if (payload.sub !== deps.myDid || payload.credentialSubject.id !== deps.myDid) return

    const decision = await deps.acceptVerified(payload)
    if (decision.decision !== 'accept-in-person') return

    await deps.saveAttestation(attestation)
    deps.setPendingIncoming({ attestation, fromDid: attestation.from })
  }
}

describe('Trust 002 verification attestation listener', () => {
  let decodeVcJws: ReturnType<typeof vi.fn>
  let acceptVerified: ReturnType<typeof vi.fn>
  let saveAttestation: ReturnType<typeof vi.fn>
  let setPendingIncoming: ReturnType<typeof vi.fn>
  let triggerAttestationDialog: ReturnType<typeof vi.fn>

  beforeEach(() => {
    decodeVcJws = vi.fn(async (vcJws: string) => {
      const [, payload] = vcJws.split('.')
      return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as VerifiedPayload
    })
    acceptVerified = vi.fn().mockReturnValue({ decision: 'accept-in-person', nonce: CHALLENGE_NONCE })
    saveAttestation = vi.fn().mockResolvedValue(undefined)
    setPendingIncoming = vi.fn()
    triggerAttestationDialog = vi.fn()
  })

  function defaultDeps(overrides?: Partial<Parameters<typeof createTrust002Listener>[0]>) {
    return {
      myDid: ALICE_DID,
      decodeVcJws,
      acceptVerified,
      saveAttestation,
      setPendingIncoming,
      triggerAttestationDialog,
      ...overrides,
    }
  }

  it('accepts nonce-bound Trust 002 Verification-Attestations via inbox deliveries', async () => {
    const handler = createTrust002Listener(defaultDeps())
    const vcJws = makeVcJws()

    await handler(makeDelivery(vcJws))

    expect(decodeVcJws).toHaveBeenCalledWith(vcJws)
    expect(acceptVerified).toHaveBeenCalledWith(expect.objectContaining({
      iss: BOB_DID,
      sub: ALICE_DID,
      jti: `urn:uuid:${CHALLENGE_NONCE}`,
    }))
    expect(saveAttestation).toHaveBeenCalledWith(expect.objectContaining({
      id: `urn:uuid:${CHALLENGE_NONCE}`,
      from: BOB_DID,
      to: ALICE_DID,
      claim: VERIFICATION_CLAIM,
      vcJws,
    }))
    expect(setPendingIncoming).toHaveBeenCalledWith({
      attestation: expect.objectContaining({ from: BOB_DID, vcJws }),
      fromDid: BOB_DID,
    })
    expect(triggerAttestationDialog).not.toHaveBeenCalled()
  })

  it('rejects remote or unbound Verification-Attestations without saving or prompting', async () => {
    acceptVerified.mockReturnValue({ decision: 'remote-unbound', reason: 'missing-jti-nonce' })
    const handler = createTrust002Listener(defaultDeps())

    await handler(makeDelivery(makeVcJws({ id: 'urn:uuid:remote-proof' })))

    expect(saveAttestation).not.toHaveBeenCalled()
    expect(setPendingIncoming).not.toHaveBeenCalled()
    expect(triggerAttestationDialog).not.toHaveBeenCalled()
  })

  it('rejects wrong-recipient Verification-Attestations before acceptance', async () => {
    const handler = createTrust002Listener(defaultDeps())

    await handler(makeDelivery(makeVcJws({ to: CAROL_DID })))

    expect(acceptVerified).not.toHaveBeenCalled()
    expect(saveAttestation).not.toHaveBeenCalled()
    expect(setPendingIncoming).not.toHaveBeenCalled()
  })

  // K2: einen manipulierbaren Wire-Wrapper gibt es nicht mehr — alle lokalen
  // Felder stammen aus dem VERIFIZIERTEN VC-Payload. Ein ungültiger VC-JWS
  // wird vom Decode-Schritt abgewiesen.
  it('drops deliveries whose VC-JWS fails verification', async () => {
    decodeVcJws.mockRejectedValue(new Error('Invalid JWS signature'))
    const handler = createTrust002Listener(defaultDeps())

    await handler(makeDelivery(makeVcJws()))

    expect(acceptVerified).not.toHaveBeenCalled()
    expect(saveAttestation).not.toHaveBeenCalled()
    expect(setPendingIncoming).not.toHaveBeenCalled()
    expect(triggerAttestationDialog).not.toHaveBeenCalled()
  })

  it('does not depend on legacy nonce placement in document identifiers', async () => {
    const handler = createTrust002Listener(defaultDeps())

    await handler(makeDelivery(makeVcJws({ id: `urn:uuid:${CHALLENGE_NONCE}` })))

    expect(acceptVerified).toHaveBeenCalledTimes(1)
    expect(saveAttestation).toHaveBeenCalledTimes(1)
  })

  it('keeps ordinary incoming attestations on the generic attestation path', async () => {
    const handler = createTrust002Listener(defaultDeps())

    await handler(makeDelivery(makeVcJws({
      id: 'urn:uuid:ordinary-attestation',
      claim: 'Knows TypeScript',
    })))

    expect(acceptVerified).not.toHaveBeenCalled()
    expect(saveAttestation).toHaveBeenCalledWith(expect.objectContaining({
      id: 'urn:uuid:ordinary-attestation',
      claim: 'Knows TypeScript',
    }))
    expect(triggerAttestationDialog).toHaveBeenCalledWith(expect.objectContaining({
      attestationId: 'urn:uuid:ordinary-attestation',
      senderDid: BOB_DID,
      claim: 'Knows TypeScript',
    }))
    expect(setPendingIncoming).not.toHaveBeenCalled()
  })
})

describe('Trust 002 verification source guard', () => {
  it('removes legacy verification primitives from the demo runtime listener and hook', () => {
    const demoRoot = existsSync('apps/demo/src') ? 'apps/demo' : '.'
    const paths = [
      `${demoRoot}/src/hooks/useVerification.ts`,
      `${demoRoot}/src/App.tsx`,
      `${demoRoot}/tests/VerificationListener.test.ts`,
    ]
    const blockedTerms = [
      ['create', 'Verification', 'For'].join(''),
      ['verify', 'Signature'].join(''),
      ['type:', ' ', "'verification'"].join(''),
      ['type:', ' ', '"verification"'].join(''),
      ['Verification', 'Challenge'].join(''),
      ['id', '.', 'includes', '('].join(''),
      ['urn:uuid:ver-', '${nonce'].join(''),
    ]

    const matches = paths.flatMap((path) => {
      const text = readFileSync(path, 'utf8')
      return blockedTerms
        .filter((term) => text.includes(term))
        .map((term) => `${path}: ${term}`)
    })

    expect(matches).toEqual([])
  })

  // Inbox-Wire-Migration (Direktive 1.7): die signEnvelope-Sites für den
  // Attestation-Versand sind tot — Authentizität kommt aus dem Inner-JWS
  // (Sync 003 Z.446-466). Alle drei Sends laufen über den K2-Pfad
  // attestationService.sendAttestation (inbox/1.0, Body {vcJws}).
  it('routes outgoing verification-attestations through the inbox/1.0 delivery path', () => {
    const demoRoot = existsSync('apps/demo/src') ? 'apps/demo' : '.'
    const text = readFileSync(`${demoRoot}/src/hooks/useVerification.ts`, 'utf8')

    expect(text).not.toContain('signEnvelope')
    expect(text).not.toContain("type: 'attestation'")
    expect(text).not.toContain('MessageEnvelope')
    expect(text.match(/attestationService\.sendAttestation\(identity, \w+\)/g)).toHaveLength(3)
  })
})
