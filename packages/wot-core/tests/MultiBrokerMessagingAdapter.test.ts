import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MultiBrokerMessagingAdapter } from '../src/adapters/messaging/MultiBrokerMessagingAdapter'
import { routeForEnvelope, FANOUT_TYPES } from '../src/adapters/messaging/broker-routing-policy'
import type { MessagingAdapter, WireMessage } from '../src/ports/MessagingAdapter'
import type { DeliveryReceipt, MessagingState } from '../src/types/messaging'
import { INBOX_MESSAGE_TYPE } from '../src/protocol/messaging/inbox-message'
import { LOG_ENTRY_MESSAGE_TYPE } from '../src/protocol/sync/log-entry'
import { ACK_MESSAGE_TYPE } from '../src/protocol/sync/ack-message'
import { createDidcommTestMessage } from './helpers/didcomm-wire'

const DID = 'did:key:z6MkMultiBrokerTest1234567890abcdefghijk'

/** Controllable fake child adapter (state machine + scripted send). */
class FakeChild implements MessagingAdapter {
  state: MessagingState = 'disconnected'
  sent: WireMessage[] = []
  stateCbs = new Set<(s: MessagingState) => void>()
  receiptCbs = new Set<(r: DeliveryReceipt) => void>()
  messageCbs = new Set<(e: WireMessage) => void | Promise<void>>()
  connectImpl: () => Promise<void> = async () => { this.setState('connected') }
  sendImpl: (e: WireMessage) => Promise<DeliveryReceipt> = async (e) => ({
    messageId: (e as { id: string }).id, status: 'delivered', timestamp: 't',
  })
  connectCalls = 0

  setState(s: MessagingState) { this.state = s; this.stateCbs.forEach((cb) => cb(s)) }
  async connect(): Promise<void> { this.connectCalls += 1; await this.connectImpl() }
  async disconnect(): Promise<void> { this.setState('disconnected') }
  getState() { return this.state }
  onStateChange(cb: (s: MessagingState) => void) { this.stateCbs.add(cb); return () => this.stateCbs.delete(cb) }
  async send(e: WireMessage) {
    if (this.state !== 'connected') throw new Error('must call connect() before send()')
    this.sent.push(e); return this.sendImpl(e)
  }
  onMessage(cb: (e: WireMessage) => void | Promise<void>) { this.messageCbs.add(cb); return () => this.messageCbs.delete(cb) }
  onReceipt(cb: (r: DeliveryReceipt) => void) { this.receiptCbs.add(cb); return () => this.receiptCbs.delete(cb) }
  pushReceipt(r: DeliveryReceipt) { this.receiptCbs.forEach((cb) => cb(r)) }
  pushMessage(e: WireMessage) { this.messageCbs.forEach((cb) => cb(e)) }
  async registerTransport(): Promise<void> {}
  async resolveTransport(): Promise<string | null> { return null }
}

function inboxEnvelope(id?: string) {
  return createDidcommTestMessage({ from: DID, to: [DID], type: INBOX_MESSAGE_TYPE, ...(id ? { id } : {}) })
}
function logEnvelope() {
  return createDidcommTestMessage({ from: DID, to: [DID], type: LOG_ENTRY_MESSAGE_TYPE })
}

describe('MultiBrokerMessagingAdapter (Stage A)', () => {
  let box: FakeChild
  let server: FakeChild
  let multi: MultiBrokerMessagingAdapter

  beforeEach(() => {
    box = new FakeChild()
    server = new FakeChild()
    multi = new MultiBrokerMessagingAdapter([box, server], { connectTimeoutMs: 200, reconnectIntervalMs: 0 })
  })
  afterEach(async () => { await multi.disconnect(); vi.useRealTimers() })

  // T1 — policy: fanout types to all connected, everything else strictly primary
  it('T1: routes the inbox family to ALL connected brokers, everything else only to the primary', async () => {
    await multi.connect(DID)
    await multi.send(inboxEnvelope() as never)
    expect(box.sent).toHaveLength(1)
    expect(server.sent).toHaveLength(1)

    await multi.send(logEnvelope() as never)
    expect(box.sent).toHaveLength(2)
    expect(server.sent).toHaveLength(1) // log-entry NEVER reaches the secondary

    // Old-World content (Automerge channel) → primary only (default-primary)
    await multi.send({ v: 1, id: 'x', type: 'content', fromDid: DID, toDid: DID, createdAt: 't', encoding: 'json', payload: '{}', signature: 's' } as never)
    expect(server.sent).toHaveLength(1)
  })

  it('T1b: ACK is a fanout type; policy is a pure exported function', () => {
    expect(FANOUT_TYPES.has(ACK_MESSAGE_TYPE)).toBe(true)
    expect(routeForEnvelope(inboxEnvelope() as never)).toBe('fanout')
    expect(routeForEnvelope(logEnvelope() as never)).toBe('primary')
  })

  it('T1c: sendControlFrame/rebindDeviceId mirror the PRIMARY feature-detection and never touch the secondary', () => {
    // FakeChild has neither → multiplexer must not expose them.
    expect(multi.sendControlFrame).toBeUndefined()
    expect(multi.rebindDeviceId).toBeUndefined()

    const withControl = new FakeChild() as FakeChild & { sendControlFrame: () => Promise<unknown> }
    withControl.sendControlFrame = vi.fn(async () => ({ messageId: 'd', status: 'delivered', timestamp: 't' }))
    const m2 = new MultiBrokerMessagingAdapter([withControl as never, server], { reconnectIntervalMs: 0 })
    expect(typeof m2.sendControlFrame).toBe('function')
  })

  // T2 — fanout send semantics
  it('T2: fanout succeeds via the other broker when one is down; fails like single-broker when all are down', async () => {
    await multi.connect(DID)
    box.setState('disconnected') // box gone; server connected
    const receipt = await multi.send(inboxEnvelope() as never)
    expect(receipt.status).toBe('delivered')
    expect(server.sent).toHaveLength(1)
    expect(box.sent).toHaveLength(0)

    server.setState('disconnected') // all down → behaves like single (throws → outbox queues)
    await expect(multi.send(inboxEnvelope() as never)).rejects.toThrow(/connect/)
  })

  // T9 — I-START-ANYWHERE (the post-camp path)
  it('T9: connect settles via the secondary while the primary HANGS (dead box)', async () => {
    box.connectImpl = () => new Promise(() => {}) // never settles
    const started = Date.now()
    await multi.connect(DID)
    expect(Date.now() - started).toBeLessThan(1000) // settled on server success, not box timeout
    expect(server.getState()).toBe('connected')
    expect(multi.getState()).toBe('connected')
  })

  it('T9b: connect rejects only when ALL children fail', async () => {
    box.connectImpl = async () => { throw new Error('box down') }
    server.connectImpl = async () => { throw new Error('server down') }
    await expect(multi.connect(DID)).rejects.toThrow(/down/)
  })

  // T10 — I-CHILD-RECONNECT
  it('T10: a dead primary keeps being redialed while the secondary carries the connection', async () => {
    vi.useFakeTimers()
    const m = new MultiBrokerMessagingAdapter([box, server], { connectTimeoutMs: 50, reconnectIntervalMs: 1000 })
    box.connectImpl = async () => { throw new Error('box down') }
    await m.connect(DID) // server connects, box fails
    expect(m.getState()).toBe('connected') // aggregate is connected — outbox timer would be blind now
    const callsAfterConnect = box.connectCalls

    await vi.advanceTimersByTimeAsync(3500)
    expect(box.connectCalls).toBeGreaterThan(callsAfterConnect) // multiplexer's own loop redials

    // box comes back → next tick connects it
    box.connectImpl = async () => { box.setState('connected') }
    await vi.advanceTimersByTimeAsync(1500)
    expect(box.getState()).toBe('connected')
    await m.disconnect()
  })

  // T11 — I-RECEIPT-MONOTON (both channels: send() return + onReceipt stream)
  it('T11: a late child-failed receipt after an ok never reaches consumers', async () => {
    await multi.connect(DID)
    const seen: DeliveryReceipt[] = []
    multi.onReceipt((r) => seen.push(r))

    // send() return: box fails (resolved failed receipt), server delivers → result is the delivery
    box.sendImpl = async (e) => ({ messageId: (e as { id: string }).id, status: 'failed', timestamp: 't', reason: 'X' })
    const env = inboxEnvelope('11111111-aaaa-4bbb-8ccc-000000000001')
    const receipt = await multi.send(env as never)
    expect(receipt.status).toBe('delivered')

    // onReceipt stream (TRACKED fanout id): ok first, then a late failed → suppressed
    server.pushReceipt({ messageId: env.id, status: 'accepted', timestamp: 't' })
    box.pushReceipt({ messageId: env.id, status: 'failed', timestamp: 't', reason: 'late' })
    expect(seen.map((r) => `${r.messageId}:${r.status}`)).toContain(`${env.id}:accepted`)
    expect(seen.some((r) => r.messageId === env.id && r.status === 'failed')).toBe(false)

    // UNTRACKED ids (no fanout send) keep single-broker passthrough semantics.
    server.pushReceipt({ messageId: 'm-2', status: 'failed', timestamp: 't', reason: 'real' })
    expect(seen.some((r) => r.messageId === 'm-2' && r.status === 'failed')).toBe(true)
  })

  // T8 — aggregate state + per-broker view
  it('T8: aggregate is connected when ≥1 child is connected; per-broker states are exposed', async () => {
    await multi.connect(DID)
    box.setState('disconnected')
    expect(multi.getState()).toBe('connected')
    expect(multi.getBrokerStates()).toEqual(['disconnected', 'connected'])
    server.setState('disconnected')
    expect(multi.getState()).toBe('disconnected')
  })

  it('T8b: onStateChange fires only on AGGREGATE transitions', async () => {
    await multi.connect(DID)
    const transitions: MessagingState[] = []
    multi.onStateChange((s) => transitions.push(s))
    box.setState('disconnected')      // aggregate stays connected (server up) → no event
    expect(transitions).toEqual([])
    server.setState('disconnected')   // aggregate drops → event
    expect(transitions).toEqual(['disconnected'])
  })

  // B1 (R1) — connect is idempotent while a child dial is in flight
  it('B1: a second connect() while the primary dial hangs resolves via the aggregate instead of throwing', async () => {
    box.connectImpl = () => new Promise(() => {}) // hangs forever
    const m = new MultiBrokerMessagingAdapter([box, server], { connectTimeoutMs: 5000, reconnectIntervalMs: 0 })
    await m.connect(DID) // settles via server (first success)
    // The demo init calls connect twice (early race + outbox.connect):
    await expect(m.connect(DID)).resolves.toBeUndefined() // must NOT throw 'already in flight'
    expect(m.getState()).toBe('connected')
    await m.disconnect()
  })

  // B2 (R1) — a timed-out child is reset so the reconnect loop can grab it
  it('B2: a child that times out on connect is torn down to disconnected (reconnect loop stays able)', async () => {
    vi.useFakeTimers()
    const disconnectSpy = vi.spyOn(box, 'disconnect')
    box.connectImpl = () => new Promise(() => {}) // hangs; only the timeout path can settle it
    const m = new MultiBrokerMessagingAdapter([box, server], { connectTimeoutMs: 100, reconnectIntervalMs: 0 })
    const p = m.connect(DID)
    await vi.advanceTimersByTimeAsync(150)
    await p // server succeeded
    expect(disconnectSpy).toHaveBeenCalled() // hung dial was torn down
    expect(box.getState()).toBe('disconnected') // the state the reconnect loop handles
    await m.disconnect()
  })

  // B3 (R1) — failed BEFORE ok must also be suppressed (held until outcome)
  it('B3: a child-failed receipt arriving BEFORE the ok is held and dropped once the ok arrives', async () => {
    await multi.connect(DID)
    const seen: DeliveryReceipt[] = []
    multi.onReceipt((r) => seen.push(r))

    // Register fanout tracking exactly like a real fanout send does:
    box.sendImpl = async (e) => ({ messageId: (e as { id: string }).id, status: 'failed', timestamp: 't', reason: 'box down' })
    server.sendImpl = async (e) => ({ messageId: (e as { id: string }).id, status: 'delivered', timestamp: 't' })
    const env = inboxEnvelope('33333333-aaaa-4bbb-8ccc-000000000003')
    await multi.send(env as never)

    // Receipt stream: failed arrives FIRST, ok second → consumer sees ONLY the ok.
    box.pushReceipt({ messageId: env.id, status: 'failed', timestamp: 't', reason: 'early' })
    server.pushReceipt({ messageId: env.id, status: 'delivered', timestamp: 't' })
    expect(seen.some((r) => r.messageId === env.id && r.status === 'failed')).toBe(false)
    expect(seen.some((r) => r.messageId === env.id && r.status === 'delivered')).toBe(true)

    // All-failed case: both children fail → exactly ONE failed reaches the consumer.
    const env2 = inboxEnvelope('44444444-aaaa-4bbb-8ccc-000000000004')
    server.sendImpl = async (e) => ({ messageId: (e as { id: string }).id, status: 'failed', timestamp: 't', reason: 'y' })
    await multi.send(env2 as never) // resolves with a failed receipt (all failed)
    box.pushReceipt({ messageId: env2.id, status: 'failed', timestamp: 't', reason: 'a' })
    server.pushReceipt({ messageId: env2.id, status: 'failed', timestamp: 't', reason: 'b' })
    expect(seen.filter((r) => r.messageId === env2.id && r.status === 'failed')).toHaveLength(1)
  })

  // RX side: messages from every child reach the (idempotency-owning) consumer
  it('RX: onMessage receives from every child (dedup is the consumer contract)', async () => {
    await multi.connect(DID)
    const got: string[] = []
    multi.onMessage((e) => { got.push((e as { id: string }).id) })
    const env = inboxEnvelope('22222222-aaaa-4bbb-8ccc-000000000002')
    box.pushMessage(env as never)
    server.pushMessage(env as never)
    expect(got).toEqual([env.id, env.id]) // both delivered — MessageIdHistory dedups downstream
  })
})
