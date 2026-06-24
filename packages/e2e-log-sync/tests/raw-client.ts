/**
 * Slice A / VE-11 — RAW authenticated relay client + capability helpers.
 *
 * A minimal hand-rolled client (register → challenge → challenge-response, then
 * present-capability / log-entry / sync-request) driven by a real identity. The
 * adapters always present a VALID capability, so the gate / capability-origin /
 * expiry tests use this raw client to present EXACTLY the capability under test.
 */
import { randomUUID } from 'node:crypto'
import WebSocket from 'ws'
import {
  createSpaceCapabilityJws,
  createPresentCapabilityControlFrame,
  encodeBase64Url,
  buildBrokerAuthTranscript,
  createBrokerAuthTranscriptSigningBytes,
  formatBrokerChallengeResponseSignature,
  createSpaceRegisterMessageWithSigner,
  createLogEntryMessage,
  createSyncRequestMessage,
  encryptLogPayload,
  createLogEntryJwsWithSigner,
} from '@web_of_trust/core/protocol'
import type { PublicIdentitySession } from '@web_of_trust/core/application'
import { WebCryptoProtocolCryptoAdapter } from '@web_of_trust/core/protocol-adapters'

export const helperCrypto = new WebCryptoProtocolCryptoAdapter()

export async function makeSpaceKeypair(): Promise<{ signingSeed: Uint8Array; verificationKey: string }> {
  const signingSeed = crypto.getRandomValues(new Uint8Array(32))
  const pub = await helperCrypto.ed25519PublicKeyFromSeed(signingSeed)
  return { signingSeed, verificationKey: encodeBase64Url(pub) }
}

export async function mintSpaceCap(params: {
  signingSeed: Uint8Array
  spaceId: string
  audience: string
  permissions: Array<'read' | 'write'>
  generation?: number
  validUntil?: string
}): Promise<string> {
  return createSpaceCapabilityJws({
    payload: {
      type: 'capability',
      spaceId: params.spaceId,
      audience: params.audience,
      permissions: params.permissions,
      generation: params.generation ?? 0,
      issuedAt: '2026-01-01T00:00:00Z',
      validUntil: params.validUntil ?? '2099-01-01T00:00:00Z',
    },
    signingSeed: params.signingSeed,
  })
}

export class RawRelayClient {
  private ws: WebSocket | null = null
  private outcomeWaiters: Array<(o: Record<string, unknown> | { error: string }) => void> = []
  private messageWaiters: Array<(env: Record<string, unknown>) => void> = []
  private messageBuffer: Record<string, unknown>[] = []
  readonly deviceId = randomUUID()

  constructor(private url: string, private identity: PublicIdentitySession) {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.url)
      this.ws = ws
      ws.on('open', () => ws.send(JSON.stringify({ type: 'register', did: this.identity.getDid(), deviceId: this.deviceId })))
      ws.on('message', (data) => {
        const msg = JSON.parse(data.toString())
        switch (msg.type) {
          case 'challenge': {
            const transcript = buildBrokerAuthTranscript({ did: this.identity.getDid(), deviceId: this.deviceId, nonce: msg.nonce })
            const bytes = createBrokerAuthTranscriptSigningBytes(transcript)
            this.identity.signEd25519(bytes)
              .then((sig) => ws.send(JSON.stringify({
                type: 'challenge-response',
                did: this.identity.getDid(),
                deviceId: this.deviceId,
                nonce: msg.nonce,
                signature: formatBrokerChallengeResponseSignature(sig),
              })))
              .catch(reject)
            break
          }
          case 'registered': resolve(); break
          case 'message': {
            const w = this.messageWaiters.shift()
            if (w) w(msg.envelope); else this.messageBuffer.push(msg.envelope)
            break
          }
          case 'receipt': this.outcomeWaiters.shift()?.(msg.receipt); break
          case 'error': this.outcomeWaiters.shift()?.({ error: msg.code }); break
        }
      })
      ws.on('error', reject)
    })
  }

  private nextOutcome(): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('Timeout waiting for outcome')), 3000)
      this.outcomeWaiters.push((o) => {
        clearTimeout(t)
        if ('error' in o) reject(new Error(String((o as { error: string }).error)))
        else resolve(o as Record<string, unknown>)
      })
    })
  }

  private rawSend(frame: Record<string, unknown>): void {
    this.ws!.send(JSON.stringify(frame))
  }

  async sendSpaceRegister(params: { spaceId: string; verificationKey: string; adminDids: string[] }): Promise<Record<string, unknown>> {
    const frame = await createSpaceRegisterMessageWithSigner({
      spaceId: params.spaceId,
      spaceCapabilityVerificationKey: params.verificationKey,
      adminDids: params.adminDids,
      kid: `${this.identity.getDid()}#sig-0`,
      sign: (b) => this.identity.signEd25519(b),
    })
    this.rawSend(frame as unknown as Record<string, unknown>)
    return this.nextOutcome()
  }

  async presentCapability(capabilityJws: string): Promise<Record<string, unknown>> {
    this.rawSend(createPresentCapabilityControlFrame({ capabilityJws }) as unknown as Record<string, unknown>)
    return this.nextOutcome()
  }

  async sendLogEntry(params: { spaceId: string; seq: number; plaintext: string }): Promise<Record<string, unknown>> {
    const spaceContentKey = await helperCrypto.sha256(new TextEncoder().encode(`raw-sck|${params.spaceId}`))
    const enc = await encryptLogPayload({
      crypto: helperCrypto,
      spaceContentKey,
      deviceId: this.deviceId,
      seq: params.seq,
      plaintext: new TextEncoder().encode(params.plaintext),
    })
    const entryJws = await createLogEntryJwsWithSigner({
      payload: {
        seq: params.seq,
        deviceId: this.deviceId,
        docId: params.spaceId,
        authorKid: `${this.identity.getDid()}#sig-0`,
        keyGeneration: 0,
        data: enc.blobBase64Url,
        timestamp: new Date().toISOString(),
      },
      sign: (b) => this.identity.signEd25519(b),
    })
    const message = createLogEntryMessage({
      id: randomUUID(),
      from: this.identity.getDid(),
      to: [this.identity.getDid()],
      createdTime: Math.floor(Date.now() / 1000),
      entry: entryJws,
    })
    this.rawSend({ type: 'send', envelope: message as unknown as Record<string, unknown> })
    return this.nextOutcome()
  }

  /**
   * Send a sync-request and resolve with the NEXT inbound frame, whatever it is: a
   * `sync-response` MESSAGE (success) or an `error` (gate failure). Both waiters are
   * mutually-cancelling so the unfired one cannot leak into a later call.
   */
  private sendSyncRequestRaw(spaceId: string): Promise<{ message?: Record<string, unknown>; error?: string }> {
    const req = createSyncRequestMessage({
      id: randomUUID(),
      from: this.identity.getDid(),
      createdTime: Math.floor(Date.now() / 1000),
      body: { docId: spaceId, heads: {} },
    })
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('Timeout waiting for sync-request answer')), 3000)
      const outcome = (o: Record<string, unknown> | { error: string }) => {
        clearTimeout(t)
        const i = this.messageWaiters.indexOf(message)
        if (i >= 0) this.messageWaiters.splice(i, 1)
        resolve('error' in o ? { error: String((o as { error: string }).error) } : {})
      }
      const message = (env: Record<string, unknown>) => {
        clearTimeout(t)
        const i = this.outcomeWaiters.indexOf(outcome)
        if (i >= 0) this.outcomeWaiters.splice(i, 1)
        resolve({ message: env })
      }
      this.outcomeWaiters.push(outcome)
      this.messageWaiters.push(message)
      this.rawSend({ type: 'send', envelope: req as unknown as Record<string, unknown> })
    })
  }

  async sendSyncRequest(spaceId: string): Promise<Record<string, unknown>> {
    const r = await this.sendSyncRequestRaw(spaceId)
    if (r.error) throw new Error(r.error)
    return r.message!
  }

  async sendSyncRequestExpectResponse(spaceId: string): Promise<Record<string, unknown>> {
    const r = await this.sendSyncRequestRaw(spaceId)
    if (r.error) throw new Error(`sync-request rejected: ${r.error}`)
    return r.message!
  }

  disconnect(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.ws) return resolve()
      this.ws.on('close', () => resolve())
      this.ws.close()
      this.ws = null
    })
  }
}
