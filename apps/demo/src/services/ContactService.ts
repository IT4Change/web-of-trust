import { ContactStorage, type Contact, type ContactStatus } from '@real-life/wot-core'

/**
 * ContactService - Wrapper around ContactStorage
 *
 * Provides business logic layer for contact management.
 */
export class ContactService {
  constructor(private storage: ContactStorage) {}

  async addContact(
    did: string,
    publicKey: string,
    name?: string,
    status: ContactStatus = 'pending'
  ): Promise<Contact> {
    const now = new Date().toISOString()
    const contact: Contact = {
      did,
      publicKey,
      name,
      status,
      createdAt: now,
      updatedAt: now,
    }
    await this.storage.addContact(contact)
    return contact
  }

  async getContacts(): Promise<Contact[]> {
    return this.storage.getAllContacts()
  }

  async getActiveContacts(): Promise<Contact[]> {
    return this.storage.getActiveContacts()
  }

  async getContact(did: string): Promise<Contact | null> {
    return this.storage.getContact(did)
  }

  async activateContact(did: string): Promise<void> {
    await this.storage.activateContact(did)
  }

  async updateContactName(did: string, name: string): Promise<void> {
    await this.storage.updateContact(did, { name })
  }

  async removeContact(did: string): Promise<void> {
    await this.storage.removeContact(did)
  }
}
