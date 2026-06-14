import type { PublicProfile } from '../types/identity'
import type { Attestation } from '../types/attestation'
import type { IdentitySession } from '../types/identity-session'
import type { DidDocument, ProfileServiceResourceKind } from '../protocol'

/**
 * Published attestations data — wraps an array of accepted attestations
 * about a DID, signed by the DID owner as JWS.
 */
export interface PublicAttestationsData {
  did: string
  attestations: Attestation[]
  updatedAt: string
}

/**
 * Published verifications data (`/p/{did}/v`) — the list of received live
 * verification-attestations the holder chose to publish (Sync 004 Z.24-32).
 * Same shape as attestations data; carried as derived `Attestation[]` form.
 */
export interface PublicVerificationsData {
  did: string
  verifications: Attestation[]
  updatedAt: string
}

/**
 * Lightweight summary for batch queries.
 * Unsigned (derived from already-verified JWS data server-side).
 */
export interface ProfileSummary {
  did: string
  name: string | null
  verificationCount: number
  attestationCount: number
}

/**
 * Result of resolving a profile — includes cache metadata.
 * Allows callers to distinguish fresh network data from cached fallback.
 */
export interface ProfileResolveResult {
  profile: PublicProfile | null
  didDocument?: DidDocument | null
  version?: number
  fromCache: boolean
}

/**
 * Resource-dimensional last-seen-version cache (VE-3).
 *
 * Sync 004 Z.181: rollback protection is independent per resource —
 * `/p` (profile), `/p/{did}/v` (verifications), `/p/{did}/a` (attestations)
 * each carry their own monotonic `version`.
 */
export interface ProfileVersionCache {
  getLastSeenVersion(did: string, resource: ProfileServiceResourceKind): Promise<number | undefined>
  setLastSeenVersion(did: string, resource: ProfileServiceResourceKind, version: number): Promise<void>
}

export class ProfileResourceRollbackError extends Error {
  constructor(
    readonly did: string,
    readonly fetchedVersion: number,
    readonly lastSeenVersion: number,
    readonly resource: ProfileServiceResourceKind,
  ) {
    super(`Profile resource rollback detected for ${did} (${resource}): fetched version ${fetchedVersion} is lower than last seen version ${lastSeenVersion}`)
    this.name = 'ProfileResourceRollbackError'
  }
}

export class LocalProfileVersionCache implements ProfileVersionCache {
  private readonly fallback = new Map<string, number>()

  constructor(private readonly keyPrefix = 'wot:profile-version:') {}

  async getLastSeenVersion(did: string, resource: ProfileServiceResourceKind): Promise<number | undefined> {
    const key = this.keyFor(did, resource)
    let raw = this.storage?.getItem(key) ?? undefined
    // Cache migration (VE-3): the legacy single-key value `wot:profile-version:{did}`
    // was written before the resource dimension existed. Read it ONCE as the
    // `profile` resource so no version baseline is lost. No dual-format shim —
    // the resource-scoped key always wins once it exists.
    if (raw === undefined && resource === 'profile') {
      raw = this.storage?.getItem(this.keyPrefix + did) ?? undefined
    }
    const value = raw === undefined ? this.fallback.get(key) : Number(raw)
    if (value === undefined) return undefined
    return Number.isSafeInteger(value) && value >= 0 ? value : undefined
  }

  async setLastSeenVersion(did: string, resource: ProfileServiceResourceKind, version: number): Promise<void> {
    if (!Number.isSafeInteger(version) || version < 0) {
      throw new Error('Invalid profile version')
    }
    const key = this.keyFor(did, resource)
    this.fallback.set(key, version)
    this.storage?.setItem(key, String(version))
  }

  private keyFor(did: string, resource: ProfileServiceResourceKind): string {
    return `${this.keyPrefix}${did}:${resource}`
  }

  private get storage(): Storage | undefined {
    try {
      return globalThis.localStorage
    } catch {
      return undefined
    }
  }
}

/**
 * Discovery adapter interface for public profile lookup.
 *
 * Framework-agnostic: Can be implemented with HTTP REST (POC, wot-profiles),
 * Automerge Auto-Groups, IPFS, DHT, or Nostr.
 *
 * The DiscoveryAdapter answers the question: "Who is this DID?"
 * — before any contact exists.
 *
 * Design principles:
 * - All data is Ed25519-signed (JWS) — integrity without confidentiality
 * - The DID owner controls what is public
 * - Anonymously readable — no login needed
 * - No authentication — the cryptographic signature IS the authorization
 * - Server is a dumb cache — truth lives locally
 *
 * Three orthogonal axes:
 *   Discovery (this) → Messaging → Replication
 *   VOR dem Kontakt    ZWISCHEN     INNERHALB
 *   öffentlich         privat       Gruppe
 */
export interface DiscoveryAdapter {
  // Publish own public data (signed as JWS)
  publishProfile(data: PublicProfile, identity: IdentitySession): Promise<void>
  publishAttestations(data: PublicAttestationsData, identity: IdentitySession): Promise<void>
  /**
   * Publish the holder's list of received live verification-attestations
   * (`/p/{did}/v`, Sync 004 Z.24-32). Additive sibling of publishAttestations.
   * The HTTP implementation is wired in Step 3.
   */
  publishVerifications(data: PublicVerificationsData, identity: IdentitySession): Promise<void>

  // Resolve public data for a DID (verifies JWS signature)
  resolveProfile(did: string): Promise<ProfileResolveResult>
  resolveAttestations(did: string): Promise<Attestation[]>
  /**
   * Resolve the holder's published verification-attestations (`/p/{did}/v`).
   * Returns the derived `Attestation[]` form, mirroring resolveAttestations.
   * The HTTP implementation is wired in Step 3.
   */
  resolveVerifications(did: string): Promise<Attestation[]>

  // Optional: batch summary for multiple DIDs (unsigned, server-derived counts)
  resolveSummaries?(dids: string[]): Promise<ProfileSummary[]>
}
