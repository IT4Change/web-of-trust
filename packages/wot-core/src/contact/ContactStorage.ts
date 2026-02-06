import { openDB, type IDBPDatabase } from 'idb'
import type { Contact } from '../types/contact'

/**
 * ContactStorage - IndexedDB-based persistent storage for contacts
 *
 * Stores verified contacts with their public keys for E2E encryption.
 * Status tracks verification state (pending → active).
 */
export class ContactStorage {
  private db: IDBPDatabase | null = null
  private readonly DB_NAME = 'wot-contacts'
  private readonly DB_VERSION = 1
  private readonly STORE_NAME = 'contacts'

  /**
   * Initialize database connection
   */
  private async ensureDB(): Promise<IDBPDatabase> {
    if (this.db) {
      return this.db
    }

    this.db = await openDB(this.DB_NAME, this.DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('contacts')) {
          const store = db.createObjectStore('contacts', { keyPath: 'did' })
          store.createIndex('status', 'status')
          store.createIndex('createdAt', 'createdAt')
        }
      },
    })

    return this.db
  }

  /**
   * Add a new contact
   *
   * @param contact - Contact to add
   * @throws Error if contact already exists
   */
  async addContact(contact: Contact): Promise<void> {
    const db = await this.ensureDB()

    // Check if contact already exists
    const existing = await db.get(this.STORE_NAME, contact.did)
    if (existing) {
      throw new Error('Contact already exists')
    }

    await db.put(this.STORE_NAME, contact)
  }

  /**
   * Get a contact by DID
   *
   * @param did - Contact's DID
   * @returns Contact or null if not found
   */
  async getContact(did: string): Promise<Contact | null> {
    const db = await this.ensureDB()
    const contact = await db.get(this.STORE_NAME, did)
    return contact || null
  }

  /**
   * Get all contacts
   *
   * @returns Array of all contacts
   */
  async getAllContacts(): Promise<Contact[]> {
    const db = await this.ensureDB()
    return db.getAll(this.STORE_NAME)
  }

  /**
   * Get only active (verified) contacts
   *
   * @returns Array of active contacts
   */
  async getActiveContacts(): Promise<Contact[]> {
    const db = await this.ensureDB()
    const tx = db.transaction(this.STORE_NAME, 'readonly')
    const index = tx.store.index('status')
    return index.getAll('active')
  }

  /**
   * Update contact fields
   *
   * @param did - Contact's DID
   * @param updates - Partial contact updates
   * @throws Error if contact not found
   */
  async updateContact(did: string, updates: Partial<Contact>): Promise<void> {
    const db = await this.ensureDB()

    const contact = await db.get(this.STORE_NAME, did)
    if (!contact) {
      throw new Error('Contact not found')
    }

    const updated: Contact = {
      ...contact,
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    await db.put(this.STORE_NAME, updated)
  }

  /**
   * Activate a contact (mark as verified)
   *
   * @param did - Contact's DID
   * @throws Error if contact not found
   */
  async activateContact(did: string): Promise<void> {
    await this.updateContact(did, {
      status: 'active',
      verifiedAt: new Date().toISOString(),
    })
  }

  /**
   * Remove a contact
   *
   * @param did - Contact's DID
   */
  async removeContact(did: string): Promise<void> {
    const db = await this.ensureDB()
    await db.delete(this.STORE_NAME, did)
  }

  /**
   * Check if a contact exists
   *
   * @param did - Contact's DID
   * @returns True if contact exists
   */
  async hasContact(did: string): Promise<boolean> {
    const contact = await this.getContact(did)
    return contact !== null
  }

  /**
   * Delete all contacts (useful for identity reset)
   */
  async deleteAll(): Promise<void> {
    const db = await this.ensureDB()
    const tx = db.transaction(this.STORE_NAME, 'readwrite')
    await tx.objectStore(this.STORE_NAME).clear()
    await tx.done
  }
}
