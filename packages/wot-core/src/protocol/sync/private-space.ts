import type { ProtocolCryptoAdapter } from '../crypto/ports'
import { bip39SeedHexToBytes } from './admin-key'

// wot-spec Sync 001 §"Privater Space (deterministische Genesis-Schlüssel)".
// Three separate HKDF contexts (domain separation) so the public spaceId leaks
// no key material. IKM = 64-byte BIP39 seed, salt = 32 zero bytes — both supplied
// by the derive primitive (identity.deriveFrameworkKey) / hkdfSha256.
//
// FROZEN WIRE CONTRACT: these three info strings + lengths + the 32-zero salt are
// immutable. Any change re-derives a different spaceId / capability key and breaks
// idempotent space-register across devices and versions (→ SPACE_ALREADY_REGISTERED).
const PRIVATE_SPACE_ID_INFO = 'wot/private-space/id/v1'
const PRIVATE_SPACE_CONTENT_INFO = 'wot/private-space/content/v1'
const PRIVATE_SPACE_CAP_INFO = 'wot/private-space/cap/v1'
const PRIVATE_SPACE_ID_LENGTH_BYTES = 16
const PRIVATE_SPACE_CONTENT_KEY_LENGTH_BYTES = 32
const PRIVATE_SPACE_CAP_SEED_LENGTH_BYTES = 32

export interface PrivateSpaceGenesis {
  /** Canonical lowercase UUID v4, deterministic per identity. */
  spaceId: string
  /** 32-byte AES-256 content key, generation 0. */
  contentKey: Uint8Array
  /** 32-byte Ed25519 capability signing seed, generation 0. */
  capabilitySigningSeed: Uint8Array
}

/**
 * Derive the private space's deterministic genesis material (generation 0) from
 * the identity. Operation-shaped: `derive` MUST be the vault's framework-key
 * derivation (`identity.deriveFrameworkKey`) = HKDF-SHA256(IKM = 64-byte BIP39
 * seed, salt = 32 zero bytes, info, length). No raw seed hex is ever handled.
 *
 * Every device / recovery of the same identity derives byte-identical values →
 * space-register is idempotent (first-writer-wins) → multi-device by construction.
 * Determinism covers ONLY genesis (gen 0); once shared and rotated, current keys
 * are discovered via PersonalDoc sync (Sync 001 "Lebenszyklus").
 */
export async function derivePrivateSpaceGenesis(
  derive: (info: string, length: number) => Promise<Uint8Array>,
): Promise<PrivateSpaceGenesis> {
  const [idBytes, contentKey, capabilitySigningSeed] = await Promise.all([
    derive(PRIVATE_SPACE_ID_INFO, PRIVATE_SPACE_ID_LENGTH_BYTES),
    derive(PRIVATE_SPACE_CONTENT_INFO, PRIVATE_SPACE_CONTENT_KEY_LENGTH_BYTES),
    derive(PRIVATE_SPACE_CAP_INFO, PRIVATE_SPACE_CAP_SEED_LENGTH_BYTES),
  ])
  return { spaceId: uuidV4FromBytes(idBytes), contentKey, capabilitySigningSeed }
}

/**
 * Seed-hex twin of {@link derivePrivateSpaceGenesis} for test-vector conformance
 * (mirrors admin-key.ts `deriveSpaceAdminKeyFromSeedHex`). NOT used at runtime —
 * the app derives through the vault handle, never raw seed hex.
 */
export async function derivePrivateSpaceGenesisFromSeedHex(
  bip39SeedHex: string,
  cryptoAdapter: ProtocolCryptoAdapter,
): Promise<PrivateSpaceGenesis> {
  const seed = bip39SeedHexToBytes(bip39SeedHex)
  return derivePrivateSpaceGenesis((info, length) => cryptoAdapter.hkdfSha256(seed, info, length))
}

function uuidV4FromBytes(bytes: Uint8Array): string {
  if (bytes.length < PRIVATE_SPACE_ID_LENGTH_BYTES) {
    throw new Error(`private-space id needs at least ${PRIVATE_SPACE_ID_LENGTH_BYTES} bytes`)
  }
  const raw = new Uint8Array(16)
  raw.set(bytes.subarray(0, 16))
  raw[6] = (raw[6] & 0x0f) | 0x40 // UUID version 4 (RFC 9562 §5.4)
  raw[8] = (raw[8] & 0x3f) | 0x80 // RFC 9562 variant
  return [
    bytesToLowerHex(raw.slice(0, 4)),
    bytesToLowerHex(raw.slice(4, 6)),
    bytesToLowerHex(raw.slice(6, 8)),
    bytesToLowerHex(raw.slice(8, 10)),
    bytesToLowerHex(raw.slice(10, 16)),
  ].join('-')
}

function bytesToLowerHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}
