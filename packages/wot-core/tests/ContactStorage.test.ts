import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ContactStorage } from '../src/contact/ContactStorage'
import type { Contact } from '../src/types/contact'

describe('ContactStorage', () => {
  let storage: ContactStorage

  beforeEach(() => {
    storage = new ContactStorage()
  })

  afterEach(async () => {
    // Cleanup: Delete all contacts after each test
    try {
      const contacts = await storage.getAllContacts()
      for (const contact of contacts) {
        await storage.removeContact(contact.did)
      }
    } catch {
      // Ignore errors during cleanup
    }
  })

  describe('addContact()', () => {
    it('should store contact with did:key format', async () => {
      const contact: Contact = {
        did: 'did:key:z6MkpTHR8VNsBxYAAWHut2Geadd9jSwuBV8xRoAnwWsdvktH',
        publicKey: 'z6MkpTHR8VNsBxYAAWHut2Geadd9jSwuBV8xRoAnwWsdvktH',
        name: 'Test User',
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await storage.addContact(contact)

      const retrieved = await storage.getContact(contact.did)
      expect(retrieved).toEqual(contact)
    })

    it('should store multibase public key', async () => {
      const contact: Contact = {
        did: 'did:key:z6MkpTHR8VNsBxYAAWHut2Geadd9jSwuBV8xRoAnwWsdvktH',
        publicKey: 'z6MkpTHR8VNsBxYAAWHut2Geadd9jSwuBV8xRoAnwWsdvktH',
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await storage.addContact(contact)

      const retrieved = await storage.getContact(contact.did)
      expect(retrieved?.publicKey).toMatch(/^z[1-9A-HJ-NP-Za-km-z]+$/)
    })

    it('should default to pending status', async () => {
      const contact: Contact = {
        did: 'did:key:z6MkpTHR8VNsBxYAAWHut2Geadd9jSwuBV8xRoAnwWsdvktH',
        publicKey: 'z6MkpTHR8VNsBxYAAWHut2Geadd9jSwuBV8xRoAnwWsdvktH',
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await storage.addContact(contact)

      const retrieved = await storage.getContact(contact.did)
      expect(retrieved?.status).toBe('pending')
      expect(retrieved?.verifiedAt).toBeUndefined()
    })

    it('should throw error for duplicate contact', async () => {
      const contact: Contact = {
        did: 'did:key:z6MkpTHR8VNsBxYAAWHut2Geadd9jSwuBV8xRoAnwWsdvktH',
        publicKey: 'z6MkpTHR8VNsBxYAAWHut2Geadd9jSwuBV8xRoAnwWsdvktH',
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await storage.addContact(contact)

      await expect(storage.addContact(contact)).rejects.toThrow('Contact already exists')
    })
  })

  describe('activateContact()', () => {
    it('should change status to active', async () => {
      const contact: Contact = {
        did: 'did:key:z6MkpTHR8VNsBxYAAWHut2Geadd9jSwuBV8xRoAnwWsdvktH',
        publicKey: 'z6MkpTHR8VNsBxYAAWHut2Geadd9jSwuBV8xRoAnwWsdvktH',
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await storage.addContact(contact)
      await storage.activateContact(contact.did)

      const retrieved = await storage.getContact(contact.did)
      expect(retrieved?.status).toBe('active')
    })

    it('should set verifiedAt timestamp', async () => {
      const contact: Contact = {
        did: 'did:key:z6MkpTHR8VNsBxYAAWHut2Geadd9jSwuBV8xRoAnwWsdvktH',
        publicKey: 'z6MkpTHR8VNsBxYAAWHut2Geadd9jSwuBV8xRoAnwWsdvktH',
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const beforeActivation = Date.now()
      await storage.addContact(contact)
      await storage.activateContact(contact.did)
      const afterActivation = Date.now()

      const retrieved = await storage.getContact(contact.did)
      expect(retrieved?.verifiedAt).toBeDefined()

      const verifiedTime = new Date(retrieved!.verifiedAt!).getTime()
      expect(verifiedTime).toBeGreaterThanOrEqual(beforeActivation)
      expect(verifiedTime).toBeLessThanOrEqual(afterActivation)
    })

    it('should throw error for non-existent contact', async () => {
      await expect(
        storage.activateContact('did:key:nonexistent')
      ).rejects.toThrow('Contact not found')
    })
  })

  describe('getContact()', () => {
    it('should retrieve contact by DID', async () => {
      const contact: Contact = {
        did: 'did:key:z6MkpTHR8VNsBxYAAWHut2Geadd9jSwuBV8xRoAnwWsdvktH',
        publicKey: 'z6MkpTHR8VNsBxYAAWHut2Geadd9jSwuBV8xRoAnwWsdvktH',
        name: 'Test User',
        status: 'active',
        verifiedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await storage.addContact(contact)

      const retrieved = await storage.getContact(contact.did)
      expect(retrieved).toEqual(contact)
    })

    it('should return null for non-existent contact', async () => {
      const retrieved = await storage.getContact('did:key:nonexistent')
      expect(retrieved).toBeNull()
    })
  })

  describe('getAllContacts()', () => {
    it('should retrieve all contacts', async () => {
      const contact1: Contact = {
        did: 'did:key:z6MkpTHR8VNsBxYAAWHut2Geadd9jSwuBV8xRoAnwWsdvktH',
        publicKey: 'z6MkpTHR8VNsBxYAAWHut2Geadd9jSwuBV8xRoAnwWsdvktH',
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const contact2: Contact = {
        did: 'did:key:z6MkrFPR2k3cBJayMvNb1fLUtUkwZBPSq3Dz2EQr4GN8Qkfc',
        publicKey: 'z6MkrFPR2k3cBJayMvNb1fLUtUkwZBPSq3Dz2EQr4GN8Qkfc',
        status: 'active',
        verifiedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await storage.addContact(contact1)
      await storage.addContact(contact2)

      const contacts = await storage.getAllContacts()
      expect(contacts).toHaveLength(2)
      expect(contacts.map((c) => c.did)).toContain(contact1.did)
      expect(contacts.map((c) => c.did)).toContain(contact2.did)
    })

    it('should return empty array when no contacts', async () => {
      const contacts = await storage.getAllContacts()
      expect(contacts).toEqual([])
    })
  })

  describe('getActiveContacts()', () => {
    it('should filter only active contacts', async () => {
      const pending: Contact = {
        did: 'did:key:z6MkpTHR8VNsBxYAAWHut2Geadd9jSwuBV8xRoAnwWsdvktH',
        publicKey: 'z6MkpTHR8VNsBxYAAWHut2Geadd9jSwuBV8xRoAnwWsdvktH',
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const active: Contact = {
        did: 'did:key:z6MkrFPR2k3cBJayMvNb1fLUtUkwZBPSq3Dz2EQr4GN8Qkfc',
        publicKey: 'z6MkrFPR2k3cBJayMvNb1fLUtUkwZBPSq3Dz2EQr4GN8Qkfc',
        status: 'active',
        verifiedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await storage.addContact(pending)
      await storage.addContact(active)

      const activeContacts = await storage.getActiveContacts()
      expect(activeContacts).toHaveLength(1)
      expect(activeContacts[0].did).toBe(active.did)
      expect(activeContacts[0].status).toBe('active')
    })

    it('should return empty array when no active contacts', async () => {
      const pending: Contact = {
        did: 'did:key:z6MkpTHR8VNsBxYAAWHut2Geadd9jSwuBV8xRoAnwWsdvktH',
        publicKey: 'z6MkpTHR8VNsBxYAAWHut2Geadd9jSwuBV8xRoAnwWsdvktH',
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await storage.addContact(pending)

      const activeContacts = await storage.getActiveContacts()
      expect(activeContacts).toEqual([])
    })
  })

  describe('updateContact()', () => {
    it('should update contact name', async () => {
      const contact: Contact = {
        did: 'did:key:z6MkpTHR8VNsBxYAAWHut2Geadd9jSwuBV8xRoAnwWsdvktH',
        publicKey: 'z6MkpTHR8VNsBxYAAWHut2Geadd9jSwuBV8xRoAnwWsdvktH',
        name: 'Old Name',
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await storage.addContact(contact)
      await storage.updateContact(contact.did, { name: 'New Name' })

      const retrieved = await storage.getContact(contact.did)
      expect(retrieved?.name).toBe('New Name')
    })

    it('should update updatedAt timestamp', async () => {
      const contact: Contact = {
        did: 'did:key:z6MkpTHR8VNsBxYAAWHut2Geadd9jSwuBV8xRoAnwWsdvktH',
        publicKey: 'z6MkpTHR8VNsBxYAAWHut2Geadd9jSwuBV8xRoAnwWsdvktH',
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await storage.addContact(contact)
      const originalUpdatedAt = contact.updatedAt

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10))

      await storage.updateContact(contact.did, { name: 'Updated' })

      const retrieved = await storage.getContact(contact.did)
      expect(retrieved?.updatedAt).not.toBe(originalUpdatedAt)
    })

    it('should throw error for non-existent contact', async () => {
      await expect(
        storage.updateContact('did:key:nonexistent', { name: 'Test' })
      ).rejects.toThrow('Contact not found')
    })
  })

  describe('removeContact()', () => {
    it('should delete contact from storage', async () => {
      const contact: Contact = {
        did: 'did:key:z6MkpTHR8VNsBxYAAWHut2Geadd9jSwuBV8xRoAnwWsdvktH',
        publicKey: 'z6MkpTHR8VNsBxYAAWHut2Geadd9jSwuBV8xRoAnwWsdvktH',
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await storage.addContact(contact)
      expect(await storage.getContact(contact.did)).not.toBeNull()

      await storage.removeContact(contact.did)
      expect(await storage.getContact(contact.did)).toBeNull()
    })

    it('should not throw error when removing non-existent contact', async () => {
      await expect(storage.removeContact('did:key:nonexistent')).resolves.not.toThrow()
    })
  })
})
