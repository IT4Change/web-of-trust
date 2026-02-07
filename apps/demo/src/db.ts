/**
 * Evolu Database Setup
 *
 * Defines the Evolu schema and creates the Evolu instance.
 * Uses WotIdentity's deriveFrameworkKey for custom key integration.
 */
import {
  id,
  createEvolu,
  createAppOwner,
  NonEmptyString1000,
  nullOr,
  SqliteBoolean,
  SimpleName,
  OwnerSecret,
  type Evolu,
  type EvoluSchema,
} from '@evolu/common'
import { evoluReactWebDeps } from '@evolu/react-web'
import type { WotIdentity } from '@real-life/wot-core'

// --- Branded ID Types ---

const ContactId = id('Contact')
type ContactId = typeof ContactId.Type

const VerificationId = id('Verification')
type VerificationId = typeof VerificationId.Type

const AttestationId = id('Attestation')
type AttestationId = typeof AttestationId.Type

const AttestationMetadataId = id('AttestationMetadata')
type AttestationMetadataId = typeof AttestationMetadataId.Type

// --- Schema ---

const Schema = {
  contact: {
    id: ContactId,
    did: NonEmptyString1000,
    publicKey: NonEmptyString1000,
    name: nullOr(NonEmptyString1000),
    status: NonEmptyString1000, // 'pending' | 'active'
    verifiedAt: nullOr(NonEmptyString1000),
  },
  verification: {
    id: VerificationId,
    fromDid: NonEmptyString1000,
    toDid: NonEmptyString1000,
    timestamp: NonEmptyString1000,
    proofJson: NonEmptyString1000, // JSON-serialized Proof
    locationJson: nullOr(NonEmptyString1000), // JSON-serialized GeoLocation
  },
  attestation: {
    id: AttestationId,
    fromDid: NonEmptyString1000,
    toDid: NonEmptyString1000,
    claim: NonEmptyString1000,
    tagsJson: nullOr(NonEmptyString1000), // JSON-serialized string[]
    context: nullOr(NonEmptyString1000),
    proofJson: NonEmptyString1000, // JSON-serialized Proof
  },
  attestationMetadata: {
    id: AttestationMetadataId,
    attestationId: NonEmptyString1000,
    accepted: SqliteBoolean,
    acceptedAt: nullOr(NonEmptyString1000),
  },
} as const

type AppSchema = typeof Schema

// --- Evolu Instance Management ---

let evoluInstance: Evolu<AppSchema> | null = null

/**
 * Create Evolu instance with WotIdentity-derived keys.
 *
 * Uses deriveFrameworkKey('evolu-storage-v1') to generate a deterministic
 * OwnerSecret from the user's master seed. Same seed = same Evolu owner.
 */
export async function createWotEvolu(identity: WotIdentity): Promise<Evolu<AppSchema>> {
  // Derive 32 bytes from master seed for Evolu
  const frameworkKey = await identity.deriveFrameworkKey('evolu-storage-v1')

  // Cast to OwnerSecret (branded Uint8Array<32>)
  const ownerSecret = frameworkKey as unknown as OwnerSecret
  const appOwner = createAppOwner(ownerSecret)

  const evolu = createEvolu(evoluReactWebDeps)(Schema, {
    name: SimpleName.orThrow('wot'),
    externalAppOwner: appOwner,
    transports: [], // Local-only for now, sync later
  })

  evoluInstance = evolu
  return evolu
}

/**
 * Get the current Evolu instance. Throws if not initialized.
 */
export function getEvolu(): Evolu<AppSchema> {
  if (!evoluInstance) {
    throw new Error('Evolu not initialized. Call createWotEvolu first.')
  }
  return evoluInstance
}

/**
 * Check if Evolu is initialized.
 */
export function isEvoluInitialized(): boolean {
  return evoluInstance !== null
}

export { Schema, type AppSchema, type ContactId, type VerificationId, type AttestationId, type AttestationMetadataId }
