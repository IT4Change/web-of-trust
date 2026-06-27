import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { randomUUID } from 'crypto'
import { RelayServer } from '../src/relay.js'
import type { DocLog } from '../src/log-store.js'

// D1 / Spur-C — the remote-observation path (packages/e2e-log-sync harness) reads
// relay state ENTIRELY through GET /dashboard/data instead of an in-process docLog.
// These assertions pin the SHAPE + VALUES of the two fields that path binds to
// (logStats.entriesByDocAndDevice, logStats.spacesByDoc) against a known state, so the
// remote harness never stands on an untested shape. We seed the durable registry
// directly (the relay's own internal store) and assert both getStats() AND the real
// HTTP round-trip the harness uses.

const PORT = 9897
const HTTP_BASE = `http://localhost:${PORT}`

describe('D1 /dashboard/data — remote-observation stats shape', () => {
  let server: RelayServer
  let docLog: DocLog

  beforeEach(async () => {
    server = new RelayServer({ port: PORT, dbPath: ':memory:' })
    await server.start()
    docLog = (server as unknown as { docLog: DocLog }).docLog
  })

  afterEach(async () => {
    await server.stop()
  })

  it('exposes entriesByDocAndDevice[docId][deviceId] and spacesByDoc[docId]={registered,generation,admins}', async () => {
    const spaceId = randomUUID()
    const dev1 = randomUUID()
    const dev2 = randomUUID()
    const adminA = 'did:key:zAdminA'
    const adminB = 'did:key:zAdminB'

    docLog.registerSpace({ spaceId, verificationKey: 'vk-base64url', adminDids: [adminB, adminA] })
    // dev1 leaves 2 entries, dev2 leaves 1 — distinct (docId,deviceId,seq) so no VE-3 collision.
    docLog.appendEntry({ docId: spaceId, deviceId: dev1, seq: 0, contentHash: 'h-d1-0', entryJws: 'jws-d1-0' })
    docLog.appendEntry({ docId: spaceId, deviceId: dev1, seq: 1, contentHash: 'h-d1-1', entryJws: 'jws-d1-1' })
    docLog.appendEntry({ docId: spaceId, deviceId: dev2, seq: 0, contentHash: 'h-d2-0', entryJws: 'jws-d2-0' })

    // (1) getStats() in-process shape.
    const stats = server.getStats() as { logStats: Record<string, unknown> }
    const logStats = stats.logStats as {
      entriesByDoc: Record<string, number>
      entriesByDocAndDevice: Record<string, Record<string, number>>
      spacesByDoc: Record<string, { registered: boolean; generation: number; admins: string[] }>
    }

    expect(logStats.entriesByDoc[spaceId]).toBe(3)
    expect(logStats.entriesByDocAndDevice[spaceId][dev1]).toBe(2)
    expect(logStats.entriesByDocAndDevice[spaceId][dev2]).toBe(1)
    expect(logStats.spacesByDoc[spaceId]).toEqual({
      registered: true,
      generation: 0,
      admins: [adminA, adminB], // ORDER BY admin_did ASC — deterministic
    })

    // (2) The real HTTP round-trip the remote harness performs (JSON serialization path).
    const res = await fetch(`${HTTP_BASE}/dashboard/data`)
    expect(res.ok).toBe(true)
    const json = (await res.json()) as typeof stats
    const httpLogStats = json.logStats as typeof logStats
    expect(httpLogStats.entriesByDocAndDevice[spaceId][dev1]).toBe(2)
    expect(httpLogStats.entriesByDocAndDevice[spaceId][dev2]).toBe(1)
    expect(httpLogStats.spacesByDoc[spaceId].registered).toBe(true)
    expect(httpLogStats.spacesByDoc[spaceId].generation).toBe(0)
    expect(httpLogStats.spacesByDoc[spaceId].admins).toEqual([adminA, adminB])
  })

  it('omits a docId/spaceId that has no entries / is unregistered (reader treats absence as zero/false)', async () => {
    const unknownDoc = randomUUID()
    const res = await fetch(`${HTTP_BASE}/dashboard/data`)
    const json = (await res.json()) as {
      logStats: {
        entriesByDoc: Record<string, number>
        entriesByDocAndDevice: Record<string, Record<string, number>>
        spacesByDoc: Record<string, unknown>
      }
    }
    expect(json.logStats.entriesByDocAndDevice[unknownDoc]).toBeUndefined()
    expect(json.logStats.spacesByDoc[unknownDoc]).toBeUndefined()
  })
})
