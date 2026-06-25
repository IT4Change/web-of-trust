import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { InMemoryMessagingAdapter, InProcessLogBroker } from '../src/adapters/messaging'
import { InMemoryDocLogStore } from '../src/adapters/storage/InMemoryDocLogStore'
import { WebCryptoProtocolCryptoAdapter } from '../src/adapters/protocol-crypto'
import { createTestIdentity } from './helpers/identity-session'
import type { PublicIdentitySession } from '../src/application/identity'
import {
  LogSyncCoordinator,
  SyncNoProgressError,
  createSpaceCapabilityJws,
  createSpaceRegisterMessage,
  createLogEntryMessage,
  createSyncResponseMessage,
  encryptLogPayload,
  createLogEntryJwsWithSigner,
  SYNC_REQUEST_MESSAGE_TYPE,
  type LogSyncEngineHooks,
  type ControlFrameReceipt,
} from '../src/protocol'

/**
 * Slice B — Catch-up completeness (pagination + gap-handling). These tests have
 * TEETH against the 7 scouted greenwash traps: cold-start hides the live-gap bug
 * (relay re-delivers sorted, the buffer never triggers), the applied-set must not
 * swallow a buffered entry (assert the DOC value, not the disposition), the
 * cascading replay must heal the tail in ONE page, and the terminator's (b)/(c)/(d)
 * classes must be tested SEPARATELY (a pauschal-throw greenwashes the legit blocked
 * class with the DoS class).
 */

const crypto = new WebCryptoProtocolCryptoAdapter()
const SPACE_ID = '22222222-2222-4222-8222-222222222222'
const DEVICE_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const DEVICE_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const DEVICE_C = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'

const FUTURE = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
const NOW = new Date().toISOString()
const CONTENT_KEY = new Uint8Array(32).fill(7)

let capabilitySigningSeed: Uint8Array

interface Harness {
  identity: PublicIdentitySession
  messaging: InMemoryMessagingAdapter
  logStore: InMemoryDocLogStore
  coordinator: LogSyncCoordinator
  applied: Uint8Array[]
  /** All sync-request bodies sent through this harness (limit inspection + round count). */
  syncRequests: Array<{ heads: Record<string, number>; limit?: number }>
  sentEnvelopes: number
}

async function makeCapability(audience: string, generation = 0): Promise<string> {
  return createSpaceCapabilityJws({
    payload: {
      type: 'capability',
      spaceId: SPACE_ID,
      audience,
      permissions: ['read', 'write'],
      generation,
      issuedAt: NOW,
      validUntil: FUTURE,
    },
    signingSeed: capabilitySigningSeed,
  })
}

function makeHooks(applied: Uint8Array[]): LogSyncEngineHooks {
  return {
    engine: 'test-raw',
    encodeUpdate: (update) => update,
    applyRemoteUpdate: (plaintext) => {
      if (plaintext.length > 0 && plaintext[0] === 0xff) throw new Error('engine-foreign')
      applied.push(plaintext)
    },
    isForeignPayload: (plaintext) => plaintext.length > 0 && plaintext[0] === 0xff,
  }
}

async function makeHarness(
  identity: PublicIdentitySession,
  deviceId: string,
  broker: InProcessLogBroker,
  opts?: {
    registrationJws?: string
    catchUpPageSize?: number
    onGapUnfillable?: (info: { docId: string; deviceId: string; missingSeq: number }) => void
    recipients?: string[]
  },
): Promise<Harness> {
  const messaging = new InMemoryMessagingAdapter({ broker })
  await messaging.connect(identity.getDid())

  const logStore = new InMemoryDocLogStore()
  await logStore.init()

  const applied: Uint8Array[] = []
  const syncRequests: Array<{ heads: Record<string, number>; limit?: number }> = []
  const harness: Partial<Harness> = { identity, messaging, logStore, applied, syncRequests, sentEnvelopes: 0 }

  const coordinator = new LogSyncCoordinator({
    docId: SPACE_ID,
    deviceId,
    ownDid: identity.getDid(),
    authorKid: identity.kid,
    crypto,
    logStore,
    control: { sendControlFrame: (frame) => messaging.sendControlFrame!(frame) },
    envelopes: {
      send: async (envelope) => {
        harness.sentEnvelopes! += 1
        const e = envelope as { type?: string; body?: { heads: Record<string, number>; limit?: number } }
        if (e.type === SYNC_REQUEST_MESSAGE_TYPE && e.body) {
          syncRequests.push({ heads: e.body.heads, limit: e.body.limit })
        }
        return messaging.send(envelope as never)
      },
    },
    capabilities: { getCapabilityJws: () => makeCapability(identity.getDid(), 0) },
    hooks: makeHooks(applied),
    signLogEntry: (input) => identity.signEd25519(input),
    getRecipients: opts?.recipients ? () => opts.recipients! : undefined,
    getContentKey: async () => ({ key: CONTENT_KEY, generation: 0 }),
    getContentKeyByGeneration: async (generation) => (generation <= 0 ? CONTENT_KEY : null),
    getAvailableKeyGenerations: async () => [0],
    catchUpPageSize: opts?.catchUpPageSize,
    onGapUnfillable: opts?.onGapUnfillable,
    sendSpaceRegister: async () => {
      const register = opts?.registrationJws
        ? { type: 'https://web-of-trust.de/protocols/space-register/1.0' as const, registrationJws: opts.registrationJws }
        : await createSpaceRegisterMessage({
            spaceId: SPACE_ID,
            spaceCapabilityVerificationKey: 'AAAA',
            adminDids: [identity.getDid()],
            kid: identity.kid,
            signingSeed: new Uint8Array(32).fill(3),
          })
      return messaging.sendControlFrame!(register) as Promise<ControlFrameReceipt>
    },
  })

  messaging.onMessage(async (message) => {
    await coordinator.handleIncoming(message)
  })

  harness.coordinator = coordinator
  return harness as Harness
}

async function inviterRegistrationJws(inviter: PublicIdentitySession): Promise<string> {
  const register = await createSpaceRegisterMessage({
    spaceId: SPACE_ID,
    spaceCapabilityVerificationKey: 'AAAA',
    adminDids: [inviter.getDid()],
    kid: inviter.kid,
    signingSeed: new Uint8Array(32).fill(3),
  })
  return register.registrationJws
}

/** Build a signed+encrypted log-entry JWS for a specific (deviceId, seq) under gen 0. */
async function buildEntryJws(
  author: PublicIdentitySession,
  deviceId: string,
  seq: number,
  plaintext: Uint8Array,
): Promise<string> {
  const enc = await encryptLogPayload({ crypto, spaceContentKey: CONTENT_KEY, deviceId, seq, plaintext })
  return createLogEntryJwsWithSigner({
    payload: {
      seq,
      deviceId,
      docId: SPACE_ID,
      authorKid: author.kid,
      keyGeneration: 0,
      data: enc.blobBase64Url,
      timestamp: NOW,
    },
    sign: (input) => author.signEd25519(input),
  })
}

function wrapLogEntry(author: PublicIdentitySession, entryJws: string) {
  return createLogEntryMessage({
    id: globalThis.crypto.randomUUID(),
    from: author.getDid(),
    to: [author.getDid()],
    createdTime: Math.floor(Date.now() / 1000),
    entry: entryJws,
  })
}

async function flush(ms = 60): Promise<void> {
  await new Promise((r) => setTimeout(r, ms))
}

beforeEach(() => {
  InMemoryMessagingAdapter.resetAll()
  capabilitySigningSeed = new Uint8Array(32).fill(9)
})

afterEach(() => {
  InMemoryMessagingAdapter.resetAll()
})

describe('LogSyncCoordinator — Slice B VE-B1 pagination', () => {
  it('VE-B1 HEADLINE — multi-page cold reconstruction (250 entries, limit 100) reconstructs ALL via >=2 sync-request rounds', async () => {
    const broker = new InProcessLogBroker()
    const alice = (await createTestIdentity('alice')).identity
    const bob = (await createTestIdentity('bob')).identity
    const registrationJws = await inviterRegistrationJws(alice)

    const a = await makeHarness(alice, DEVICE_A, broker, { registrationJws })
    await a.coordinator.ensurePublished()
    const N = 250
    for (let i = 0; i < N; i++) await a.coordinator.writeLocalUpdate(new Uint8Array([i & 0xfe, (i >> 8) & 0xff]))

    // Bob: FRESH, empty heads. Pages with limit 100 → 3 pages (100,100,50).
    const b = await makeHarness(bob, DEVICE_B, broker, { registrationJws, catchUpPageSize: 100 })
    const result = await b.coordinator.catchUp()

    expect(result.complete).toBe(true)
    expect(b.applied.length).toBe(N) // ALL 250, not 100
    const heads = await b.logStore.getKnownHeads(SPACE_ID)
    expect(heads[DEVICE_A]).toBe(N - 1) // seq 0..249

    // >=2 sync-request rounds observed (multi-page proof, not a single-page greenwash).
    expect(b.syncRequests.length).toBeGreaterThanOrEqual(3)
    // Every sync-request carried an EXPLICIT limit == 100 (Codex #3 wire envelope).
    for (const req of b.syncRequests) expect(req.limit).toBe(100)
    // Heads advanced across rounds (page-2 request asks above page-1's last seq).
    expect(b.syncRequests[1].heads[DEVICE_A]).toBeGreaterThanOrEqual(99)
  })

  it('VE-B1 limit-default — without catchUpPageSize the sync-request carries an EXPLICIT body.limit == 100 (not absent)', async () => {
    const broker = new InProcessLogBroker()
    const alice = (await createTestIdentity('alice')).identity
    const a = await makeHarness(alice, DEVICE_A, broker)
    await a.coordinator.catchUp()
    expect(a.syncRequests.length).toBeGreaterThanOrEqual(1)
    for (const req of a.syncRequests) expect(req.limit).toBe(100)
  })

  it('VE-B1 reconnect catch-up — an offline client that missed >limit entries converges fully on reconnect', async () => {
    const broker = new InProcessLogBroker()
    const alice = (await createTestIdentity('alice')).identity
    const bob = (await createTestIdentity('bob')).identity
    const registrationJws = await inviterRegistrationJws(alice)

    const a = await makeHarness(alice, DEVICE_A, broker, { registrationJws })
    await a.coordinator.ensurePublished()
    for (let i = 0; i < 150; i++) await a.coordinator.writeLocalUpdate(new Uint8Array([i & 0xfe, 1]))

    const b = await makeHarness(bob, DEVICE_B, broker, { registrationJws, catchUpPageSize: 100 })
    const r1 = await b.coordinator.catchUp()
    expect(r1.complete).toBe(true)
    expect(b.applied.length).toBe(150)

    // More writes while Bob is "offline"; Bob reconnects and converges.
    for (let i = 150; i < 230; i++) await a.coordinator.writeLocalUpdate(new Uint8Array([i & 0xfe, 2]))
    b.coordinator.resetForReconnect()
    const r2 = await b.coordinator.catchUp()
    expect(r2.complete).toBe(true)
    expect(b.applied.length).toBe(230)
  })
})

describe('LogSyncCoordinator — Slice B VE-B1 termination classes (b/c/d SEPARATE)', () => {
  it('VE-B1 (d) NO-PROGRESS — truncated:true with no new entry THROWS SyncNoProgressError (not hang; control: a heads-based guard would hang)', async () => {
    const broker = new InProcessLogBroker()
    const alice = (await createTestIdentity('alice')).identity
    const a = await makeHarness(alice, DEVICE_A, broker)
    await a.coordinator.ensurePublished()

    // Arm a persistent no-progress truncation: every sync-request answers
    // truncated:true with ZERO entries and seiten-invariant (broker-MAX) heads.
    broker.armSyncTruncationNoProgress({ docId: SPACE_ID, persistent: true })

    await expect(a.coordinator.catchUp()).rejects.toBeInstanceOf(SyncNoProgressError)
  })

  it('VE-B1 (b) PURE-BUFFER — truncated:true with only blocked-by-seq entries STOPS without throw, incomplete:blocked-by-seq', async () => {
    const broker = new InProcessLogBroker()
    const alice = (await createTestIdentity('alice')).identity
    const bob = (await createTestIdentity('bob')).identity
    const registrationJws = await inviterRegistrationJws(alice)
    const b = await makeHarness(bob, DEVICE_B, broker, { registrationJws })
    await b.coordinator.ensurePublished()

    // Build a page that is ALL non-contiguous for DEVICE_A (seq 5,6 — gap at 0..4),
    // delivered truncated:true. The page buffers (no apply), heads do not advance.
    const e5 = await buildEntryJws(alice, DEVICE_A, 5, new Uint8Array([5]))
    const e6 = await buildEntryJws(alice, DEVICE_A, 6, new Uint8Array([6]))
    const page = createSyncResponseMessage({
      id: globalThis.crypto.randomUUID(),
      from: bob.getDid(),
      to: [bob.getDid()],
      createdTime: Math.floor(Date.now() / 1000),
      thid: globalThis.crypto.randomUUID(),
      body: { docId: SPACE_ID, entries: [e5, e6], heads: { [DEVICE_A]: 6 }, truncated: true },
    })

    // applySyncResponse is the single-page primitive; with truncated:true and a
    // pure-buffer page the loop class is (b): no throw.
    const result = await b.coordinator.applySyncResponse(page)
    expect(result.complete).toBe(false)
    expect(result.incomplete).toBe('blocked-by-seq')
    expect(b.applied.length).toBe(0) // nothing applied (all buffered)
    expect(b.coordinator.blockedBySeqCount()).toBe(2)
    // Crucially NOT a throw — distinct from class (d).
  })

  it('VE-B1 (c) TIMEOUT — a truncated page whose follow-up never arrives → incomplete:timeout, no throw', async () => {
    const broker = new InProcessLogBroker()
    const alice = (await createTestIdentity('alice')).identity
    const a = await makeHarness(alice, DEVICE_A, broker)
    await a.coordinator.ensurePublished()

    // Drop EVERY sync-request answer (the broker never delivers a response).
    const coordinator = a.coordinator as unknown as {
      config: { envelopes: { send: (e: unknown) => Promise<unknown> } }
    }
    const original = coordinator.config.envelopes.send
    coordinator.config.envelopes.send = async (e: unknown) => {
      const env = e as { type?: string }
      if (env.type === SYNC_REQUEST_MESSAGE_TYPE) return undefined // swallow → timeout
      return original(e)
    }

    const internal = a.coordinator as unknown as {
      catchUpInternal: (o: { presentCapabilityFirst: boolean; timeoutMs?: number }) => Promise<{ complete: boolean; incomplete?: string }>
    }
    const result = await internal.catchUpInternal({ presentCapabilityFirst: false, timeoutMs: 50 })
    expect(result.complete).toBe(false)
    expect(result.incomplete).toBe('timeout')
  })
})

describe('LogSyncCoordinator — Slice B VE-B2 gap-handling', () => {
  it('VE-B2 LIVE-GAP — seq 3 dropped, 4,5 live → head does NOT jump; gap catch-up heals; assert DOC VALUES (not disposition)', async () => {
    const broker = new InProcessLogBroker()
    const alice = (await createTestIdentity('alice')).identity
    const bob = (await createTestIdentity('bob')).identity
    const registrationJws = await inviterRegistrationJws(alice)

    // Bob publishes FIRST against an empty broker (nothing to catch up). Recipients
    // for Alice = just Alice, so the broker does NOT live-broadcast to Bob — the test
    // controls Bob's delivery manually.
    const b = await makeHarness(bob, DEVICE_B, broker, { registrationJws })
    await b.coordinator.ensurePublished()
    expect(b.applied.length).toBe(0)

    // Alice authors seq 0..5 into the broker AFTER Bob published (so Bob's first-pub
    // catch-up did not already absorb them).
    const a = await makeHarness(alice, DEVICE_A, broker, { registrationJws })
    await a.coordinator.ensurePublished()
    const updates: Uint8Array[] = []
    for (let i = 0; i <= 5; i++) {
      const u = new Uint8Array([0x10 + i])
      updates.push(u)
      await a.coordinator.writeLocalUpdate(u)
    }

    // Feed Bob seq 0,1,2 contiguously (applied), then SKIP 3, feed 4,5 LIVE.
    for (const seq of [0, 1, 2]) {
      const jws = (broker as unknown as { docs: Map<string, { entries: Map<string, { entryJws: string }> }> })
        .docs.get(SPACE_ID)!.entries.get(`${DEVICE_A}:${seq}`)!.entryJws
      await b.coordinator.receiveLogEntry(wrapLogEntry(alice, jws))
    }
    expect(b.applied.length).toBe(3)
    let heads = await b.logStore.getKnownHeads(SPACE_ID)
    expect(heads[DEVICE_A]).toBe(2)

    // Suppress the auto gap-catch-up so we can OBSERVE the head NOT jumping first.
    const coordInternal = b.coordinator as unknown as { triggerGapCatchUp: () => void }
    const origTrigger = coordInternal.triggerGapCatchUp.bind(b.coordinator)
    coordInternal.triggerGapCatchUp = () => {}

    for (const seq of [4, 5]) {
      const jws = (broker as unknown as { docs: Map<string, { entries: Map<string, { entryJws: string }> }> })
        .docs.get(SPACE_ID)!.entries.get(`${DEVICE_A}:${seq}`)!.entryJws
      const r = await b.coordinator.receiveLogEntry(wrapLogEntry(alice, jws))
      expect(r.disposition).toBe('blocked-by-seq')
    }
    // head did NOT jump over the gap.
    heads = await b.logStore.getKnownHeads(SPACE_ID)
    expect(heads[DEVICE_A]).toBe(2)
    expect(b.coordinator.blockedBySeqCount()).toBe(2) // 4,5 buffered
    expect(b.applied.length).toBe(3) // still only 0,1,2 applied

    // Restore the trigger and run the gap catch-up: it fetches seq 3 → cascade heals
    // 4,5 in the SAME pass.
    coordInternal.triggerGapCatchUp = origTrigger
    await b.coordinator.catchUp()

    // DOC VALUE assert (not just disposition): seq 3,4,5 plaintexts reached the CRDT.
    expect(b.applied.length).toBe(6)
    expect(b.applied.map((u) => u[0]).sort((x, y) => x - y)).toEqual([0x10, 0x11, 0x12, 0x13, 0x14, 0x15])
    heads = await b.logStore.getKnownHeads(SPACE_ID)
    expect(heads[DEVICE_A]).toBe(5) // head never sat above the gap; now fully contiguous
    expect(b.coordinator.blockedBySeqCount()).toBe(0)
  })

  it('VE-B2 ENGINE-FOREIGN SNIFF — a foreign payload at seq > head+1 is engine-foreign-skipped, NOT buffered as a false gap (cross-engine catch-up would otherwise spin)', async () => {
    // The contiguity check must NOT buffer an engine-FOREIGN entry as blocked-by-seq:
    // a foreign payload is never this engine's data, so it can never fill the gap, and
    // buffering it would make every foreign entry with seq>head+1 a permanent false gap
    // that spins cross-engine catch-up. The optional isForeignPayload sniff (mocked here
    // as first-byte 0xff) excludes it. Teeth: dropping the `!foreign` clause buffers it
    // (disposition 'blocked-by-seq', blockedBySeqCount 1) and this test goes red.
    const broker = new InProcessLogBroker()
    const alice = (await createTestIdentity('alice')).identity
    const bob = (await createTestIdentity('bob')).identity
    const registrationJws = await inviterRegistrationJws(alice)
    const b = await makeHarness(bob, DEVICE_B, broker, { registrationJws })
    await b.coordinator.ensurePublished()

    // A FOREIGN entry (first plaintext byte 0xff) authored by DEVICE_A at seq=2, while
    // Bob has applied NOTHING from DEVICE_A (contiguous head = -1) → seq 2 > head+1.
    const foreignJws = await buildEntryJws(alice, DEVICE_A, 2, new Uint8Array([0xff, 0x02]))
    const r = await b.coordinator.receiveLogEntry(wrapLogEntry(alice, foreignJws))

    expect(r.disposition).toBe('engine-foreign-skip') // NOT 'blocked-by-seq'
    expect(b.coordinator.blockedBySeqCount()).toBe(0) // not buffered → no false gap
    const heads = await b.logStore.getKnownHeads(SPACE_ID)
    expect(heads[DEVICE_A]).toBeUndefined() // foreign-skip records nothing → head unmoved
  })

  it('VE-B2 BUFFERED-ENTRY-REALLY-APPLIED — a buffered entry reaches the CRDT (doc value), was NOT in applied before, no idempotent-skip greenwash', async () => {
    const broker = new InProcessLogBroker()
    const alice = (await createTestIdentity('alice')).identity
    const bob = (await createTestIdentity('bob')).identity
    const registrationJws = await inviterRegistrationJws(alice)
    const b = await makeHarness(bob, DEVICE_B, broker, { registrationJws })
    await b.coordinator.ensurePublished()

    const coordInternal = b.coordinator as unknown as { triggerGapCatchUp: () => void }
    coordInternal.triggerGapCatchUp = () => {} // isolate: no auto catch-up

    // Buffer seq 1 (gap at 0).
    const e1 = await buildEntryJws(alice, DEVICE_A, 1, new Uint8Array([0xab]))
    const r1 = await b.coordinator.receiveLogEntry(wrapLogEntry(alice, e1))
    expect(r1.disposition).toBe('blocked-by-seq')
    expect(b.applied.length).toBe(0) // NOT applied (the greenwash would mark it applied here)

    // Now deliver seq 0 → cascade applies 0 then 1.
    const e0 = await buildEntryJws(alice, DEVICE_A, 0, new Uint8Array([0xaa]))
    const r0 = await b.coordinator.receiveLogEntry(wrapLogEntry(alice, e0))
    expect(r0.disposition).toBe('applied')

    // DOC VALUE: BOTH 0xaa and 0xab are in the CRDT (the buffered seq=1 was REALLY
    // applied, not swallowed as an idempotent-skip from a poisoned applied-set).
    expect(b.applied.map((u) => u[0])).toEqual([0xaa, 0xab])
    const heads = await b.logStore.getKnownHeads(SPACE_ID)
    expect(heads[DEVICE_A]).toBe(1)
    expect(b.coordinator.blockedBySeqCount()).toBe(0)
  })

  it('VE-B2 CASCADING REPLAY w/o extra round — a page delivering the gap-filler seq=3 heals 3,4,5 in ONE page-apply (no extra sync-request)', async () => {
    const broker = new InProcessLogBroker()
    const alice = (await createTestIdentity('alice')).identity
    const bob = (await createTestIdentity('bob')).identity
    const registrationJws = await inviterRegistrationJws(alice)
    const b = await makeHarness(bob, DEVICE_B, broker, { registrationJws })
    await b.coordinator.ensurePublished()

    const coordInternal = b.coordinator as unknown as { triggerGapCatchUp: () => void }
    coordInternal.triggerGapCatchUp = () => {}

    // Pre-apply 0,1,2; pre-buffer 4,5 (gap at 3).
    for (let seq = 0; seq <= 2; seq++) {
      await b.coordinator.receiveLogEntry(wrapLogEntry(alice, await buildEntryJws(alice, DEVICE_A, seq, new Uint8Array([0x30 + seq]))))
    }
    for (const seq of [4, 5]) {
      const r = await b.coordinator.receiveLogEntry(wrapLogEntry(alice, await buildEntryJws(alice, DEVICE_A, seq, new Uint8Array([0x30 + seq]))))
      expect(r.disposition).toBe('blocked-by-seq')
    }
    expect(b.applied.length).toBe(3)
    const requestsBefore = b.syncRequests.length

    // ONE page delivers the missing seq=3. The cascade must heal 3,4,5 in this pass.
    const page = createSyncResponseMessage({
      id: globalThis.crypto.randomUUID(),
      from: bob.getDid(),
      to: [bob.getDid()],
      createdTime: Math.floor(Date.now() / 1000),
      thid: globalThis.crypto.randomUUID(),
      body: {
        docId: SPACE_ID,
        entries: [await buildEntryJws(alice, DEVICE_A, 3, new Uint8Array([0x33]))],
        heads: { [DEVICE_A]: 5 },
        truncated: false,
      },
    })
    await b.coordinator.applySyncResponse(page)

    expect(b.applied.length).toBe(6) // 0,1,2,3,4,5 all in the doc
    expect(b.coordinator.blockedBySeqCount()).toBe(0)
    // No EXTRA sync-request round was needed to heal 4,5 (the cascade did it).
    expect(b.syncRequests.length).toBe(requestsBefore)
  })

  it('VE-B2 LOOP-SAFETY — a blocked-by-seq replay applies entries WITHOUT emitting any log-entry (no delayed outbox loop)', async () => {
    const broker = new InProcessLogBroker()
    const alice = (await createTestIdentity('alice')).identity
    const bob = (await createTestIdentity('bob')).identity
    const registrationJws = await inviterRegistrationJws(alice)
    const b = await makeHarness(bob, DEVICE_B, broker, { registrationJws })
    await b.coordinator.ensurePublished()
    const coordInternal = b.coordinator as unknown as { triggerGapCatchUp: () => void }
    coordInternal.triggerGapCatchUp = () => {}

    // Buffer 1,2 then deliver 0 → cascade applies 0,1,2.
    for (const seq of [1, 2]) {
      await b.coordinator.receiveLogEntry(wrapLogEntry(alice, await buildEntryJws(alice, DEVICE_A, seq, new Uint8Array([seq]))))
    }
    const sentBefore = b.sentEnvelopes
    await b.coordinator.receiveLogEntry(wrapLogEntry(alice, await buildEntryJws(alice, DEVICE_A, 0, new Uint8Array([0]))))
    await flush()

    expect(b.applied.length).toBe(3)
    // The replay/cascade produced ZERO outgoing envelopes (loop-guard). bob never
    // re-broadcasts alice's entries.
    expect(b.sentEnvelopes).toBe(sentBefore)
  })

  it('VE-B2 CAP-EVICTION direction — overflowing the per-device ring drops the HIGHEST seq, keeps the lowest (chain-closing) seq', async () => {
    const broker = new InProcessLogBroker()
    const alice = (await createTestIdentity('alice')).identity
    const bob = (await createTestIdentity('bob')).identity
    const registrationJws = await inviterRegistrationJws(alice)
    const b = await makeHarness(bob, DEVICE_B, broker, { registrationJws })
    await b.coordinator.ensurePublished()
    const coordInternal = b.coordinator as unknown as {
      triggerGapCatchUp: () => void
      blockedBySeq: Map<string, Map<number, unknown>>
    }
    coordInternal.triggerGapCatchUp = () => {}

    // Buffer 257 entries (seq 1..257; gap at 0) → cap 256, the HIGHEST (257) evicted.
    // Plaintext encodes seq in 2 bytes; first byte stays 0x01 so it never hits the
    // test-raw 0xFF foreign marker (which would skip the entry, not buffer it).
    for (let seq = 1; seq <= 257; seq++) {
      await b.coordinator.receiveLogEntry(wrapLogEntry(alice, await buildEntryJws(alice, DEVICE_A, seq, new Uint8Array([0x01, seq & 0xff, (seq >> 8) & 0xff]))))
    }
    expect(b.coordinator.blockedBySeqCountForDevice(DEVICE_A)).toBe(256)
    const perDevice = coordInternal.blockedBySeq.get(DEVICE_A)!
    expect(perDevice.has(1)).toBe(true) // lowest (chain-closing) kept
    expect(perDevice.has(257)).toBe(false) // highest evicted
  })

  it('VE-B2 UNFILLABLE-GAP bounded — relay genuinely lacks the gap entry → bounded retries, onGapUnfillable fires, no throw, buffer bounded', async () => {
    const broker = new InProcessLogBroker()
    const alice = (await createTestIdentity('alice')).identity
    const bob = (await createTestIdentity('bob')).identity
    const registrationJws = await inviterRegistrationJws(alice)

    // Alice writes only seq 0,1 (so a buffered seq 5 can never be filled).
    const a = await makeHarness(alice, DEVICE_A, broker, { registrationJws, recipients: [alice.getDid(), bob.getDid()] })
    await a.coordinator.ensurePublished()
    await a.coordinator.writeLocalUpdate(new Uint8Array([0]))
    await a.coordinator.writeLocalUpdate(new Uint8Array([1]))

    let unfillable: { deviceId: string; missingSeq: number } | null = null
    const b = await makeHarness(bob, DEVICE_B, broker, {
      registrationJws,
      onGapUnfillable: (info) => { unfillable = info },
    })
    await b.coordinator.ensurePublished()
    const coordInternal = b.coordinator as unknown as { triggerGapCatchUp: () => void }
    coordInternal.triggerGapCatchUp = () => {} // disable auto-trigger; drive catchUp manually

    // Buffer a permanently-missing seq 5 (gap at 0..4; the relay only has 0,1).
    await b.coordinator.receiveLogEntry(wrapLogEntry(alice, await buildEntryJws(alice, DEVICE_A, 5, new Uint8Array([5]))))
    expect(b.coordinator.blockedBySeqCountForDevice(DEVICE_A)).toBe(1)

    // Drive >= MAX_GAP_RECONNECT_RETRIES catch-up cycles; each fails to fill the gap.
    for (let i = 0; i < 6; i++) await b.coordinator.catchUp()

    expect(unfillable).not.toBeNull()
    expect(unfillable!.deviceId).toBe(DEVICE_A)
    // catch-up applied the relay's contiguous 0,1 → contiguousHead=1 → first hole = 2.
    expect(unfillable!.missingSeq).toBe(2)
    // Buffer stayed bounded (still just the 1 buffered entry, no growth/thrash).
    expect(b.coordinator.blockedBySeqCountForDevice(DEVICE_A)).toBe(1)
    // Alice's contiguous entries 0,1 DID apply (per-device head; the buffered seq 5
    // stays parked above the unfillable hole at 2..4).
    expect(b.applied.length).toBe(2)
  })
})

describe('LogSyncCoordinator — Slice B VE-B3 composition blocked-by-key x blocked-by-seq', () => {
  it('VE-B3 — an entry that is BOTH non-contiguous AND key-missing lives in exactly one buffer; key-import keeps it blocked-by-seq; gap-fill applies it EXACTLY once', async () => {
    const broker = new InProcessLogBroker()
    const alice = (await createTestIdentity('alice')).identity
    const bob = (await createTestIdentity('bob')).identity
    const registrationJws = await inviterRegistrationJws(alice)

    // A mutable key state: Bob initially LACKS gen 0 (key-missing), then imports it.
    let hasKey = false
    const messaging = new InMemoryMessagingAdapter({ broker })
    await messaging.connect(bob.getDid())
    const logStore = new InMemoryDocLogStore()
    await logStore.init()
    const applied: Uint8Array[] = []
    let sent = 0
    const coordinator = new LogSyncCoordinator({
      docId: SPACE_ID,
      deviceId: DEVICE_B,
      ownDid: bob.getDid(),
      authorKid: bob.kid,
      crypto,
      logStore,
      control: { sendControlFrame: (frame) => messaging.sendControlFrame!(frame) },
      envelopes: { send: async (e) => { sent += 1; return messaging.send(e as never) } },
      capabilities: { getCapabilityJws: () => makeCapability(bob.getDid(), 0) },
      hooks: makeHooks(applied),
      signLogEntry: (input) => bob.signEd25519(input),
      getContentKey: async () => ({ key: CONTENT_KEY, generation: 0 }),
      getContentKeyByGeneration: async (g) => (hasKey && g <= 0 ? CONTENT_KEY : null),
      getAvailableKeyGenerations: async () => (hasKey ? [0] : []),
      sendSpaceRegister: async () =>
        messaging.sendControlFrame!({
          type: 'https://web-of-trust.de/protocols/space-register/1.0',
          registrationJws,
        }) as Promise<ControlFrameReceipt>,
    })
    messaging.onMessage(async (m) => { await coordinator.handleIncoming(m) })
    await coordinator.ensurePublished()
    const coordInternal = coordinator as unknown as { triggerGapCatchUp: () => void }
    coordInternal.triggerGapCatchUp = () => {}
    void sent

    // Receive seq=2 while key is MISSING → blocked-by-key (key precedence).
    const e2 = await buildEntryJws(alice, DEVICE_A, 2, new Uint8Array([0x52]))
    const rKeyMissing = await coordinator.receiveLogEntry(wrapLogEntry(alice, e2))
    expect(rKeyMissing.disposition).toBe('blocked-by-key')
    expect(coordinator.blockedByKeyCount()).toBe(1)
    expect(coordinator.blockedBySeqCount()).toBe(0) // exactly one buffer

    // Import the key, replay blocked-by-key: it becomes decryptable but is STILL
    // non-contiguous (gap at 0,1) → it MOVES to blocked-by-seq (precedence: key,
    // then contiguity), NOT applied.
    hasKey = true
    await coordinator.replayBlockedByKey()
    expect(coordinator.blockedByKeyCount()).toBe(0)
    expect(coordinator.blockedBySeqCount()).toBe(1) // moved, still exactly one buffer
    expect(applied.length).toBe(0) // NOT applied yet

    // Fill the gap (deliver 0,1). seq=2 is applied EXACTLY ONCE.
    await coordinator.receiveLogEntry(wrapLogEntry(alice, await buildEntryJws(alice, DEVICE_A, 0, new Uint8Array([0x50]))))
    await coordinator.receiveLogEntry(wrapLogEntry(alice, await buildEntryJws(alice, DEVICE_A, 1, new Uint8Array([0x51]))))

    expect(applied.map((u) => u[0])).toEqual([0x50, 0x51, 0x52]) // exactly once each
    expect(coordinator.blockedBySeqCount()).toBe(0)
    expect(coordinator.blockedByKeyCount()).toBe(0)

    // Re-deliver seq=2: idempotent-skip (the applied-set backstop), not double-applied.
    const again = await coordinator.receiveLogEntry(wrapLogEntry(alice, e2))
    expect(again.disposition).toBe('idempotent-skip')
    expect(applied.length).toBe(3)

    await messaging.disconnect()
  })
})

describe('LogSyncCoordinator — Slice B re-entrancy + multi-device', () => {
  it('VE-B1 RE-ENTRANCY — a gap-trigger DURING a running pagination loop does NOT start a second loop; converges once', async () => {
    const broker = new InProcessLogBroker()
    const alice = (await createTestIdentity('alice')).identity
    const bob = (await createTestIdentity('bob')).identity
    const registrationJws = await inviterRegistrationJws(alice)

    const a = await makeHarness(alice, DEVICE_A, broker, { registrationJws })
    await a.coordinator.ensurePublished()
    for (let i = 0; i < 150; i++) await a.coordinator.writeLocalUpdate(new Uint8Array([i & 0xfe, 9]))

    const b = await makeHarness(bob, DEVICE_B, broker, { registrationJws, catchUpPageSize: 50 })

    // Fire a SECOND catchUp concurrently with the first (models a gap-trigger
    // arriving mid-loop). The guard must coalesce them — no doubled apply.
    const [r1, r2] = await Promise.all([b.coordinator.catchUp(), b.coordinator.catchUp()])
    // One of the two short-circuited (catchingUp guard); the other completed.
    expect(r1.complete || r2.complete).toBe(true)
    expect(b.applied.length).toBe(150) // converged EXACTLY once (no 300)
    const heads = await b.logStore.getKnownHeads(SPACE_ID)
    expect(heads[DEVICE_A]).toBe(149)
  })

  it('VE-B2 MULTI-DEVICE x gap — Device A complete, Device B has a gap → both converge, A never lost, B gap filled', async () => {
    const broker = new InProcessLogBroker()
    const alice = (await createTestIdentity('alice')).identity
    const carol = (await createTestIdentity('carol')).identity
    const bob = (await createTestIdentity('bob')).identity
    const registrationJws = await inviterRegistrationJws(alice)

    // Alice authors DEVICE_A 0,1,2 FIRST.
    const a = await makeHarness(alice, DEVICE_A, broker, { registrationJws })
    await a.coordinator.ensurePublished()
    for (let i = 0; i < 3; i++) await a.coordinator.writeLocalUpdate(new Uint8Array([0xa0 + i]))

    // Bob publishes + catches up → has DEVICE_A 0,1,2 fully (intrinsic first-pub catch-up).
    const b = await makeHarness(bob, DEVICE_B, broker, { registrationJws })
    await b.coordinator.ensurePublished()
    expect(b.applied.length).toBe(3) // A:0,1,2 already converged
    const coordInternal = b.coordinator as unknown as { triggerGapCatchUp: () => void }
    coordInternal.triggerGapCatchUp = () => {}

    // Carol authors DEVICE_C 0,1,2 AFTER Bob's catch-up (so Bob does not yet hold them).
    const c = await makeHarness(carol, DEVICE_C, broker, { registrationJws })
    await c.coordinator.ensurePublished()
    for (let i = 0; i < 3; i++) await c.coordinator.writeLocalUpdate(new Uint8Array([0xc0 + i]))

    // Bob receives DEVICE_C with a GAP (only C:2 live; C:0,1 missing).
    const c2 = (broker as unknown as { docs: Map<string, { entries: Map<string, { entryJws: string }> }> })
      .docs.get(SPACE_ID)!.entries.get(`${DEVICE_C}:2`)!.entryJws
    const rGap = await b.coordinator.receiveLogEntry(wrapLogEntry(carol, c2))
    expect(rGap.disposition).toBe('blocked-by-seq')

    let heads = await b.logStore.getKnownHeads(SPACE_ID)
    expect(heads[DEVICE_A]).toBe(2) // A complete and unaffected by C's gap
    expect(heads[DEVICE_C]).toBeUndefined() // C head never jumped over its gap

    // Run catch-up: fills C's gap (0,1), cascade applies C:2.
    coordInternal.triggerGapCatchUp = (b.coordinator as unknown as { catchUp: () => Promise<unknown> }).catchUp.bind(b.coordinator) as never
    await b.coordinator.catchUp()

    heads = await b.logStore.getKnownHeads(SPACE_ID)
    expect(heads[DEVICE_A]).toBe(2)
    expect(heads[DEVICE_C]).toBe(2)
    expect(b.coordinator.blockedBySeqCount()).toBe(0)
    // All 6 entries (3 from A, 3 from C) in the doc — no A entry lost.
    expect(b.applied.length).toBe(6)
  })
})
