export interface SpecCryptoAdapter {
  verifyEd25519(input: Uint8Array, signature: Uint8Array, publicKey: Uint8Array): Promise<boolean>
  sha256(input: Uint8Array): Promise<Uint8Array>
  hkdfSha256(input: Uint8Array, info: string, length: number): Promise<Uint8Array>
  x25519PublicFromSeed(seed: Uint8Array): Promise<Uint8Array>
}
