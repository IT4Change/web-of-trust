/**
 * EvoluStorageAdapter - StorageAdapter implementation backed by Evolu
 *
 * Replaces LocalStorageAdapter (IndexedDB) with Evolu for:
 * - E2E encrypted storage
 * - Multi-device sync (via relay)
 * - Deterministic keys from WotIdentity
 *
 * Data is stored in Evolu's SQLite (OPFS in browser), encrypted with
 * keys derived from the user's BIP39 seed.
 */
import {
  NonEmptyString1000,
  booleanToSqliteBoolean,
  sqliteBooleanToBoolean,
  createIdFromString,
  type Evolu,
} from '@evolu/common'
import type {
  StorageAdapter,
  ReactiveStorageAdapter,
  Subscribable,
  Identity,
  Profile,
  Contact,
  Verification,
  Attestation,
  AttestationMetadata,
} from '@real-life/wot-core'
import type { AppSchema } from '../db'
import { rowToContact, rowToVerification, rowToAttestation } from './rowMappers'

type AppEvolu = Evolu<AppSchema>

const str = (s: string) => NonEmptyString1000.orThrow(s)

export class EvoluStorageAdapter implements StorageAdapter, ReactiveStorageAdapter {
  constructor(private evolu: AppEvolu) {}

  // --- Identity ---
  // Identity is stored locally (not in Evolu) since it contains
  // only the local user's DID and profile name.

  private localIdentity: Identity | null = null

  async createIdentity(did: string, profile: Profile): Promise<Identity> {
    const now = new Date().toISOString()
    const identity: Identity = { did, profile, createdAt: now, updatedAt: now }
    this.localIdentity = identity
    localStorage.setItem('wot-identity', JSON.stringify(identity))
    return identity
  }

  async getIdentity(): Promise<Identity | null> {
    if (this.localIdentity) return this.localIdentity
    const stored = localStorage.getItem('wot-identity')
    if (stored) {
      this.localIdentity = JSON.parse(stored) as Identity
      return this.localIdentity
    }
    return null
  }

  async updateIdentity(identity: Identity): Promise<void> {
    identity.updatedAt = new Date().toISOString()
    this.localIdentity = identity
    localStorage.setItem('wot-identity', JSON.stringify(identity))
  }

  // --- Contacts ---

  async addContact(contact: Contact): Promise<void> {
    const result = this.evolu.upsert('contact', {
      id: createIdFromString<'Contact'>(contact.did),
      did: str(contact.did),
      publicKey: str(contact.publicKey),
      name: contact.name ? str(contact.name) : null,
      status: str(contact.status),
      verifiedAt: contact.verifiedAt ? str(contact.verifiedAt) : null,
    })
    if (!result.ok) {
      throw new Error(`Failed to add contact: ${JSON.stringify(result.error)}`)
    }
  }

  async getContacts(): Promise<Contact[]> {
    const query = this.evolu.createQuery((db) =>
      db.selectFrom('contact')
        .selectAll()
        .where('isDeleted', 'is not', booleanToSqliteBoolean(true))
    )
    const rows = await this.evolu.loadQuery(query)
    return [...rows].map(rowToContact)
  }

  async getContact(did: string): Promise<Contact | null> {
    const query = this.evolu.createQuery((db) =>
      db.selectFrom('contact')
        .selectAll()
        .where('did', '=', str(did))
        .where('isDeleted', 'is not', booleanToSqliteBoolean(true))
    )
    const rows = await this.evolu.loadQuery(query)
    return rows.length > 0 ? rowToContact(rows[0]) : null
  }

  async updateContact(contact: Contact): Promise<void> {
    this.evolu.update('contact', {
      id: createIdFromString<'Contact'>(contact.did),
      did: str(contact.did),
      publicKey: str(contact.publicKey),
      name: contact.name ? str(contact.name) : null,
      status: str(contact.status),
      verifiedAt: contact.verifiedAt ? str(contact.verifiedAt) : null,
    })
  }

  async removeContact(did: string): Promise<void> {
    this.evolu.update('contact', {
      id: createIdFromString<'Contact'>(did),
      isDeleted: booleanToSqliteBoolean(true),
    })
  }

  // --- Verifications ---

  async saveVerification(verification: Verification): Promise<void> {
    const result = this.evolu.upsert('verification', {
      id: createIdFromString<'Verification'>(verification.id),
      fromDid: str(verification.from),
      toDid: str(verification.to),
      timestamp: str(verification.timestamp),
      proofJson: str(JSON.stringify(verification.proof)),
      locationJson: verification.location
        ? str(JSON.stringify(verification.location))
        : null,
    })
    if (!result.ok) {
      throw new Error(`Failed to save verification: ${JSON.stringify(result.error)}`)
    }
  }

  async getReceivedVerifications(): Promise<Verification[]> {
    const query = this.evolu.createQuery((db) =>
      db.selectFrom('verification')
        .selectAll()
        .where('isDeleted', 'is not', booleanToSqliteBoolean(true))
    )
    const rows = await this.evolu.loadQuery(query)
    return [...rows].map(rowToVerification)
  }

  async getVerification(id: string): Promise<Verification | null> {
    const query = this.evolu.createQuery((db) =>
      db.selectFrom('verification')
        .selectAll()
        .where('id', '=', createIdFromString<'Verification'>(id))
        .where('isDeleted', 'is not', booleanToSqliteBoolean(true))
    )
    const rows = await this.evolu.loadQuery(query)
    return rows.length > 0 ? rowToVerification(rows[0]) : null
  }

  // --- Attestations ---

  async saveAttestation(attestation: Attestation): Promise<void> {
    const result = this.evolu.upsert('attestation', {
      id: createIdFromString<'Attestation'>(attestation.id),
      fromDid: str(attestation.from),
      toDid: str(attestation.to),
      claim: str(attestation.claim),
      tagsJson: attestation.tags
        ? str(JSON.stringify(attestation.tags))
        : null,
      context: attestation.context ? str(attestation.context) : null,
      proofJson: str(JSON.stringify(attestation.proof)),
    })
    if (!result.ok) {
      throw new Error(`Failed to save attestation: ${JSON.stringify(result.error)}`)
    }

    // Create default metadata
    this.evolu.upsert('attestationMetadata', {
      id: createIdFromString<'AttestationMetadata'>(`meta-${attestation.id}`),
      attestationId: str(attestation.id),
      accepted: booleanToSqliteBoolean(false),
      acceptedAt: null,
    })
  }

  async getReceivedAttestations(): Promise<Attestation[]> {
    const query = this.evolu.createQuery((db) =>
      db.selectFrom('attestation')
        .selectAll()
        .where('isDeleted', 'is not', booleanToSqliteBoolean(true))
    )
    const rows = await this.evolu.loadQuery(query)
    return [...rows].map(rowToAttestation)
  }

  async getAttestation(id: string): Promise<Attestation | null> {
    const query = this.evolu.createQuery((db) =>
      db.selectFrom('attestation')
        .selectAll()
        .where('id', '=', createIdFromString<'Attestation'>(id))
        .where('isDeleted', 'is not', booleanToSqliteBoolean(true))
    )
    const rows = await this.evolu.loadQuery(query)
    return rows.length > 0 ? rowToAttestation(rows[0]) : null
  }

  // --- Attestation Metadata ---

  async getAttestationMetadata(attestationId: string): Promise<AttestationMetadata | null> {
    const query = this.evolu.createQuery((db) =>
      db.selectFrom('attestationMetadata')
        .selectAll()
        .where('attestationId', '=', str(attestationId))
        .where('isDeleted', 'is not', booleanToSqliteBoolean(true))
    )
    const rows = await this.evolu.loadQuery(query)
    if (rows.length === 0) return null
    const row = rows[0]
    return {
      attestationId: row.attestationId as string,
      accepted: row.accepted != null ? sqliteBooleanToBoolean(row.accepted) : false,
      ...(row.acceptedAt != null ? { acceptedAt: row.acceptedAt as string } : {}),
    }
  }

  async setAttestationAccepted(attestationId: string, accepted: boolean): Promise<void> {
    this.evolu.upsert('attestationMetadata', {
      id: createIdFromString<'AttestationMetadata'>(`meta-${attestationId}`),
      attestationId: str(attestationId),
      accepted: booleanToSqliteBoolean(accepted),
      acceptedAt: accepted ? str(new Date().toISOString()) : null,
    })
  }

  // --- Lifecycle ---

  async init(): Promise<void> {
    // Evolu is already initialized in createWotEvolu
  }

  async clear(): Promise<void> {
    localStorage.removeItem('wot-identity')
    this.localIdentity = null
  }

  // --- Reactive (ReactiveStorageAdapter) ---
  //
  // useSyncExternalStore requires getValue() to return the same reference
  // when data hasn't changed. We cache the mapped snapshot and only update
  // it in the subscribe callback when Evolu notifies us of a change.

  watchContacts(): Subscribable<Contact[]> {
    const query = this.evolu.createQuery((db) =>
      db.selectFrom('contact').selectAll()
        .where('isDeleted', 'is not', booleanToSqliteBoolean(true))
    )
    let snapshot: Contact[] = [...this.evolu.getQueryRows(query)].map(rowToContact)
    return {
      subscribe: (callback) => {
        return this.evolu.subscribeQuery(query)(() => {
          snapshot = [...this.evolu.getQueryRows(query)].map(rowToContact)
          callback(snapshot)
        })
      },
      getValue: () => snapshot,
    }
  }

  watchReceivedVerifications(): Subscribable<Verification[]> {
    const query = this.evolu.createQuery((db) =>
      db.selectFrom('verification').selectAll()
        .where('isDeleted', 'is not', booleanToSqliteBoolean(true))
    )
    let snapshot: Verification[] = [...this.evolu.getQueryRows(query)].map(rowToVerification)
    return {
      subscribe: (callback) => {
        return this.evolu.subscribeQuery(query)(() => {
          snapshot = [...this.evolu.getQueryRows(query)].map(rowToVerification)
          callback(snapshot)
        })
      },
      getValue: () => snapshot,
    }
  }

  watchReceivedAttestations(): Subscribable<Attestation[]> {
    const query = this.evolu.createQuery((db) =>
      db.selectFrom('attestation').selectAll()
        .where('isDeleted', 'is not', booleanToSqliteBoolean(true))
    )
    let snapshot: Attestation[] = [...this.evolu.getQueryRows(query)].map(rowToAttestation)
    return {
      subscribe: (callback) => {
        return this.evolu.subscribeQuery(query)(() => {
          snapshot = [...this.evolu.getQueryRows(query)].map(rowToAttestation)
          callback(snapshot)
        })
      },
      getValue: () => snapshot,
    }
  }
}
