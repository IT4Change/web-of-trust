import * as ed25519 from '@noble/ed25519'
import { decodeBase64Url, encodeBase64Url } from '../crypto/encoding'
import { canonicalizeToBytes, type JsonValue } from '../crypto/jcs'
import type { ProtocolCryptoAdapter } from '../crypto/ports'
import type { BrokerErrorCode } from './broker-error'

export const SPACE_ROTATE_MESSAGE_TYPE = 'space-rotate' as const
export const ADMIN_ADD_MESSAGE_TYPE = 'admin-add' as const
export const ADMIN_REMOVE_MESSAGE_TYPE = 'admin-remove' as const

export interface SpaceRotateMessage {
  type: typeof SPACE_ROTATE_MESSAGE_TYPE
  spaceId: string
  newPublicKey: string
  newGeneration: number
}

export interface AdminAddMessage {
  type: typeof ADMIN_ADD_MESSAGE_TYPE
  spaceId: string
  newAdminDid: string
}

export interface AdminRemoveMessage {
  type: typeof ADMIN_REMOVE_MESSAGE_TYPE
  spaceId: string
  removedAdminDid: string
}

export type BrokerAdminMessage = SpaceRotateMessage | AdminAddMessage | AdminRemoveMessage

export interface CreateSpaceRotateMessageOptions {
  spaceId: string
  newPublicKey: string
  newGeneration: number
}

export interface CreateAdminAddMessageOptions {
  spaceId: string
  newAdminDid: string
}

export interface CreateAdminRemoveMessageOptions {
  spaceId: string
  removedAdminDid: string
}

export interface VerifyBrokerAdminMessageSignatureOptions {
  message: unknown
  signature: unknown
  adminPublicKey: Uint8Array
  crypto: Pick<ProtocolCryptoAdapter, 'verifyEd25519'>
}

export type BrokerAdminMessageSignatureVerificationResult =
  | {
      disposition: 'accepted'
      message: BrokerAdminMessage
      signatureBytes: Uint8Array
      signingBytes: Uint8Array
    }
  | {
      disposition: 'rejected'
      errorCode: Extract<BrokerErrorCode, 'MALFORMED_MESSAGE' | 'AUTH_INVALID'>
    }

export function createSpaceRotateMessage(
  options: CreateSpaceRotateMessageOptions,
): SpaceRotateMessage {
  return parseSpaceRotateMessage({
    type: SPACE_ROTATE_MESSAGE_TYPE,
    spaceId: options.spaceId,
    newPublicKey: options.newPublicKey,
    newGeneration: options.newGeneration,
  })
}

export function createAdminAddMessage(options: CreateAdminAddMessageOptions): AdminAddMessage {
  return parseAdminAddMessage({
    type: ADMIN_ADD_MESSAGE_TYPE,
    spaceId: options.spaceId,
    newAdminDid: options.newAdminDid,
  })
}

export function createAdminRemoveMessage(
  options: CreateAdminRemoveMessageOptions,
): AdminRemoveMessage {
  return parseAdminRemoveMessage({
    type: ADMIN_REMOVE_MESSAGE_TYPE,
    spaceId: options.spaceId,
    removedAdminDid: options.removedAdminDid,
  })
}

export function parseSpaceRotateMessage(value: unknown): SpaceRotateMessage {
  const message = assertRecord(value, 'space-rotate message')
  assertExactKeys(message, ['type', 'spaceId', 'newPublicKey', 'newGeneration'], 'space-rotate message')
  if (message.type !== SPACE_ROTATE_MESSAGE_TYPE) throw new Error('Invalid space-rotate message type')
  const spaceId = parseCanonicalUuidV4(message.spaceId, 'space-rotate message spaceId')
  const newPublicKey = parseNonEmptyString(message.newPublicKey, 'space-rotate message newPublicKey')
  const newGeneration = parseNonNegativeSafeInteger(message.newGeneration, 'space-rotate message newGeneration')

  return {
    type: SPACE_ROTATE_MESSAGE_TYPE,
    spaceId,
    newPublicKey,
    newGeneration,
  }
}

export function parseAdminAddMessage(value: unknown): AdminAddMessage {
  const message = assertRecord(value, 'admin-add message')
  assertExactKeys(message, ['type', 'spaceId', 'newAdminDid'], 'admin-add message')
  if (message.type !== ADMIN_ADD_MESSAGE_TYPE) throw new Error('Invalid admin-add message type')
  const spaceId = parseCanonicalUuidV4(message.spaceId, 'admin-add message spaceId')
  const newAdminDid = parseDid(message.newAdminDid, 'admin-add message newAdminDid')

  return {
    type: ADMIN_ADD_MESSAGE_TYPE,
    spaceId,
    newAdminDid,
  }
}

export function parseAdminRemoveMessage(value: unknown): AdminRemoveMessage {
  const message = assertRecord(value, 'admin-remove message')
  assertExactKeys(message, ['type', 'spaceId', 'removedAdminDid'], 'admin-remove message')
  if (message.type !== ADMIN_REMOVE_MESSAGE_TYPE) throw new Error('Invalid admin-remove message type')
  const spaceId = parseCanonicalUuidV4(message.spaceId, 'admin-remove message spaceId')
  const removedAdminDid = parseDid(message.removedAdminDid, 'admin-remove message removedAdminDid')

  return {
    type: ADMIN_REMOVE_MESSAGE_TYPE,
    spaceId,
    removedAdminDid,
  }
}

export function parseBrokerAdminMessage(value: unknown): BrokerAdminMessage {
  const message = assertRecord(value, 'broker admin message')
  switch (message.type) {
    case SPACE_ROTATE_MESSAGE_TYPE:
      return parseSpaceRotateMessage(message)
    case ADMIN_ADD_MESSAGE_TYPE:
      return parseAdminAddMessage(message)
    case ADMIN_REMOVE_MESSAGE_TYPE:
      return parseAdminRemoveMessage(message)
    default:
      throw new Error('Invalid broker admin message type')
  }
}

export function assertSpaceRotateMessage(value: unknown): asserts value is SpaceRotateMessage {
  parseSpaceRotateMessage(value)
}

export function assertAdminAddMessage(value: unknown): asserts value is AdminAddMessage {
  parseAdminAddMessage(value)
}

export function assertAdminRemoveMessage(value: unknown): asserts value is AdminRemoveMessage {
  parseAdminRemoveMessage(value)
}

export function assertBrokerAdminMessage(value: unknown): asserts value is BrokerAdminMessage {
  parseBrokerAdminMessage(value)
}

export function brokerAdminMessageSigningBytes(message: unknown): Uint8Array {
  const parsed = parseBrokerAdminMessage(message)
  return canonicalizeToBytes(parsed as unknown as JsonValue)
}

export async function createBrokerAdminMessageSignature(
  message: unknown,
  signingSeed: Uint8Array,
): Promise<string> {
  assertEd25519Seed(signingSeed)
  const signingBytes = brokerAdminMessageSigningBytes(message)
  const signature = await ed25519.signAsync(signingBytes, signingSeed)
  return encodeBase64Url(signature)
}

export async function verifyBrokerAdminMessageSignature(
  options: VerifyBrokerAdminMessageSignatureOptions,
): Promise<BrokerAdminMessageSignatureVerificationResult> {
  assertEd25519PublicKey(options.adminPublicKey)
  assertVerifier(options.crypto)

  let message: BrokerAdminMessage
  let signatureBytes: Uint8Array
  let signingBytes: Uint8Array
  try {
    message = parseBrokerAdminMessage(options.message)
    signatureBytes = parseEd25519Signature(options.signature)
    signingBytes = brokerAdminMessageSigningBytes(message)
  } catch {
    return {
      disposition: 'rejected',
      errorCode: 'MALFORMED_MESSAGE',
    }
  }

  let signatureValid: boolean
  try {
    signatureValid = await options.crypto.verifyEd25519(
      signingBytes,
      signatureBytes,
      options.adminPublicKey,
    )
  } catch {
    return {
      disposition: 'rejected',
      errorCode: 'AUTH_INVALID',
    }
  }

  if (!signatureValid) {
    return {
      disposition: 'rejected',
      errorCode: 'AUTH_INVALID',
    }
  }

  return {
    disposition: 'accepted',
    message,
    signatureBytes,
    signingBytes,
  }
}

function assertRecord(value: unknown, name: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Invalid ${name}`)
  return value as Record<string, unknown>
}

function assertExactKeys(value: Record<string, unknown>, allowed: readonly string[], name: string): void {
  const expected = new Set(allowed)
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string' || !expected.has(key)) {
      throw new Error(`Invalid ${name} property: ${String(key)}`)
    }
  }
  for (const key of allowed) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) throw new Error(`Invalid ${name} ${key}`)
  }
}

function parseCanonicalUuidV4(value: unknown, name: string): string {
  if (
    typeof value !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value)
  ) {
    throw new Error(`Invalid ${name}`)
  }
  return value
}

function parseNonEmptyString(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.length === 0) throw new Error(`Invalid ${name}`)
  return value
}

function parseDid(value: unknown, name: string): string {
  const did = parseNonEmptyString(value, name)
  if (!did.startsWith('did:')) throw new Error(`Invalid ${name}`)
  return did
}

function parseNonNegativeSafeInteger(value: unknown, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) throw new Error(`Invalid ${name}`)
  return value as number
}

function parseEd25519Signature(value: unknown): Uint8Array {
  if (typeof value !== 'string') throw new Error('Invalid broker admin message signature')
  if (!/^[A-Za-z0-9_-]+$/.test(value) || value.length % 4 === 1) {
    throw new Error('Invalid broker admin message signature')
  }
  const bytes = decodeBase64Url(value)
  if (encodeBase64Url(bytes) !== value || bytes.byteLength !== 64) {
    throw new Error('Invalid broker admin message signature')
  }
  return bytes
}

function assertEd25519Seed(value: unknown): asserts value is Uint8Array {
  if (!(value instanceof Uint8Array) || value.byteLength !== 32) {
    throw new Error('Invalid broker admin message signing seed')
  }
}

function assertEd25519PublicKey(value: unknown): asserts value is Uint8Array {
  if (!(value instanceof Uint8Array) || value.byteLength !== 32) {
    throw new Error('Invalid broker admin message admin public key')
  }
}

function assertVerifier(value: unknown): asserts value is Pick<ProtocolCryptoAdapter, 'verifyEd25519'> {
  if (
    value === null ||
    typeof value !== 'object' ||
    typeof (value as Pick<ProtocolCryptoAdapter, 'verifyEd25519'>).verifyEd25519 !== 'function'
  ) {
    throw new Error('Invalid broker admin message verifier')
  }
}
