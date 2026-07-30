import { describe, it, expect, afterEach } from 'vitest'
import { WebCryptoProtocolCryptoAdapter } from '../src/adapters/protocol-crypto'
import { WebCryptoAdapter } from '../src/adapters/crypto/WebCryptoAdapter'

// RFC 7748 section 6.1 — Alice's private scalar and the matching X25519 public key.
const RFC7748_PRIVATE_KEY = '77076d0a7318a57d3c16c17251b26645df4c2f87ebc0992ab177fba51db92c2a'
const RFC7748_PUBLIC_KEY = '8520f0098930a754748b7ddcb43ef75a0dbf3a0d26381af4eba4a98eaa9b4e6a'

function fromHex(hex: string): Uint8Array {
  return new Uint8Array(hex.match(/../g)!.map((byte) => parseInt(byte, 16)))
}

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

// Node (OpenSSL), Chrome (BoringSSL) and current Firefox all compute the public key
// when a bare X25519 PKCS#8 private key is imported, so exportKey('jwk') can hand back
// the `x` component. The Gecko build shipped in Tor Browser does not, and rejects the
// export with OperationError. Deriving a public key through a private-key export
// therefore passes every test we can run in Node while being broken for those users.
// This shim reproduces that engine so the contract is actually enforced. It rejects
// every private-key export regardless of format, not just the JWK one that Tor Browser
// happens to fail on: the contract being guarded is that no derivation reads private
// key material back out, and a pkcs8 detour would violate it just as much.
function simulateEngineWithoutPrivateKeyExport(): () => void {
  const previous = Object.getOwnPropertyDescriptor(crypto.subtle, 'exportKey')
  const original = crypto.subtle.exportKey.bind(crypto.subtle)
  const patched = async (format: string, key: CryptoKey) => {
    if (key.type === 'private') {
      throw new DOMException('The operation failed for an operation-specific reason', 'OperationError')
    }
    return original(format as 'raw', key)
  }
  Object.defineProperty(crypto.subtle, 'exportKey', { value: patched, configurable: true, writable: true })
  return () => {
    if (previous) Object.defineProperty(crypto.subtle, 'exportKey', previous)
    else Reflect.deleteProperty(crypto.subtle, 'exportKey')
  }
}

describe('X25519 public key derivation', () => {
  let restoreExportKey: (() => void) | null = null

  afterEach(() => {
    restoreExportKey?.()
    restoreExportKey = null
  })

  it('matches the RFC 7748 test vector', async () => {
    const adapter = new WebCryptoProtocolCryptoAdapter()

    const publicKey = await adapter.x25519PublicFromSeed(fromHex(RFC7748_PRIVATE_KEY))

    expect(toHex(publicKey)).toBe(RFC7748_PUBLIC_KEY)
  })

  it('derives the public key without exporting private key material', async () => {
    restoreExportKey = simulateEngineWithoutPrivateKeyExport()
    const adapter = new WebCryptoProtocolCryptoAdapter()

    const publicKey = await adapter.x25519PublicFromSeed(fromHex(RFC7748_PRIVATE_KEY))

    expect(toHex(publicKey)).toBe(RFC7748_PUBLIC_KEY)
  })

  it('builds an identity vault handle without exporting private key material', async () => {
    restoreExportKey = simulateEngineWithoutPrivateKeyExport()
    const adapter = new WebCryptoProtocolCryptoAdapter()
    const seed = crypto.getRandomValues(new Uint8Array(64))

    const handle = await adapter.createIdentityVaultCryptoHandle(seed)

    expect(handle.x25519PublicKey.length).toBe(32)
    expect(handle.ed25519PublicKey.length).toBe(32)
  })

  it('derives an encryption key pair without exporting private key material', async () => {
    restoreExportKey = simulateEngineWithoutPrivateKeyExport()
    const adapter = new WebCryptoAdapter()

    const keyPair = await adapter.deriveEncryptionKeyPair(fromHex(RFC7748_PRIVATE_KEY))
    const publicKey = new Uint8Array(await crypto.subtle.exportKey('raw', keyPair.keyPair.publicKey))

    expect(toHex(publicKey)).toBe(RFC7748_PUBLIC_KEY)
  })

  it('produces the same public key that ECDH agrees on', async () => {
    const adapter = new WebCryptoProtocolCryptoAdapter()
    const alicePrivate = crypto.getRandomValues(new Uint8Array(32))
    const bobPrivate = crypto.getRandomValues(new Uint8Array(32))

    const alicePublic = await adapter.x25519PublicFromSeed(alicePrivate)
    const bobPublic = await adapter.x25519PublicFromSeed(bobPrivate)

    const aliceView = await adapter.x25519SharedSecret(alicePrivate, bobPublic)
    const bobView = await adapter.x25519SharedSecret(bobPrivate, alicePublic)

    expect(aliceView).toEqual(bobView)
  })
})
