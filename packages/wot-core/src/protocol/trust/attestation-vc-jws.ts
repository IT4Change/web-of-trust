import type { ProtocolCryptoAdapter } from '../crypto/ports'
import type { DidDocument, DidResolver } from '../identity/did-document'
import { createDidKeyResolver, didOrKidToDid, ed25519MultibaseToPublicKeyBytes } from '../identity/did-key'
import type { JcsEd25519SignFn } from '../crypto/jws'
import { createJcsEd25519Jws, createJcsEd25519JwsWithSigner, decodeJws } from '../crypto/jws'
import type { JsonValue } from '../crypto/jcs'

const VC_CONTEXT = 'https://www.w3.org/ns/credentials/v2'
const WOT_CONTEXT = 'https://web-of-trust.de/vocab/v1'
const VERIFIABLE_CREDENTIAL_TYPE = 'VerifiableCredential'
const WOT_ATTESTATION_TYPE = 'WotAttestation'

/**
 * Type marker (Trust 002 / wot-spec #101) that distinguishes a live
 * verification-attestation (`/v`) from an ordinary attestation (`/a`).
 *
 * Disjoint split is driven by THIS `type` entry — never by the human-readable
 * `credentialSubject.claim` label (which stays purely for display).
 */
export const WOT_VERIFICATION_TYPE = 'WotVerification'

/**
 * Clock-skew tolerance for the attestation-VC time gate (nbf/exp), mirroring
 * INBOX_INNER_JWS_DEFAULT_MAX_CLOCK_SKEW_MS by design: the inner VC gate must
 * not be stricter than the outer inbox-envelope gate that already accepted the
 * message. Without this, a receiver whose clock lags a few seconds ACKs an
 * attestation at the envelope layer and then silently drops it here as "not yet
 * valid" (camp bug, 2026-07-07).
 */
export const ATTESTATION_DEFAULT_MAX_CLOCK_SKEW_MS = 5 * 60 * 1000
const RFC3339_WHOLE_SECOND_DATE_TIME_WITH_ZONE = /^(\d{4})-(\d{2})-(\d{2})[Tt](\d{2}):(\d{2}):(\d{2})([Zz]|([+-])(\d{2}):(\d{2}))$/

export interface AttestationVcPayload {
  '@context': string[]
  id?: string
  type: string[]
  issuer: string
  credentialSubject: { id: string; claim: string; [key: string]: unknown }
  validFrom: string
  validUntil?: string
  iss: string
  sub: string
  nbf: number
  jti?: string
  inResponseTo?: string
  iat?: number
  exp?: number
  [key: string]: unknown
}

/**
 * Central, type-based predicate for verification-attestations (VE-7).
 *
 * The single source of truth for the `/v` ÷ `/a` split: a payload is a
 * verification-attestation iff its `type` array carries `WotVerification`
 * (Trust 002 / wot-spec #101). Callers MUST NOT discriminate on the German
 * `credentialSubject.claim` label any more — it is display-only.
 */
export function isVerificationAttestation(payload: AttestationVcPayload): boolean {
  return Array.isArray(payload.type) && payload.type.includes(WOT_VERIFICATION_TYPE)
}

/**
 * Re-derive the type-borne verification marker from a stored compact VC-JWS.
 *
 * Decodes (does NOT re-verify — the stored vcJws is already trusted) the
 * payload and reports whether its `type` array carries `WotVerification`.
 * Returns false on any malformed input.
 *
 * Use this when only the persisted `vcJws` is available — e.g. reconstructing
 * a derived `Attestation` from storage — so the verification classification is
 * a pure function of the signed VC and never depends on a separately persisted
 * (and thus loseable) flag.
 */
export function isVerificationVcJws(vcJws: string): boolean {
  try {
    const { payload } = decodeJws<Record<string, unknown>, AttestationVcPayload>(vcJws)
    return isVerificationAttestation(payload)
  } catch {
    return false
  }
}

export interface CreateAttestationVcJwsOptions {
  payload: AttestationVcPayload
  kid: string
  signingSeed: Uint8Array
}

export interface CreateAttestationVcJwsWithSignerOptions {
  payload: AttestationVcPayload
  kid: string
  sign: JcsEd25519SignFn
}

export interface VerifyAttestationVcJwsOptions {
  crypto: ProtocolCryptoAdapter
  didResolver?: DidResolver
  now?: Date
  /**
   * Clock-skew tolerance for the nbf/exp time gate. Defaults to
   * ATTESTATION_DEFAULT_MAX_CLOCK_SKEW_MS (mirrors the inbox-envelope gate).
   */
  maxClockSkewMs?: number
}

export interface AssertAttestationVcPayloadOptions {
  now?: Date
  requireIssuerKidBinding?: boolean
  /**
   * Clock-skew tolerance for the nbf/exp time gate. Defaults to
   * ATTESTATION_DEFAULT_MAX_CLOCK_SKEW_MS (mirrors the inbox-envelope gate).
   */
  maxClockSkewMs?: number
}

export async function createAttestationVcJws(options: CreateAttestationVcJwsOptions): Promise<string> {
  return createJcsEd25519Jws(
    { alg: 'EdDSA', kid: options.kid, typ: 'vc+jwt' },
    options.payload as unknown as JsonValue,
    options.signingSeed,
  )
}

export async function createAttestationVcJwsWithSigner(
  options: CreateAttestationVcJwsWithSignerOptions,
): Promise<string> {
  return createJcsEd25519JwsWithSigner(
    { alg: 'EdDSA', kid: options.kid, typ: 'vc+jwt' },
    options.payload as unknown as JsonValue,
    options.sign,
  )
}

export async function verifyAttestationVcJws(
  jws: string,
  options: VerifyAttestationVcJwsOptions,
): Promise<AttestationVcPayload> {
  const decoded = decodeJws(jws)
  assertRecord(decoded.header, 'Invalid JWS header')
  if (decoded.header.alg !== 'EdDSA') throw new Error('Unsupported JWS alg')
  assertNonEmptyKid(decoded.header.kid)
  const kid = decoded.header.kid
  const publicKey = await resolveAssertionMethodPublicKey(kid, options.didResolver ?? createDidKeyResolver())
  const valid = await options.crypto.verifyEd25519(
    decoded.signingInput,
    decoded.signature,
    publicKey,
  )
  if (!valid) throw new Error('Invalid JWS signature')
  const payload = decoded.payload
  const jwsHeader = decoded.header as { typ?: string }
  if (jwsHeader.typ !== 'vc+jwt') throw new Error('Invalid attestation JWS typ')
  assertAttestationVcPayload(payload, kid, { now: options.now, maxClockSkewMs: options.maxClockSkewMs })
  return payload
}

export function assertAttestationVcPayload(
  payload: unknown,
  kid: string,
  options: AssertAttestationVcPayloadOptions = {},
): asserts payload is AttestationVcPayload {
  assertRecord(payload, 'Invalid attestation payload')
  const now = options.now ?? new Date()
  const requireIssuerKidBinding = options.requireIssuerKidBinding ?? true

  // Trust 001 "Pflichtfelder" requires both the W3C VC 2.0 context and the WoT vocab context.
  assertStringArray(payload['@context'], 'Invalid attestation @context')
  if (!payload['@context'].includes(VC_CONTEXT)) throw new Error('Missing VC context')
  if (!payload['@context'].includes(WOT_CONTEXT)) throw new Error('Missing WoT context')

  // Trust 001 "Pflichtfelder" requires VerifiableCredential plus WotAttestation type membership.
  assertStringArray(payload.type, 'Invalid attestation type')
  if (!payload.type.includes(VERIFIABLE_CREDENTIAL_TYPE)) throw new Error('Missing VerifiableCredential type')
  if (!payload.type.includes(WOT_ATTESTATION_TYPE)) throw new Error('Missing WotAttestation type')

  // Trust 001 "Verifikation" requires issuer/iss consistency and binds iss to the protected-header kid DID.
  if (typeof payload.issuer !== 'string' || payload.issuer.length === 0) {
    throw new Error('Missing attestation issuer')
  }
  if (typeof payload.iss !== 'string' || payload.iss.length === 0) throw new Error('Missing attestation iss')
  if (payload.issuer !== payload.iss) throw new Error('Attestation issuer and iss differ')
  if (requireIssuerKidBinding && payload.iss !== didOrKidToDid(kid)) {
    throw new Error('Attestation iss does not match kid DID')
  }

  // Trust 001 "Pflichtfelder" and JWT mapping require credentialSubject.id/sub consistency plus a claim.
  assertRecord(payload.credentialSubject, 'Invalid attestation credentialSubject')
  if (typeof payload.credentialSubject.id !== 'string' || payload.credentialSubject.id.length === 0) {
    throw new Error('Missing credentialSubject id')
  }
  if (typeof payload.credentialSubject.claim !== 'string' || payload.credentialSubject.claim.length === 0) {
    throw new Error('Missing credentialSubject claim')
  }
  if (typeof payload.sub !== 'string' || payload.sub.length === 0) throw new Error('Missing attestation sub')
  if (payload.credentialSubject.id !== payload.sub) throw new Error('Attestation subject mismatch')

  // Trust 001 maps validFrom to integer-second nbf; validFrom must include an explicit zone.
  if (typeof payload.validFrom !== 'string' || payload.validFrom.length === 0) {
    throw new Error('Missing attestation validFrom')
  }
  const validFromSeconds = isoDateTimeSeconds(payload.validFrom, 'Invalid attestation validFrom')
  const nbf = integerSeconds(payload.nbf, 'Invalid attestation nbf')
  if (validFromSeconds !== nbf) throw new Error('Attestation validFrom and nbf differ')

  if (payload.validUntil !== undefined) {
    if (typeof payload.validUntil !== 'string' || payload.validUntil.length === 0) {
      throw new Error('Invalid attestation validUntil')
    }
    const validUntilSeconds = isoDateTimeSeconds(payload.validUntil, 'Invalid attestation validUntil')
    if (payload.exp === undefined) throw new Error('Attestation validUntil requires exp')
    const exp = integerSeconds(payload.exp, 'Invalid attestation exp')
    if (validUntilSeconds !== exp) throw new Error('Attestation validUntil and exp differ')
  } else if (payload.exp !== undefined) {
    throw new Error('Attestation exp requires validUntil')
  }

  const nowSeconds = Math.floor(now.getTime() / 1000)
  if (!Number.isFinite(nowSeconds)) throw new Error('Invalid attestation verification time')
  // Fail closed on an invalid skew configuration: NaN would make both time
  // comparisons below always-false (NaN compares false) and Infinity would
  // swallow any nbf/exp — either silently disables the gate. An invalid
  // security config must throw, never quietly degrade to the default.
  if (
    options.maxClockSkewMs !== undefined &&
    !(Number.isFinite(options.maxClockSkewMs) && options.maxClockSkewMs >= 0)
  ) {
    throw new Error('Invalid attestation maxClockSkewMs')
  }
  // Clock-skew tolerance, symmetric on both edges. The inner VC gate must not be
  // stricter than the outer inbox-envelope gate (INBOX_INNER_JWS_DEFAULT_MAX_CLOCK_SKEW_MS)
  // that already accepted the message: a receiver whose clock lags a few seconds
  // would otherwise ACK the attestation and then silently drop it as "not yet
  // valid" (camp bug, 2026-07-07). The upper edge (exp) gets the same grace so a
  // slightly-fast receiver clock does not falsely expire a still-valid credential.
  const skewSeconds = Math.ceil((options.maxClockSkewMs ?? ATTESTATION_DEFAULT_MAX_CLOCK_SKEW_MS) / 1000)
  if (nbf > nowSeconds + skewSeconds) throw new Error('Attestation not yet valid')
  if (payload.exp !== undefined && integerSeconds(payload.exp, 'Invalid attestation exp') <= nowSeconds - skewSeconds) {
    throw new Error('Attestation expired')
  }
}

function assertNonEmptyKid(kid: unknown): asserts kid is string {
  if (typeof kid !== 'string' || kid.length === 0) throw new Error('Missing JWS kid')
}

function assertRecord(value: unknown, message: string): asserts value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(message)
}

function assertStringArray(value: unknown, message: string): asserts value is string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) throw new Error(message)
}

async function resolveAssertionMethodPublicKey(kid: string, didResolver: DidResolver): Promise<Uint8Array> {
  const did = didOrKidToDid(kid)
  const didDocument = await didResolver.resolve(did)
  if (!didDocument) throw new Error('Unable to resolve attestation issuer DID')
  assertResolvedDidDocument(didDocument, did)

  if (!didDocument.assertionMethod.some((methodId) => methodIdMatchesKid(methodId, did, kid))) {
    throw new Error('Attestation kid is not authorized for assertionMethod')
  }

  const verificationMethod = didDocument.verificationMethod.find((method) => methodIdMatchesKid(method.id, did, kid))
  if (!verificationMethod) throw new Error('Unable to resolve attestation verification method')
  return ed25519MultibaseToPublicKeyBytes(verificationMethod.publicKeyMultibase)
}

function assertResolvedDidDocument(value: unknown, expectedDid: string): asserts value is DidDocument {
  assertRecord(value, 'Invalid resolved attestation DID document')
  if (value.id !== expectedDid) throw new Error('Resolved attestation DID document id does not match resolved DID')
  assertVerificationMethods(value.verificationMethod, 'Invalid resolved attestation DID document')
  assertStringArray(value.authentication, 'Invalid resolved attestation DID document')
  assertStringArray(value.assertionMethod, 'Invalid resolved attestation DID document')
  assertVerificationMethods(value.keyAgreement, 'Invalid resolved attestation DID document')
}

function assertVerificationMethods(value: unknown, message: string): void {
  if (!Array.isArray(value)) throw new Error(message)
  for (const entry of value) {
    assertRecord(entry, message)
    if (typeof entry.id !== 'string') throw new Error(message)
    if (typeof entry.type !== 'string') throw new Error(message)
    if (typeof entry.controller !== 'string') throw new Error(message)
    if (typeof entry.publicKeyMultibase !== 'string') throw new Error(message)
  }
}

function methodIdMatchesKid(methodId: string, did: string, kid: string): boolean {
  return methodId === kid || (methodId.startsWith('#') && `${did}${methodId}` === kid)
}

function integerSeconds(value: unknown, message: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) throw new Error(message)
  return value
}

function isoDateTimeSeconds(value: string, message: string): number {
  // Manual parsing keeps naive datetimes out and rejects calendar dates that Date.parse normalizes.
  const match = RFC3339_WHOLE_SECOND_DATE_TIME_WITH_ZONE.exec(value)
  if (!match) throw new Error(message)
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, zone, sign, offsetHourText, offsetMinuteText] = match
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const hour = Number(hourText)
  const minute = Number(minuteText)
  const second = Number(secondText)
  const offsetHour = offsetHourText === undefined ? 0 : Number(offsetHourText)
  const offsetMinute = offsetMinuteText === undefined ? 0 : Number(offsetMinuteText)

  if (hour > 23 || minute > 59 || second > 59 || offsetHour > 23 || offsetMinute > 59) {
    throw new Error(message)
  }

  const localTime = Date.UTC(year, month - 1, day, hour, minute, second)
  const localDate = new Date(localTime)
  if (
    localDate.getUTCFullYear() !== year ||
    localDate.getUTCMonth() !== month - 1 ||
    localDate.getUTCDate() !== day ||
    localDate.getUTCHours() !== hour ||
    localDate.getUTCMinutes() !== minute ||
    localDate.getUTCSeconds() !== second
  ) {
    throw new Error(message)
  }

  const offsetMinutes = zone.toUpperCase() === 'Z' ? 0 : (sign === '+' ? 1 : -1) * (offsetHour * 60 + offsetMinute)
  const time = localTime - offsetMinutes * 60_000
  if (!Number.isFinite(time)) throw new Error(message)
  return time / 1000
}
