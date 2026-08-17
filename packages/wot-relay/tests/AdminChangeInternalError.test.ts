import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { randomUUID } from 'crypto'
import WebSocket from 'ws'

// PR #347 Review Major 1 — verifier-INTERNAL errors on admin-change frames must
// stay correlatable. `handleAdminAdd`/`handleAdminRemove` know the spaceId by the
// time `verifyAdmin*Message()` runs; if the verifier THROWS (as opposed to
// returning a rejected disposition), the resulting INTERNAL_ERROR frame used to
// carry no `thid` — it matched no control-frame waiter, the sender timed out, and
// the workflow's `cause` degraded to a generic transport error again.
//
// The verifier only throws when the crypto layer itself throws, which cannot be
// provoked over the wire — so this suite mocks `protocol.verifyAdminRemoveMessage`
// to throw and asserts over the REAL socket that the error frame arrives promptly
// AND carries `thid == spaceId`.
vi.mock('@web_of_trust/core', async (importOriginal) => {
  const mod = (await importOriginal()) as { protocol: Record<string, unknown> }
  return {
    ...mod,
    protocol: {
      ...mod.protocol,
      verifyAdminRemoveMessage: async () => {
        throw new Error('injected verifier crash (AdminChangeInternalError.test)')
      },
    },
  }
})

// Imported AFTER the mock so the relay's destructured `const {...} = protocol`
// picks up the throwing verifier.
import { RelayServer } from '../src/relay.js'
import { protocol, WebCryptoProtocolCryptoAdapter } from '@web_of_trust/core'

const PORT = 9897
const RELAY_URL = `ws://localhost:${PORT}`
const cryptoAdapter = new WebCryptoProtocolCryptoAdapter()

const ED25519_PKCS8_PREFIX = Uint8Array.from([
  0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x04, 0x22, 0x04, 0x20,
])

interface RawIdentity {
  seed: Uint8Array
  did: string
  authorKid: string
  deviceId: string
  signTranscriptBytes: (bytes: Uint8Array) => Promise<Uint8Array>
}

async function makeRawIdentity(label: string): Promise<RawIdentity> {
  const seed = await cryptoAdapter.sha256(new TextEncoder().encode(`admin-internal-error-test/seed/${label}`))
  const pub = await cryptoAdapter.ed25519PublicKeyFromSeed(seed)
  const did = protocol.publicKeyToDidKey(pub)
  const pkcs8 = new Uint8Array(ED25519_PKCS8_PREFIX.length + seed.length)
  pkcs8.set(ED25519_PKCS8_PREFIX)
  pkcs8.set(seed, ED25519_PKCS8_PREFIX.length)
  const signingKey = await crypto.subtle.importKey('pkcs8', pkcs8, { name: 'Ed25519' }, false, ['sign'])
  return {
    seed,
    did,
    authorKid: `${did}#sig-0`,
    deviceId: randomUUID(),
    signTranscriptBytes: async (bytes) => new Uint8Array(await crypto.subtle.sign('Ed25519', signingKey, bytes)),
  }
}

/** Minimal authenticated client: register→challenge→registered, then raw control frames. */
class MiniClient {
  private ws: WebSocket | null = null
  private waiters: Array<(outcome: Record<string, unknown>) => void> = []

  constructor(private identity: RawIdentity) {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(RELAY_URL)
      this.ws = ws
      ws.on('open', () => {
        ws.send(JSON.stringify({ type: 'register', did: this.identity.did, deviceId: this.identity.deviceId }))
      })
      ws.on('message', (data) => {
        const msg = JSON.parse(data.toString()) as Record<string, unknown> & { type: string }
        if (msg.type === 'challenge') {
          const transcript = protocol.buildBrokerAuthTranscript({
            did: this.identity.did,
            deviceId: this.identity.deviceId,
            nonce: msg.nonce as string,
          })
          const signingBytes = protocol.createBrokerAuthTranscriptSigningBytes(transcript)
          void this.identity.signTranscriptBytes(signingBytes).then((sig) => {
            ws.send(JSON.stringify({
              type: 'challenge-response',
              did: this.identity.did,
              deviceId: this.identity.deviceId,
              nonce: msg.nonce,
              signature: protocol.formatBrokerChallengeResponseSignature(sig),
            }))
          })
        } else if (msg.type === 'registered') {
          resolve()
        } else if (msg.type === 'receipt') {
          this.waiters.shift()?.(msg.receipt as Record<string, unknown>)
        } else if (msg.type === 'error') {
          this.waiters.shift()?.({ error: msg.code, thid: msg.thid, message: msg.message })
        }
      })
      ws.on('error', reject)
    })
  }

  sendControlFrame(frame: Record<string, unknown>, timeoutMs = 3000): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timeout waiting for control-frame outcome')), timeoutMs)
      this.waiters.push((outcome) => {
        clearTimeout(timer)
        resolve(outcome)
      })
      this.ws!.send(JSON.stringify(frame))
    })
  }

  disconnect(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.ws) return resolve()
      this.ws.on('close', () => resolve())
      this.ws.close()
    })
  }
}

describe('admin-change verifier-INTERNAL errors carry thid (PR #347 Major 1)', () => {
  let server: RelayServer

  beforeEach(async () => {
    server = new RelayServer({ port: PORT })
    await server.start()
  })

  afterEach(async () => {
    await server.stop()
  })

  it('a throwing admin-remove verifier answers INTERNAL_ERROR with thid == spaceId, promptly (no waiter timeout)', async () => {
    const admin = await makeRawIdentity('crash-admin')
    const client = new MiniClient(admin)
    await client.connect()

    const docId = randomUUID()
    const capSeed = new Uint8Array(32).fill(3)
    const capPub = await cryptoAdapter.ed25519PublicKeyFromSeed(capSeed)
    const registerFrame = await protocol.createSpaceRegisterMessage({
      spaceId: docId,
      spaceCapabilityVerificationKey: protocol.encodeBase64Url(capPub),
      adminDids: [admin.did],
      kid: admin.authorKid,
      signingSeed: admin.seed,
    })
    const registered = await client.sendControlFrame(registerFrame as unknown as Record<string, unknown>)
    expect(registered.status).toBe('delivered')

    // Well-formed, admin-signed admin-remove — parse and resolveAdminSigner pass,
    // then the (mocked) verifier throws.
    const removeFrame = await protocol.createAdminRemoveMessage({
      spaceId: docId,
      removedAdminDid: admin.did,
      kid: admin.authorKid,
      signingSeed: admin.seed,
    })
    const started = Date.now()
    const outcome = await client.sendControlFrame(removeFrame as unknown as Record<string, unknown>)

    expect(outcome).toMatchObject({ error: 'INTERNAL_ERROR', thid: docId })
    // Promptness is the point of the correlation: the sender's per-docId waiter
    // must reject immediately instead of running into its send timeout.
    expect(Date.now() - started).toBeLessThan(1500)

    await client.disconnect()
  })
})
