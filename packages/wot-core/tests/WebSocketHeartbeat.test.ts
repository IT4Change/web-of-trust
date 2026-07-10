import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WebSocketMessagingAdapter } from '../src/adapters/messaging/WebSocketMessagingAdapter'
import { formatBrokerChallengeNonce } from '../src/protocol/sync/broker-auth-nonce'

// B1 (Workshop-Fix, live am DWeb-Camp beobachtet): Nach einem WLAN-Flap bleibt ein
// half-open Socket im State 'connected' haengen — die UI luegt, der Reconnect-Loop
// feuert nie. Es gibt bereits einen Heartbeat (startHeartbeat/handlePong, 15s/5s);
// diese Suite reproduziert seine drei Loecher (CLOSING-Hang, Instanz-Bindung,
// Teardown-Mischform) und pinnt das reparierte Verhalten.

const DID = 'did:key:z6MkTestIdentity'
const DEVICE_ID = '0b6f3f2e-1111-4222-8333-444455556666'
const NONCE_A = formatBrokerChallengeNonce(new Uint8Array(32).fill(1))
const NONCE_B = formatBrokerChallengeNonce(new Uint8Array(32).fill(2))

// Adapter-Defaults (15s Interval / 5s Pong-Timeout) — als lokale Konstanten
// gespiegelt, damit die Tests die Zeitachse exakt treffen.
const HEARTBEAT_INTERVAL_MS = 15_000
const HEARTBEAT_TIMEOUT_MS = 5_000

class FakeSocket {
  static OPEN = 1
  static CONNECTING = 0
  static CLOSING = 2
  static CLOSED = 3
  static instances: FakeSocket[] = []
  readyState = FakeSocket.CONNECTING
  sent: Array<Record<string, unknown>> = []
  closed = false
  onopen: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onerror: (() => void) | null = null
  onclose: (() => void) | null = null
  constructor(public url: string) {
    FakeSocket.instances.push(this)
  }
  send(data: string): void {
    this.sent.push(JSON.parse(data) as Record<string, unknown>)
  }
  close(): void {
    this.closed = true
    this.readyState = FakeSocket.CLOSED
  }
  // test drivers
  open(): void {
    this.readyState = FakeSocket.OPEN
    this.onopen?.()
  }
  frame(obj: Record<string, unknown>): void {
    this.onmessage?.({ data: JSON.stringify(obj) })
  }
  types(): unknown[] {
    return this.sent.map((f) => f.type)
  }
  pingCount(): number {
    return this.sent.filter((f) => f.type === 'ping').length
  }
}

const signer = () => Promise.resolve(new Uint8Array(64))

function makeAdapter(options?: { heartbeatIntervalMs?: number; heartbeatTimeoutMs?: number }) {
  return new WebSocketMessagingAdapter('ws://relay.test', {
    deviceId: DEVICE_ID,
    signBrokerAuthTranscript: signer,
    ...options,
  })
}

/** Drive a full connect() to 'connected' under fake timers, return the socket. */
async function connectFully(adapter: WebSocketMessagingAdapter, nonce: string, peers = 1) {
  const promise = adapter.connect(DID)
  const socket = FakeSocket.instances[FakeSocket.instances.length - 1]
  socket.open()
  socket.frame({ type: 'challenge', nonce })
  // Flush the async broker-auth signing microtask (challenge-response send).
  await vi.advanceTimersByTimeAsync(0)
  socket.frame({ type: 'registered', did: DID, deviceId: DEVICE_ID, isNewDevice: false, peers })
  await promise
  return socket
}

describe('WebSocketMessagingAdapter heartbeat (B1)', () => {
  beforeEach(() => {
    FakeSocket.instances = []
    vi.stubGlobal('WebSocket', FakeSocket)
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  // --- DIAGNOSE (Hypothese 1, CLOSING-Hang): rot auf main-Stand ---------------
  it('DIAGNOSE: a socket stuck in CLOSING while state=connected must be recognized as dead', async () => {
    const adapter = makeAdapter()
    const socket = await connectFully(adapter, NONCE_A)
    expect(adapter.getState()).toBe('connected')

    // Live beobachtet: der WebView hat bei einem WLAN-Flap den Close initiiert,
    // der TCP-Close-Handshake bleibt haengen — der Socket steckt in CLOSING.
    socket.readyState = FakeSocket.CLOSING

    // Zehn Minuten Heartbeat-Ticks verstreichen lassen.
    await vi.advanceTimersByTimeAsync(600_000)

    // Der alte Heartbeat kehrte hier per `readyState !== OPEN → return` einfach
    // um: kein Ping, kein Timeout, State blieb 'connected'. Erwartung nach Fix:
    // toter Transport erkannt → Teardown, damit der Reconnect-Loop greift.
    expect(adapter.getState()).toBe('disconnected')
    expect(socket.closed).toBe(true)
    // Ein CLOSING-Socket wird nie noch angepingt — er wird sofort abgeraeumt.
    expect(socket.pingCount()).toBe(0)
  })

  // --- Kern-Heartbeat ---------------------------------------------------------
  it('sends a ping once the interval elapses on an OPEN socket', async () => {
    const adapter = makeAdapter()
    const socket = await connectFully(adapter, NONCE_A)
    expect(socket.pingCount()).toBe(0)
    await vi.advanceTimersByTimeAsync(HEARTBEAT_INTERVAL_MS)
    expect(socket.pingCount()).toBe(1)
    expect(adapter.getState()).toBe('connected')
  })

  it('a pong within the window keeps the connection alive', async () => {
    const adapter = makeAdapter()
    const socket = await connectFully(adapter, NONCE_A)
    await vi.advanceTimersByTimeAsync(HEARTBEAT_INTERVAL_MS)
    expect(socket.pingCount()).toBe(1)
    socket.frame({ type: 'pong' })
    await vi.advanceTimersByTimeAsync(HEARTBEAT_TIMEOUT_MS + 1)
    expect(adapter.getState()).toBe('connected')
    expect(socket.closed).toBe(false)
  })

  it('kills the socket and goes disconnected when no pong arrives within the timeout', async () => {
    const adapter = makeAdapter()
    const socket = await connectFully(adapter, NONCE_A)
    await vi.advanceTimersByTimeAsync(HEARTBEAT_INTERVAL_MS)
    expect(socket.pingCount()).toBe(1)
    expect(adapter.getState()).toBe('connected') // still waiting for the pong
    await vi.advanceTimersByTimeAsync(HEARTBEAT_TIMEOUT_MS + 1)
    expect(adapter.getState()).toBe('disconnected')
    expect(socket.closed).toBe(true)
  })

  // --- Teardown / Leak-Beweis -------------------------------------------------
  it('disconnect() stops the heartbeat timer — no further pings', async () => {
    const adapter = makeAdapter()
    const socket = await connectFully(adapter, NONCE_A)
    await adapter.disconnect()
    const before = socket.pingCount()
    await vi.advanceTimersByTimeAsync(HEARTBEAT_INTERVAL_MS * 3)
    expect(socket.pingCount()).toBe(before)
  })

  it('a server-side close stops the heartbeat timer — no further pings', async () => {
    const adapter = makeAdapter()
    const socket = await connectFully(adapter, NONCE_A)
    socket.readyState = FakeSocket.CLOSED
    socket.onclose?.()
    expect(adapter.getState()).toBe('disconnected')
    const before = socket.pingCount()
    await vi.advanceTimersByTimeAsync(HEARTBEAT_INTERVAL_MS * 3)
    expect(socket.pingCount()).toBe(before)
  })

  // --- Instanz-Bindung (Hole b, #251) ----------------------------------------
  it('an old heartbeat timeout must not kill a socket from a later redial', async () => {
    const adapter = makeAdapter()
    const socketA = await connectFully(adapter, NONCE_A)

    // A pingt; sein Pong-Timeout ist jetzt scharf und an A gebunden.
    await vi.advanceTimersByTimeAsync(HEARTBEAT_INTERVAL_MS)
    expect(socketA.pingCount()).toBe(1)

    // A stirbt (Netz/Server-Close). Das war der Pfad, der A's Pong-Timeout scharf
    // liess: onclose flippte auf 'disconnected', der folgende connect() (State !=
    // connected) rief nie disconnect() — der alte Timer lebte weiter und schloss
    // ueber `this.ws` die NEUE Instanz.
    socketA.readyState = FakeSocket.CLOSED
    socketA.onclose?.()
    expect(adapter.getState()).toBe('disconnected')

    // Redial → Socket B registriert vollstaendig und ist jetzt die Verbindung.
    const socketB = await connectFully(adapter, NONCE_B)
    expect(adapter.getState()).toBe('connected')

    // Ueber A's urspruengliches Timeout-Fenster hinaus vorspulen. A's alter Timer
    // darf B weder schliessen noch die frische Verbindung auf 'disconnected'
    // flippen.
    await vi.advanceTimersByTimeAsync(HEARTBEAT_TIMEOUT_MS + 1)
    expect(adapter.getState()).toBe('connected')
    expect(socketB.closed).toBe(false)
  })

  // --- Doppel-Ping/Timeout-Guard (Codex-Nit): interval <= timeout -------------
  it('does not stack a second ping/timeout while one is outstanding (interval <= timeout)', async () => {
    // 5s Interval, 20s Timeout: drei Interval-Ticks verstreichen, bevor der erste
    // Pong-Timeout ueberhaupt feuern koennte. Nur EIN Ping darf ausstehen —
    // sonst ueberschreibt jeder Tick den pending Timeout und leakt Timer.
    const adapter = makeAdapter({ heartbeatIntervalMs: 5_000, heartbeatTimeoutMs: 20_000 })
    const socket = await connectFully(adapter, NONCE_A)
    await vi.advanceTimersByTimeAsync(15_000)
    expect(socket.pingCount()).toBe(1)
    expect(adapter.getState()).toBe('connected')
    // Pong raeumt den Guard ab; der naechste Tick darf wieder pingen.
    socket.frame({ type: 'pong' })
    await vi.advanceTimersByTimeAsync(5_000)
    expect(socket.pingCount()).toBe(2)
  })
})
