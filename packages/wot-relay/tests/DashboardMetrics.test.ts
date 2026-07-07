import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { randomUUID } from 'node:crypto'
import WebSocket from 'ws'
import { RelayServer } from '../src/relay.js'
import { RelayMetrics, METRICS_BUCKET_SECONDS } from '../src/metrics.js'
import type { DocLog } from '../src/log-store.js'
import type { OfflineQueue } from '../src/queue.js'
import type { RelayMessage } from '../src/types.js'
import { protocol, WebCryptoProtocolCryptoAdapter } from '@web_of_trust/core'

// Relay-Metriken Stufe 1 — server-level tests:
//  (1) PROOF that the 10s bucket-flush timer is wired in start() and stopped by
//      stop() (a periodic task without a wired call-site is a silent leak),
//  (2) GET /dashboard/metrics: shape, window parameter, no-store, route tolerance,
//      and NO ids in the response (aggregates only),
//  (3) counter WIRING over the real WS protocol (in-process harness): ingestOk,
//      a reject code, ws connect/disconnect churn, receipts/error frames.

const GAUGES = { connections: 0, queuePendingTotal: 0 }

function reachMetrics(server: RelayServer): RelayMetrics {
  return (server as unknown as { metrics: RelayMetrics }).metrics
}
function reachDocLog(server: RelayServer): DocLog {
  return (server as unknown as { docLog: DocLog }).docLog
}
function reachQueue(server: RelayServer): OfflineQueue {
  return (server as unknown as { queue: OfflineQueue }).queue
}

async function waitFor(cond: () => boolean, timeoutMs = 2000): Promise<void> {
  const start = Date.now()
  while (!cond()) {
    if (Date.now() - start > timeoutMs) throw new Error('waitFor timed out')
    await new Promise((r) => setTimeout(r, 20))
  }
}

describe('metrics flush timer — wired in start(), stopped by stop() (PROOF)', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('produces a new bucket every 10s while running and none after stop()', async () => {
    vi.useFakeTimers()
    const server = new RelayServer({ port: 0, dbPath: ':memory:' }) // default interval = 10s
    await server.start()
    try {
      const metrics = reachMetrics(server)
      expect(metrics.query('1h', Date.now()).buckets).toHaveLength(0)

      await vi.advanceTimersByTimeAsync(METRICS_BUCKET_SECONDS * 1000)
      expect(metrics.query('1h', Date.now()).buckets).toHaveLength(1)

      await vi.advanceTimersByTimeAsync(2 * METRICS_BUCKET_SECONDS * 1000)
      expect(metrics.query('1h', Date.now()).buckets).toHaveLength(3)

      await server.stop()
      await vi.advanceTimersByTimeAsync(5 * METRICS_BUCKET_SECONDS * 1000)
      expect(metrics.query('1h', Date.now()).buckets).toHaveLength(3) // timer is GONE
    } finally {
      // stop() is idempotent-safe here: guard for the assertion-failure path.
      await server.stop().catch(() => {})
    }
  })

  it('metricsIntervalMs: 0 disables the timer (test seam, mirrors gcIntervalMs)', async () => {
    vi.useFakeTimers()
    const server = new RelayServer({ port: 0, dbPath: ':memory:', metricsIntervalMs: 0 })
    await server.start()
    try {
      await vi.advanceTimersByTimeAsync(10 * METRICS_BUCKET_SECONDS * 1000)
      expect(reachMetrics(server).query('1h', Date.now()).buckets).toHaveLength(0)
    } finally {
      await server.stop()
    }
  })
})

describe('GET /dashboard/metrics — shape, window, headers, no ids', () => {
  let server: RelayServer
  let httpBase: string

  beforeEach(async () => {
    // Timer disabled — tests drive flush() with a controlled clock.
    server = new RelayServer({ port: 0, dbPath: ':memory:', metricsIntervalMs: 0 })
    await server.start()
    httpBase = `http://localhost:${server.port}`
  })

  afterEach(async () => {
    await server.stop()
  })

  it('serves { bucketSeconds, window, windowSeconds, buckets[] } with t + spanSeconds per bucket', async () => {
    const t0 = Date.now() - 30_000
    const metrics = reachMetrics(server)
    metrics.countIngestOk()
    metrics.flush(t0, GAUGES)
    metrics.flush(t0 + 10_000, { connections: 2, queuePendingTotal: 1 })

    const res = await fetch(`${httpBase}/dashboard/metrics`)
    expect(res.ok).toBe(true)
    const json = (await res.json()) as {
      bucketSeconds: number
      window: string
      windowSeconds: number
      buckets: Array<Record<string, unknown>>
    }
    expect(json.bucketSeconds).toBe(METRICS_BUCKET_SECONDS)
    expect(json.window).toBe('1h') // default
    expect(json.windowSeconds).toBe(3600)
    expect(json.buckets).toHaveLength(2)
    expect(json.buckets[0].t).toBe(t0)
    expect(json.buckets[0].spanSeconds).toBe(METRICS_BUCKET_SECONDS)
    expect(json.buckets[0].ingestOk).toBe(1)
    expect(json.buckets[1].connections).toBe(2)
    expect(json.buckets[1].queuePendingTotal).toBe(1)
    // Every bucket carries the closed-catalog reject map (possibly empty object).
    expect(json.buckets[0].ingestRejectByCode).toEqual({})
  })

  it('accepts ?window=15m|6h|24h and falls back to 1h on junk', async () => {
    for (const [win, seconds] of [['15m', 900], ['6h', 21600], ['24h', 86400]] as const) {
      const json = (await (await fetch(`${httpBase}/dashboard/metrics?window=${win}`)).json()) as {
        window: string
        windowSeconds: number
      }
      expect(json.window).toBe(win)
      expect(json.windowSeconds).toBe(seconds)
    }
    const junk = (await (await fetch(`${httpBase}/dashboard/metrics?window=__proto__`)).json()) as {
      window: string
    }
    expect(junk.window).toBe('1h')
  })

  it('sets Cache-Control: no-store and tolerates a trailing slash', async () => {
    const res = await fetch(`${httpBase}/dashboard/metrics`)
    expect(res.headers.get('content-type')).toContain('application/json')
    expect(res.headers.get('cache-control')).toBe('no-store')
    const slash = await fetch(`${httpBase}/dashboard/metrics/?window=15m`)
    expect(slash.ok).toBe(true)
    expect((await slash.json() as { window: string }).window).toBe('15m')
  })

  it('CRITICAL: the metrics response contains NO DID / deviceId / docId strings (aggregates only)', async () => {
    const FULL_DID = 'did:key:z6MkmetricsFullDidAAAABBBBCCCCDDDDEEEE'
    const SPEAKING_DOC_ID = 'familie-mueller-metrics-2026'
    const deviceId = randomUUID()
    reachDocLog(server).appendEntry({
      docId: SPEAKING_DOC_ID, deviceId, seq: 0, contentHash: 'h0', entryJws: 'jws0',
    })
    reachQueue(server).enqueueFanout({
      messageId: randomUUID(), toDid: FULL_DID, envelope: { t: 'x' }, deliveryTargetDeviceIds: [deviceId],
    })
    const metrics = reachMetrics(server)
    metrics.countIngestOk()
    metrics.countIngestReject('AUTH_INVALID')
    metrics.flush(Date.now(), { connections: 1, queuePendingTotal: 1 })

    const text = await (await fetch(`${httpBase}/dashboard/metrics?window=15m`)).text()
    expect(text).not.toContain(FULL_DID)
    expect(text).not.toContain(SPEAKING_DOC_ID)
    expect(text).not.toContain('familie')
    expect(text).not.toContain(deviceId)
    // ...while the aggregates ARE there.
    const json = JSON.parse(text) as { buckets: Array<{ ingestOk: number | null }> }
    expect(json.buckets[json.buckets.length - 1].ingestOk).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Counter WIRING over the real WS protocol (mirrors the DurableLogSync harness,
// reduced to the personal-doc path).
// ---------------------------------------------------------------------------

const cryptoAdapter = new WebCryptoProtocolCryptoAdapter()
const {
  buildBrokerAuthTranscript,
  createBrokerAuthTranscriptSigningBytes,
  formatBrokerChallengeResponseSignature,
} = protocol

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
  const seed = await cryptoAdapter.sha256(new TextEncoder().encode(`metrics-wiring-test/seed/${label}`))
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

type SendOutcome = Record<string, unknown> | { error: string }

class MiniClient {
  private ws: WebSocket | null = null
  private outcomeWaiters: Array<(outcome: SendOutcome) => void> = []

  constructor(private identity: RawIdentity, private url: string) {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.url)
      this.ws = ws
      ws.on('open', () => {
        ws.send(JSON.stringify({ type: 'register', did: this.identity.did, deviceId: this.identity.deviceId }))
      })
      ws.on('message', (data) => {
        const msg = JSON.parse(data.toString()) as RelayMessage
        if (msg.type === 'challenge') {
          const transcript = buildBrokerAuthTranscript({
            did: this.identity.did,
            deviceId: this.identity.deviceId,
            nonce: msg.nonce,
          })
          this.identity
            .signTranscriptBytes(createBrokerAuthTranscriptSigningBytes(transcript))
            .then((sig) =>
              ws.send(
                JSON.stringify({
                  type: 'challenge-response',
                  did: this.identity.did,
                  deviceId: this.identity.deviceId,
                  nonce: msg.nonce,
                  signature: formatBrokerChallengeResponseSignature(sig),
                }),
              ),
            )
            .catch(reject)
        } else if (msg.type === 'registered') {
          resolve()
        } else if (msg.type === 'receipt') {
          this.outcomeWaiters.shift()?.(msg.receipt as unknown as Record<string, unknown>)
        } else if (msg.type === 'error') {
          this.outcomeWaiters.shift()?.({ error: msg.code })
        }
      })
      ws.on('error', reject)
    })
  }

  private awaitOutcome(send: () => void): Promise<SendOutcome> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timeout waiting for outcome')), 3000)
      this.outcomeWaiters.push((outcome) => {
        clearTimeout(timer)
        resolve(outcome)
      })
      send()
    })
  }

  send(envelope: Record<string, unknown>): Promise<SendOutcome> {
    return this.awaitOutcome(() => this.ws!.send(JSON.stringify({ type: 'send', envelope })))
  }

  presentCapability(capabilityJws: string): Promise<SendOutcome> {
    return this.awaitOutcome(() =>
      this.ws!.send(JSON.stringify({ type: 'present-capability', capabilityJws })),
    )
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

async function mintPersonalDocCapability(owner: RawIdentity, docId: string): Promise<string> {
  return protocol.createPersonalDocCapabilityJws({
    payload: {
      type: 'capability',
      spaceId: docId,
      audience: owner.did,
      permissions: ['read', 'write'],
      generation: 0,
      issuedAt: '2026-01-01T00:00:00Z',
      validUntil: '2099-01-01T00:00:00Z',
    },
    kid: owner.authorKid,
    signingSeed: owner.seed,
  })
}

async function buildLogEntryEnvelope(identity: RawIdentity, docId: string, seq: number): Promise<Record<string, unknown>> {
  const spaceContentKey = await cryptoAdapter.sha256(new TextEncoder().encode(`sck|${docId}|gen0`))
  const enc = await protocol.encryptLogPayload({
    crypto: cryptoAdapter,
    spaceContentKey,
    deviceId: identity.deviceId,
    seq,
    plaintext: new TextEncoder().encode(`metrics-test-${seq}`),
  })
  const entryJws = await protocol.createLogEntryJws({
    payload: {
      seq,
      deviceId: identity.deviceId,
      docId,
      authorKid: identity.authorKid,
      keyGeneration: 0,
      data: enc.blobBase64Url,
      timestamp: '2026-07-07T10:00:00Z',
    },
    signingSeed: identity.seed,
  })
  return protocol.createLogEntryMessage({
    id: randomUUID(),
    from: identity.did,
    to: [identity.did],
    createdTime: Math.floor(Date.now() / 1000),
    entry: entryJws,
  }) as unknown as Record<string, unknown>
}

describe('counter wiring over the real WS protocol (in-process harness)', () => {
  let server: RelayServer
  let wsUrl: string

  beforeEach(async () => {
    server = new RelayServer({ port: 0, dbPath: ':memory:', metricsIntervalMs: 0 })
    await server.start()
    wsUrl = `ws://localhost:${server.port}`
  })

  afterEach(async () => {
    await server.stop()
  })

  it('counts wsConnects/rawWsConnects, ingestOk, receipts, a reject code, errorFrames, wsDisconnects', async () => {
    const metrics = reachMetrics(server)
    const writer = await makeRawIdentity('writer')
    const rejected = await makeRawIdentity('rejected')

    // (1) Authenticated connect → raw + authenticated churn counters.
    const writerClient = new MiniClient(writer, wsUrl)
    await writerClient.connect()
    expect(metrics.snapshotCounters().rawWsConnects).toBe(1)
    expect(metrics.snapshotCounters().wsConnects).toBe(1)

    // (2) Personal-doc capability + valid log-entry → ingestOk + delivered receipts.
    const docId = randomUUID()
    const capOutcome = await writerClient.presentCapability(await mintPersonalDocCapability(writer, docId))
    expect((capOutcome as { status?: string }).status).toBe('delivered')
    const okOutcome = await writerClient.send(await buildLogEntryEnvelope(writer, docId, 0))
    expect((okOutcome as { status?: string }).status).toBe('delivered')
    expect(metrics.snapshotCounters().ingestOk).toBe(1)
    expect(metrics.snapshotCounters().ingestRejects.CAPABILITY_REQUIRED).toBe(0)
    // Central sendTo hook counted the delivered receipts (capability + log-entry).
    expect(metrics.snapshotCounters().receiptsDelivered).toBeGreaterThanOrEqual(2)

    // (3) A second identity sends a log-entry WITHOUT presenting a capability →
    // CAPABILITY_REQUIRED reject + an error frame, ingestOk unchanged.
    const rejectedClient = new MiniClient(rejected, wsUrl)
    await rejectedClient.connect()
    const rejOutcome = await rejectedClient.send(await buildLogEntryEnvelope(rejected, randomUUID(), 0))
    expect((rejOutcome as { error?: string }).error).toBe('CAPABILITY_REQUIRED')
    expect(metrics.snapshotCounters().ingestRejects.CAPABILITY_REQUIRED).toBe(1)
    expect(metrics.snapshotCounters().ingestOk).toBe(1) // unchanged
    expect(metrics.snapshotCounters().errorFramesSent).toBeGreaterThanOrEqual(1)
    expect(metrics.snapshotCounters().wsConnects).toBe(2)

    // (4) Disconnect both → authenticated-session disconnect counter.
    await writerClient.disconnect()
    await rejectedClient.disconnect()
    await waitFor(() => metrics.snapshotCounters().wsDisconnects === 2)

    // (5) The wired counters land in the ring on the next flush (delta bucket).
    metrics.flush(Date.now(), { connections: 0, queuePendingTotal: 0 })
    const { buckets } = metrics.query('15m', Date.now())
    const last = buckets[buckets.length - 1]
    expect(last.ingestOk).toBe(1)
    expect(last.ingestRejectByCode).toEqual({ CAPABILITY_REQUIRED: 1 })
    expect(last.wsConnects).toBe(2)
    expect(last.wsDisconnects).toBe(2)
    // The timed sqlite ingest write left a p95 sample for this bucket.
    expect(last.sqliteWriteP95Ms).not.toBeNull()
  })
})
