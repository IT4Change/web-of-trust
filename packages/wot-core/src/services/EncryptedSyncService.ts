/**
 * EncryptedSyncService — Encrypts/decrypts CRDT changes with a group key.
 *
 * Used for Encrypted Group Spaces: each change is AES-256-GCM encrypted
 * before being sent to other members. The server (relay) never sees plaintext.
 *
 * Pattern: Encrypt-then-sync (inspired by Keyhive/NextGraph)
 */

export interface EncryptedChange {
  ciphertext: Uint8Array
  nonce: Uint8Array
  spaceId: string
  generation: number
  fromDid: string
}

export class EncryptedSyncService {
  /**
   * Encrypt a CRDT change with a group key.
   */
  static async encryptChange(
    data: Uint8Array,
    groupKey: Uint8Array,
    spaceId: string,
    generation: number,
    fromDid: string,
  ): Promise<EncryptedChange> {
    const key = await crypto.subtle.importKey(
      'raw',
      groupKey,
      { name: 'AES-GCM' },
      false,
      ['encrypt'],
    )

    const nonce = crypto.getRandomValues(new Uint8Array(12))
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: nonce },
      key,
      data,
    )

    return {
      ciphertext: new Uint8Array(ciphertext),
      nonce,
      spaceId,
      generation,
      fromDid,
    }
  }

  /**
   * Decrypt a CRDT change with a group key.
   */
  static async decryptChange(
    change: EncryptedChange,
    groupKey: Uint8Array,
  ): Promise<Uint8Array> {
    const key = await crypto.subtle.importKey(
      'raw',
      groupKey,
      { name: 'AES-GCM' },
      false,
      ['decrypt'],
    )

    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: change.nonce },
      key,
      change.ciphertext,
    )

    return new Uint8Array(plaintext)
  }
}
