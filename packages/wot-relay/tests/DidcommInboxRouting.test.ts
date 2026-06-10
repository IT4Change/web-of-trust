import { describe, expect, it, beforeEach } from 'vitest'
import { RelayServer } from '../src/relay.js'

// Relay-Seite der Inbox-Wire-Migration (Sync 003):
// - Routing liest to[0] für DIDComm-Envelopes (Old-World toDid unverändert)
// - ack/1.0-Envelope → queue.ack-Mapping statt Routing (K1: Queue behält
//   DIDComm-Nachrichten bis zum expliziten ack/1.0 des Reception-Hosts)
// Per-Device-Inboxen sind SPEC-DEFERRED (Queue ist per-DID).
//
// Direkte Handler-Tests gegen die privaten Methoden mit Fake-Sockets — die
// Auth-/Netzwerk-Schicht ist in relay.test.ts abgedeckt.

const ALICE = 'did:key:z6MkAliceRelayInbox'
const BOB = 'did:key:z6MkBobRelayInbox'

const ACK_TYPE = 'https://web-of-trust.de/protocols/ack/1.0'
const INVITE_TYPE = 'https://web-of-trust.de/protocols/space-invite/1.0'

interface FakeWs {
  readyState: number
  OPEN: number
  frames: Array<Record<string, unknown>>
  send(data: string): void
}

function fakeWs(): FakeWs {
  const frames: Array<Record<string, unknown>> = []
  return {
    readyState: 1,
    OPEN: 1,
    frames,
    send(data: string) {
      frames.push(JSON.parse(data) as Record<string, unknown>)
    },
  }
}

interface RelayInternals {
  socketToDid: Map<unknown, string>
  connections: Map<string, Set<unknown>>
  queue: {
    getUnacked(did: string): unknown[]
    dequeue(did: string): unknown[]
    count(did?: string): number
  }
  handleSend(ws: unknown, envelope: Record<string, unknown>): void
}

function setup() {
  const server = new RelayServer({ port: 0 }) as unknown as RelayInternals
  const alice = fakeWs()
  const bob = fakeWs()
  server.socketToDid.set(alice, ALICE)
  server.socketToDid.set(bob, BOB)
  server.connections.set(ALICE, new Set([alice]))
  server.connections.set(BOB, new Set([bob]))
  return { server, alice, bob }
}

function didcommEnvelope(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: '550e8400-e29b-41d4-a716-446655440000',
    typ: 'application/didcomm-plain+json',
    type: INVITE_TYPE,
    from: ALICE,
    to: [BOB],
    created_time: 1781438400,
    body: { epk: 'ZXBr', nonce: 'bm9uY2U', ciphertext: 'Y2lwaGVydGV4dA' },
    ...overrides,
  }
}

function ackEnvelope(messageId: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: '7a1c2f80-aabb-4cdd-9eef-112233445566',
    typ: 'application/didcomm-plain+json',
    type: ACK_TYPE,
    from: BOB,
    created_time: 1781438401,
    thid: messageId,
    body: { messageId },
    ...overrides,
  }
}

describe('Relay DIDComm inbox routing + ack/1.0 mapping', () => {
  let ctx: ReturnType<typeof setup>
  beforeEach(() => {
    ctx = setup()
  })

  it('routes a DIDComm envelope via to[0] and keeps it queued until ack (K1)', () => {
    const envelope = didcommEnvelope()
    ctx.server.handleSend(ctx.alice, envelope)

    expect(ctx.bob.frames).toEqual([{ type: 'message', envelope }])
    expect(ctx.alice.frames).toEqual([
      expect.objectContaining({ type: 'receipt', receipt: expect.objectContaining({ status: 'delivered' }) }),
    ])
    // K1: kein Auto-ACK clientseitig → die Nachricht bleibt als unacked in der
    // Queue und würde bei Reconnect redelivered.
    expect(ctx.server.queue.getUnacked(BOB)).toHaveLength(1)
  })

  it('clears the queue when the reception host sends ack/1.0 and confirms with a receipt', () => {
    const envelope = didcommEnvelope()
    ctx.server.handleSend(ctx.alice, envelope)
    expect(ctx.server.queue.getUnacked(BOB)).toHaveLength(1)

    const ack = ackEnvelope(envelope.id as string)
    ctx.server.handleSend(ctx.bob, ack)

    expect(ctx.server.queue.getUnacked(BOB)).toHaveLength(0)
    // ack/1.0 wird gemappt, nicht geroutet — niemand bekommt es als Message.
    expect(ctx.alice.frames.filter((f) => f.type === 'message')).toHaveLength(0)
    expect(ctx.bob.frames.at(-1)).toEqual(
      expect.objectContaining({
        type: 'receipt',
        receipt: expect.objectContaining({ messageId: ack.id, status: 'delivered' }),
      }),
    )
  })

  it('rejects an ack/1.0 whose thid does not match body.messageId (Sync 003 Z.609)', () => {
    const envelope = didcommEnvelope()
    ctx.server.handleSend(ctx.alice, envelope)

    ctx.server.handleSend(
      ctx.bob,
      ackEnvelope(envelope.id as string, { thid: '99999999-9999-4999-8999-999999999999' }),
    )

    expect(ctx.bob.frames.at(-1)).toEqual(
      expect.objectContaining({ type: 'error', code: 'MALFORMED_MESSAGE' }),
    )
    expect(ctx.server.queue.getUnacked(BOB)).toHaveLength(1)
  })

  it('rejects an ack/1.0 without body.messageId', () => {
    ctx.server.handleSend(ctx.bob, ackEnvelope('x', { body: {} }))
    expect(ctx.bob.frames).toEqual([
      expect.objectContaining({ type: 'error', code: 'MALFORMED_MESSAGE' }),
    ])
  })

  it('keeps routing the old-world string type ack as an opaque message (Integration-Parität)', () => {
    const oldWorldAck = {
      v: 1,
      id: '11111111-2222-4333-8444-555555555555',
      type: 'ack',
      fromDid: ALICE,
      toDid: BOB,
      createdAt: '2026-06-10T12:00:00Z',
      encoding: 'json',
      payload: '{}',
      signature: '',
    }
    ctx.server.handleSend(ctx.alice, oldWorldAck as unknown as Record<string, unknown>)
    expect(ctx.bob.frames).toEqual([{ type: 'message', envelope: oldWorldAck }])
  })

  it('queues a DIDComm envelope for an offline recipient via to[0]', () => {
    ctx.server.connections.delete(BOB)
    const envelope = didcommEnvelope()
    ctx.server.handleSend(ctx.alice, envelope)
    expect(ctx.alice.frames).toEqual([
      expect.objectContaining({ type: 'receipt', receipt: expect.objectContaining({ status: 'accepted' }) }),
    ])
    expect(ctx.server.queue.dequeue(BOB)).toEqual([envelope])
  })

  it('still rejects envelopes without any recipient field', () => {
    ctx.server.handleSend(ctx.alice, didcommEnvelope({ to: undefined }))
    expect(ctx.alice.frames).toEqual([
      expect.objectContaining({ type: 'error', code: 'MISSING_RECIPIENT' }),
    ])
  })
})
