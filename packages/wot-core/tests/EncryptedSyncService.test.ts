import { describe, it, expect } from 'vitest'
import { EncryptedSyncService, type EncryptedChange } from '../src/services/EncryptedSyncService'
import { WebCryptoAdapter } from '../src/adapters/crypto/WebCryptoAdapter'

describe('EncryptedSyncService', () => {
  const crypto = new WebCryptoAdapter()

  it('should encrypt a change with group key', async () => {
    const groupKey = await crypto.generateSymmetricKey()
    const data = new TextEncoder().encode('{"counter": 42}')

    const encrypted = await EncryptedSyncService.encryptChange(
      data,
      groupKey,
      'space-123',
      1,
      'did:key:zAlice',
    )

    expect(encrypted.ciphertext).toBeInstanceOf(Uint8Array)
    expect(encrypted.nonce).toBeInstanceOf(Uint8Array)
    expect(encrypted.nonce.length).toBe(12)
    expect(encrypted.spaceId).toBe('space-123')
    expect(encrypted.generation).toBe(1)
    expect(encrypted.fromDid).toBe('did:key:zAlice')
  })

  it('should decrypt a change with correct group key', async () => {
    const groupKey = await crypto.generateSymmetricKey()
    const original = new TextEncoder().encode('{"counter": 42}')

    const encrypted = await EncryptedSyncService.encryptChange(
      original,
      groupKey,
      'space-123',
      1,
      'did:key:zAlice',
    )

    const decrypted = await EncryptedSyncService.decryptChange(encrypted, groupKey)
    expect(decrypted).toEqual(original)
  })

  it('should fail with wrong group key', async () => {
    const groupKey1 = await crypto.generateSymmetricKey()
    const groupKey2 = await crypto.generateSymmetricKey()
    const data = new TextEncoder().encode('secret')

    const encrypted = await EncryptedSyncService.encryptChange(
      data,
      groupKey1,
      'space-123',
      1,
      'did:key:zAlice',
    )

    await expect(
      EncryptedSyncService.decryptChange(encrypted, groupKey2),
    ).rejects.toThrow()
  })

  it('should include spaceId and generation in metadata', async () => {
    const groupKey = await crypto.generateSymmetricKey()
    const data = new TextEncoder().encode('test')

    const encrypted = await EncryptedSyncService.encryptChange(
      data,
      groupKey,
      'my-space-456',
      3,
      'did:key:zBob',
    )

    expect(encrypted.spaceId).toBe('my-space-456')
    expect(encrypted.generation).toBe(3)
    expect(encrypted.fromDid).toBe('did:key:zBob')
  })

  it('should include fromDid in metadata', async () => {
    const groupKey = await crypto.generateSymmetricKey()
    const data = new TextEncoder().encode('test')

    const encrypted = await EncryptedSyncService.encryptChange(
      data,
      groupKey,
      'space-1',
      1,
      'did:key:z6MkTest123',
    )

    expect(encrypted.fromDid).toBe('did:key:z6MkTest123')
  })

  it('should produce different ciphertexts for same data (random nonce)', async () => {
    const groupKey = await crypto.generateSymmetricKey()
    const data = new TextEncoder().encode('same data')

    const enc1 = await EncryptedSyncService.encryptChange(data, groupKey, 's', 1, 'did:key:z1')
    const enc2 = await EncryptedSyncService.encryptChange(data, groupKey, 's', 1, 'did:key:z1')

    expect(enc1.ciphertext).not.toEqual(enc2.ciphertext)
    expect(enc1.nonce).not.toEqual(enc2.nonce)
  })

  it('should fail with tampered ciphertext', async () => {
    const groupKey = await crypto.generateSymmetricKey()
    const data = new TextEncoder().encode('do not tamper')

    const encrypted = await EncryptedSyncService.encryptChange(data, groupKey, 's', 1, 'did:key:z1')
    const tampered: EncryptedChange = {
      ...encrypted,
      ciphertext: new Uint8Array([...encrypted.ciphertext]),
    }
    tampered.ciphertext[0] ^= 0xff

    await expect(
      EncryptedSyncService.decryptChange(tampered, groupKey),
    ).rejects.toThrow()
  })

  it('should handle empty data', async () => {
    const groupKey = await crypto.generateSymmetricKey()
    const data = new Uint8Array(0)

    const encrypted = await EncryptedSyncService.encryptChange(data, groupKey, 's', 1, 'did:key:z1')
    const decrypted = await EncryptedSyncService.decryptChange(encrypted, groupKey)
    expect(decrypted).toEqual(data)
  })
})
