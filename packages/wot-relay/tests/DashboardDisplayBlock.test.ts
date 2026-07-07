import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createHash, randomUUID } from 'crypto'
import { RelayServer, shortenDid, shortenDocId, DISPLAY_TOP_DOCS_LIMIT } from '../src/relay.js'
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
/** The per-process docId display salt (shortenDocId is keyed since review #256) —
 * tests reach it to compute EXPECTED shortcuts; production code never exposes it. */
function reachSalt(server: RelayServer): Uint8Array {
  return (server as unknown as { docIdDisplaySalt: Uint8Array }).docIdDisplaySalt
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
      { idShort: shortenDocId(SPEAKING_DOC_ID, reachSalt(server)), entries: 1, devices: 1 },
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
    expect(displayStr).toContain(shortenDocId(SPEAKING_DOC_ID, reachSalt(server)))
  })

  it('ORACLE TEST (HTTP): an offline unsalted sha256(docId) prefix does NOT appear in the response', async () => {
    // Review-#256 blocker: with an unsalted hash an observer offline-hashes
    // candidate names (familie-mueller-*) and compares prefixes against the
    // public surface. The served shortcut is keyed with a per-process salt, so
    // the offline candidate hash must NOT match anything in the response.
    reachDocLog(server).appendEntry({
      docId: SPEAKING_DOC_ID, deviceId: randomUUID(), seq: 0, contentHash: 'h0', entryJws: 'jws0',
    })
    const text = await (await fetch(`${httpBase}/dashboard/data`)).text()
    const offlineGuess = createHash('sha256').update(SPEAKING_DOC_ID, 'utf8').digest('hex').slice(0, 10)
    expect(text).not.toContain(offlineGuess)
    // ...while the keyed shortcut IS served (shortcut exists, oracle does not).
    expect(text).toContain(shortenDocId(SPEAKING_DOC_ID, reachSalt(server)).slice(0, 10))
  })

  it('two relay instances (fresh per-process salts) serve DIFFERENT shortcuts for the same docId', async () => {
    // Restart semantics: the salt is minted per RelayServer/process, so shortcuts
    // deliberately change across restarts — pinned here via two instances.
    reachDocLog(server).appendEntry({
      docId: SPEAKING_DOC_ID, deviceId: randomUUID(), seq: 0, contentHash: 'h0', entryJws: 'jws0',
    })
    const second = new RelayServer({ port: 0, dbPath: ':memory:' })
    await second.start()
    try {
      reachDocLog(second).appendEntry({
        docId: SPEAKING_DOC_ID, deviceId: randomUUID(), seq: 0, contentHash: 'h0', entryJws: 'jws0',
      })
      const first = (await (await fetch(`${httpBase}/dashboard/data`)).json()) as {
        display: { topDocs: Array<{ idShort: string }> }
      }
      const other = (await (await fetch(`http://localhost:${second.port}/dashboard/data`)).json()) as {
        display: { topDocs: Array<{ idShort: string }> }
      }
      expect(first.display.topDocs[0].idShort).not.toBe(other.display.topDocs[0].idShort)
    } finally {
      await second.stop()
    }
  })

  it('feeds display from SQL-LIMITED top-N queries (never unbounded): caps + orders topDocs/inbox', async () => {
    // Seed MORE docs and pending recipients than the display limit.
    const total = DISPLAY_TOP_DOCS_LIMIT + 3
    for (let i = 1; i <= total; i++) {
      const docId = `doc-${String(i).padStart(2, '0')}`
      for (let seq = 0; seq < i; seq++) {
        reachDocLog(server).appendEntry({
          docId, deviceId: `dev-${i}`, seq, contentHash: `h${i}-${seq}`, entryJws: 'jws',
        })
      }
      reachQueue(server).enqueueFanout({
        messageId: randomUUID(),
        toDid: `did:key:z6MkPending${String(i).padStart(2, '0')}RestOfTheKeyMaterial`,
        envelope: { type: 'x' },
        deliveryTargetDeviceIds: Array.from({ length: i }, () => randomUUID()),
      })
    }

    const json = (await (await fetch(`${httpBase}/dashboard/data`)).json()) as {
      display: {
        topDocs: Array<{ entries: number }>
        inboxPendingByDid: Array<{ pending: number }>
      }
    }
    // Capped at the limit, highest counts first (SQL ORDER BY ... DESC LIMIT).
    expect(json.display.topDocs).toHaveLength(DISPLAY_TOP_DOCS_LIMIT)
    expect(json.display.topDocs[0].entries).toBe(total)
    expect(json.display.topDocs[DISPLAY_TOP_DOCS_LIMIT - 1].entries).toBe(total - DISPLAY_TOP_DOCS_LIMIT + 1)
    expect(json.display.inboxPendingByDid).toHaveLength(DISPLAY_TOP_DOCS_LIMIT)
    expect(json.display.inboxPendingByDid[0].pending).toBe(total)
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
    expect(json.display.topDocs[0].idShort).toBe(shortenDocId(SPEAKING_DOC_ID, reachSalt(server)))
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

  it('GET /dashboard returns HTML with Cache-Control: no-store (inline JS must not go stale)', async () => {
    const res = await fetch(`${httpBase}/dashboard`)
    expect(res.ok).toBe(true)
    expect(res.headers.get('content-type')).toContain('text/html')
    expect(res.headers.get('cache-control')).toBe('no-store')
    const html = await res.text()
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('/dashboard/data') // the page polls the data endpoint
  })

  it('GET /dashboard/ (trailing slash) also returns HTML', async () => {
    const res = await fetch(`${httpBase}/dashboard/`)
    expect(res.ok).toBe(true)
    expect(res.headers.get('content-type')).toContain('text/html')
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(await res.text()).toContain('<!DOCTYPE html>')
  })

  it('GET /dashboard/data sets Cache-Control: no-store', async () => {
    const res = await fetch(`${httpBase}/dashboard/data`)
    expect(res.ok).toBe(true)
    expect(res.headers.get('content-type')).toContain('application/json')
    expect(res.headers.get('cache-control')).toBe('no-store')
  })

  it('pins the render precedence: display block is the DEFAULT, full maps only behind flag-gated detection', async () => {
    // The dashboard HTML is a static string with inline JS — we pin the
    // security-relevant PRECEDENCE RULE by string-matching the served source
    // (pragmatic; a DOM/execution test would need a browser env for no extra
    // confidence). Rule: full ids render ONLY when full-detail mode is detected
    // via the PRESENCE of flag-gated fields; devicesPerDid (ALWAYS public, full
    // DIDs even in prod) must never drive that decision.
    const html = await (await fetch(`${httpBase}/dashboard`)).text()

    // (1) The detection keys on flag-gated fields ONLY...
    const detection = html.match(/const isFullDetail = .*/)?.[0] ?? ''
    expect(detection).toContain('entriesByDoc')
    expect(detection).toContain('byDid')
    // ...and NOT on the always-public devicesPerDid.
    expect(detection).not.toContain('devicesPerDid')

    // (2) Each card consumes its FULL map only behind the full-detail guard...
    expect(html).toContain('full && d.devicesPerDid')
    expect(html).toContain('full && ls.entriesByDoc')
    expect(html).toContain('full && q.byDid')
    // devicesPerDid appears ONLY in the guarded consumption + a warning comment —
    // never as an unguarded `if (d.devicesPerDid`.
    expect(html).not.toContain('if (d.devicesPerDid')

    // (3) ...with the server-shortened display arrays as the default source.
    expect(html).toContain('display.dids')
    expect(html).toContain('display.topDocs')
    expect(html).toContain('display.inboxPendingByDid')
  })
})
