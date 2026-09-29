import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { WebSocketMessagingAdapter } from '../src/adapters/messaging/WebSocketMessagingAdapter'
import { InMemoryOutboxStore } from '../src/adapters/messaging/InMemoryOutboxStore'
import { OutboxMessagingAdapter } from '../src/adapters/messaging/OutboxMessagingAdapter'
import { TracedOutboxMessagingAdapter } from '../src/adapters/messaging/TracedOutboxMessagingAdapter'
import { getTraceLog } from '../src/storage/TraceLog'
import {
  ControlFrameRejectedError,
  createPresentCapabilityControlFrame,
  createSpaceCapabilityJws,
  formatBrokerChallengeNonce,
} from '../src/protocol'
import type { WireMessage } from '../src/ports/MessagingAdapter'

/**
 * wot#383 (follow-up of #382): a relay error that correlates to an in-flight
 * control frame (e.g. CAPABILITY_EXPIRED on present-capability) rejects the
 * control-frame promise and returns BEFORE the message callbacks — so it never
 * reached the receive trace. It must be traced once, with code and docId,
 * through the real WebSocket → Outbox → Traced chain, without changing the
 * promise semantics and without being delivered to message subscribers.
 */

const VALID_NONCE = formatBrokerChallengeNonce(new Uint8Array(32).fill(5))
const SPACE_ID = '11111111-1111-4111-8111-111111111111'
const DID = 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK'

class FakeWebSocket {
  static OPEN = 1
  static CONNECTING = 0
  static CLOSED = 3
  readyState = FakeWebSocket.CONNECTING
  onopen: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onerror: (() => void) | null = null
  onclose: (() => void) | null = null
  sent: string[] = []

  constructor(public url: string) {
    queueMicrotask(() => {
      this.readyState = FakeWebSocket.OPEN
      this.onopen?.()
    })
  }
  send(data: string): void {
    this.sent.push(data)
    const msg = JSON.parse(data)
    if (msg.type === 'register') {
      queueMicrotask(() => this.push({ type: 'challenge', nonce: VALID_NONCE }))
    }
    if (msg.type === 'challenge-response') {
      queueMicrotask(() =>
        this.push({ type: 'registered', did: msg.did, deviceId: msg.deviceId, isNewDevice: true }),
      )
    }
  }
  push(frame: unknown): void {
    this.onmessage?.({ data: JSON.stringify(frame) })
  }
  close(): void {
    this.readyState = FakeWebSocket.CLOSED
    this.onclose?.()
  }
}

let originalWebSocket: unknown

beforeEach(() => {
  originalWebSocket = (globalThis as { WebSocket?: unknown }).WebSocket
  ;(globalThis as { WebSocket: unknown }).WebSocket = FakeWebSocket as unknown
  getTraceLog().clear()
})

afterEach(() => {
  ;(globalThis as { WebSocket: unknown }).WebSocket = originalWebSocket
  getTraceLog().clear()
})

async function tracedChain(): Promise<{ traced: TracedOutboxMessagingAdapter; socket: FakeWebSocket }> {
  const ws = new WebSocketMessagingAdapter('ws://unused', {
    deviceId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    signBrokerAuthTranscript: async () => new Uint8Array(64).fill(1),
    sendTimeoutMs: 200,
  })
  const traced = new TracedOutboxMessagingAdapter(
    new OutboxMessagingAdapter(ws, new InMemoryOutboxStore(), { reconnectIntervalMs: 0 }),
  )
  await traced.connect(DID)
  const socket = (ws as unknown as { ws: FakeWebSocket }).ws
  getTraceLog().clear()
  return { traced, socket }
}

async function presentFrame(): Promise<ReturnType<typeof createPresentCapabilityControlFrame>> {
  const now = new Date()
  const capabilityJws = await createSpaceCapabilityJws({
    payload: {
      type: 'capability',
      spaceId: SPACE_ID,
      audience: DID,
      permissions: ['read', 'write'],
      generation: 0,
      issuedAt: now.toISOString(),
      validUntil: new Date(now.getTime() + 60_000).toISOString(),
    },
    signingSeed: new Uint8Array(32).fill(9),
  })
  return createPresentCapabilityControlFrame({ capabilityJws })
}

describe('TracedOutboxMessagingAdapter — correlated control-frame errors (wot#383)', () => {
  it('traces a correlated control-frame rejection once, with code and docId, and still rejects', async () => {
    const { traced, socket } = await tracedChain()
    const delivered: WireMessage[] = []
    traced.onMessage((m) => { delivered.push(m) })

    const promise = traced.sendControlFrame!(await presentFrame())
    socket.push({ type: 'error', thid: SPACE_ID, code: 'CAPABILITY_EXPIRED', message: 'expired' })

    // Promise semantics unchanged: the caller still gets the typed rejection.
    const err = await promise.catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ControlFrameRejectedError)
    expect((err as ControlFrameRejectedError).code).toBe('CAPABILITY_EXPIRED')

    // Not delivered to business message subscribers (the waiter owns it).
    expect(delivered).toHaveLength(0)

    // Traced exactly once, as a failure, with code and correlation.
    const failures = getTraceLog().getAll({ store: 'relay' }).filter((e) => e.success === false)
    expect(failures).toHaveLength(1)
    expect(failures[0].label).toBe(`control present-capability ${SPACE_ID.slice(0, 8)}… rejected CAPABILITY_EXPIRED`)
    expect(failures[0].error).toContain('CAPABILITY_EXPIRED')
    expect(failures[0].meta).toMatchObject({ frameType: 'present-capability', docId: SPACE_ID, code: 'CAPABILITY_EXPIRED' })
  })

  it('traces a successful control frame as a success', async () => {
    const { traced, socket } = await tracedChain()

    const promise = traced.sendControlFrame!(await presentFrame())
    socket.push({ type: 'receipt', receipt: { messageId: SPACE_ID, status: 'delivered', timestamp: 't' } })
    await expect(promise).resolves.toMatchObject({ messageId: SPACE_ID, status: 'delivered' })

    const entry = getTraceLog().getAll({ store: 'relay', operation: 'send' }).at(-1)
    expect(entry?.success).toBe(true)
    expect(entry?.label).toBe(`control present-capability ${SPACE_ID.slice(0, 8)}… delivered`)
    expect(entry?.meta).toMatchObject({ frameType: 'present-capability', docId: SPACE_ID })
  })
})
