import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { randomUUID } from 'crypto'
import { RelayServer, shortenDid, shortenDocId } from '../src/relay.js'
import type { DocLog } from '../src/log-store.js'
import type { OfflineQueue } from '../src/queue.js'

// Broker-Dashboard: /dashboard/data gains an ALWAYS-public `display` block of
// server-SHORTENED ids (arrays). /dashboard/data is unauthenticated + ACAO:* and
// the relay is deployed publicly, so the redaction MUST be server-side. This is the
// most important test: the display block is public AND contains NO full ids (we
// assert against the RAW JSON STRING). It also smoke-tests the serving routes +
// headers. Full-detail (RELAY_DEBUG_STATS) is covered separately — here the flag is
// OFF (the prod default), so the existing flag-gated maps stay omitted.

// A realistic did:key (random multibase pubkey) + client-chosen docIds, so a naive
// prefix cut of the docId would leak a speaking name.
const FULL_DID_A = 'did:key:z6MktgyStABCDEFGHIJKLMNOPQRSTUVWXYZ0tUfX'
const FULL_DID_B = 'did:key:z6MkbBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBwXyZ'
const SPEAKING_DOC_ID = 'familie-mueller-urlaubsplanung-2026'

function reachDocLog(server: RelayServer): DocLog {
  return (server as unknown as { docLog: DocLog }).docLog
}
function reachQueue(server: RelayServer): OfflineQueue {
  return (server as unknown as { queue: OfflineQueue }).queue
}
/** Inject a live connection WITHOUT the full auth handshake (the redaction under
 * test is at the serializer, not the auth path). Mirrors the private connection map;
 * the WS stand-ins carry a no-op `close()` so `server.stop()` teardown is happy. */
function injectConnection(server: RelayServer, did: string, deviceCount: number): void {
  const conns = (server as unknown as { connections: Map<string, Set<unknown>> }).connections
  const set = new Set<unknown>()
  for (let i = 0; i < deviceCount; i++) set.add({ close() {} }) // only .size + .close() are touched
  conns.set(did, set)
}

describe('Broker-Dashboard /dashboard/data display block (debug stats OFF — prod default)', () => {
  let server: RelayServer
  let httpBase: string

  beforeEach(async () => {
    server = new RelayServer({ port: 0, dbPath: ':memory:' }) // exposeDebugStats defaults FALSE
    await server.start()
    httpBase = `http://localhost:${server.port}`
  })

  afterEach(async () => {
    await server.stop()
  })

  it('exposes a public `display` block with shortened dids / topDocs / inboxPendingByDid', async () => {
    // Seed: two connected identities, a space with entries, a pending inbox message.
    injectConnection(server, FULL_DID_A, 2)
    injectConnection(server, FULL_DID_B, 1)
    reachDocLog(server).appendEntry({
      docId: SPEAKING_DOC_ID, deviceId: randomUUID(), seq: 0, contentHash: 'h0', entryJws: 'jws0',
    })
    reachQueue(server).enqueueFanout({
      messageId: randomUUID(), toDid: FULL_DID_A, envelope: { type: 'x' }, deliveryTargetDeviceIds: [randomUUID()],
    })

    const res = await fetch(`${httpBase}/dashboard/data`)
    expect(res.ok).toBe(true)
    const json = (await res.json()) as {
      display: {
        dids: Array<{ idShort: string; deviceCount: number; online: boolean }>
        topDocs: Array<{ idShort: string; entries: number; devices: number }>
        inboxPendingByDid: Array<{ idShort: string; pending: number }>
      }
    }

    // display is present + populated.
    expect(json.display).toBeDefined()
    expect(json.display.dids).toEqual(
      expect.arrayContaining([
        { idShort: shortenDid(FULL_DID_A), deviceCount: 2, online: true },
        { idShort: shortenDid(FULL_DID_B), deviceCount: 1, online: true },
      ]),
    )
    expect(json.display.topDocs).toEqual([
      { idShort: shortenDocId(SPEAKING_DOC_ID), entries: 1, devices: 1 },
    ])
    expect(json.display.inboxPendingByDid).toEqual([
      { idShort: shortenDid(FULL_DID_A), pending: 1 },
    ])
  })

  it('CRITICAL: the `display` block carries NO full DID / deviceId / docId', async () => {
    const deviceId = randomUUID()
    injectConnection(server, FULL_DID_A, 1)
    injectConnection(server, FULL_DID_B, 1)
    reachDocLog(server).appendEntry({
      docId: SPEAKING_DOC_ID, deviceId, seq: 0, contentHash: 'h0', entryJws: 'jws0',
    })
    reachQueue(server).enqueueFanout({
      messageId: randomUUID(), toDid: FULL_DID_B, envelope: { type: 'x' }, deliveryTargetDeviceIds: [randomUUID()],
    })

    const res = await fetch(`${httpBase}/dashboard/data`)
    const json = (await res.json()) as { display: unknown }

    // The NEW display block is the surface this PR adds — it must contain ONLY
    // shortened forms, never a full id (this is the serializer-level guarantee).
    const displayStr = JSON.stringify(json.display)
    expect(displayStr).not.toContain(FULL_DID_A)
    expect(displayStr).not.toContain(FULL_DID_B)
    expect(displayStr).not.toContain(SPEAKING_DOC_ID)
    expect(displayStr).not.toContain(deviceId)
    // Not even the speaking substring of the docId (why docIds are HASHED, not prefixed).
    expect(displayStr).not.toContain('familie')
    expect(displayStr).not.toContain('mueller')
    // ...but the shortened forms ARE present (proves it was rendered, not dropped).
    expect(displayStr).toContain(shortenDid(FULL_DID_A))
    expect(displayStr).toContain(shortenDocId(SPEAKING_DOC_ID))
  })

  it('CRITICAL: a docId (bearer secret) + a deviceId never leak in the FULL response without the flag', async () => {
    // docId is a bearer secret (A2 Teil B / T-DASHBOARD) and the deviceId is
    // aggregate-only — NEITHER may appear as a string anywhere in the default
    // (flag-off) response. (Full DIDs DO appear via the pre-existing, spec-frozen
    // public `connectedDids`/`devicesPerDid` fields — out of scope for this PR, so
    // this test deliberately does NOT assert on DIDs response-wide.)
    const deviceId = randomUUID()
    injectConnection(server, FULL_DID_A, 1)
    reachDocLog(server).appendEntry({
      docId: SPEAKING_DOC_ID, deviceId, seq: 0, contentHash: 'h0', entryJws: 'jws0',
    })
    reachQueue(server).enqueueFanout({
      messageId: randomUUID(), toDid: FULL_DID_A, envelope: { type: 'x' }, deliveryTargetDeviceIds: [deviceId],
    })

    const text = await (await fetch(`${httpBase}/dashboard/data`)).text()
    expect(text).not.toContain(SPEAKING_DOC_ID)
    expect(text).not.toContain('familie')
    expect(text).not.toContain(deviceId)
  })

  it('keeps the existing flag-gated maps OMITTED (redaction semantics unchanged)', async () => {
    injectConnection(server, FULL_DID_A, 1)
    reachDocLog(server).appendEntry({
      docId: SPEAKING_DOC_ID, deviceId: randomUUID(), seq: 0, contentHash: 'h0', entryJws: 'jws0',
    })
    reachQueue(server).enqueueFanout({
      messageId: randomUUID(), toDid: FULL_DID_A, envelope: { type: 'x' }, deliveryTargetDeviceIds: [randomUUID()],
    })

    const json = (await (await fetch(`${httpBase}/dashboard/data`)).json()) as {
      logStats: Record<string, unknown>
      queueStats: Record<string, unknown>
      display: unknown
    }
    // The display block is additive — it does NOT re-expose the redacted maps.
    expect(json.logStats.entriesByDoc).toBeUndefined()
    expect(json.logStats.devicesByDoc).toBeUndefined()
    expect(json.logStats.entriesByDocAndDevice).toBeUndefined()
    expect(json.logStats.spacesByDoc).toBeUndefined()
    expect(json.queueStats.byDid).toBeUndefined()
    // display still present.
    expect(json.display).toBeDefined()
  })
})

describe('Broker-Dashboard /dashboard/data display block (debug stats ON — box / full detail)', () => {
  let server: RelayServer
  let httpBase: string

  beforeEach(async () => {
    server = new RelayServer({ port: 0, dbPath: ':memory:', exposeDebugStats: true })
    await server.start()
    httpBase = `http://localhost:${server.port}`
  })

  afterEach(async () => {
    await server.stop()
  })

  it('serves BOTH the shortened display block AND the full flag-gated maps', async () => {
    reachDocLog(server).appendEntry({
      docId: SPEAKING_DOC_ID, deviceId: randomUUID(), seq: 0, contentHash: 'h0', entryJws: 'jws0',
    })
    const json = (await (await fetch(`${httpBase}/dashboard/data`)).json()) as {
      logStats: { entriesByDoc?: Record<string, number> }
      display: { topDocs: Array<{ idShort: string }> }
    }
    // Full map present under the flag (box path) — the client prefers it for FULL ids.
    expect(json.logStats.entriesByDoc?.[SPEAKING_DOC_ID]).toBe(1)
    // The always-public shortened block is present regardless of the flag.
    expect(json.display.topDocs[0].idShort).toBe(shortenDocId(SPEAKING_DOC_ID))
  })
})

describe('Broker-Dashboard serving routes + headers (smoke)', () => {
  let server: RelayServer
  let httpBase: string

  beforeEach(async () => {
    server = new RelayServer({ port: 0, dbPath: ':memory:' })
    await server.start()
    httpBase = `http://localhost:${server.port}`
  })

  afterEach(async () => {
    await server.stop()
  })

  it('GET /dashboard returns HTML', async () => {
    const res = await fetch(`${httpBase}/dashboard`)
    expect(res.ok).toBe(true)
    expect(res.headers.get('content-type')).toContain('text/html')
    const html = await res.text()
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('/dashboard/data') // the page polls the data endpoint
  })

  it('GET /dashboard/ (trailing slash) also returns HTML', async () => {
    const res = await fetch(`${httpBase}/dashboard/`)
    expect(res.ok).toBe(true)
    expect(res.headers.get('content-type')).toContain('text/html')
    expect(await res.text()).toContain('<!DOCTYPE html>')
  })

  it('GET /dashboard/data sets Cache-Control: no-store', async () => {
    const res = await fetch(`${httpBase}/dashboard/data`)
    expect(res.ok).toBe(true)
    expect(res.headers.get('content-type')).toContain('application/json')
    expect(res.headers.get('cache-control')).toBe('no-store')
  })
})
