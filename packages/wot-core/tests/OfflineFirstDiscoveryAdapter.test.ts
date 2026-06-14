import { describe, it, expect, beforeEach, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { OfflineFirstDiscoveryAdapter } from '../src/adapters/discovery/OfflineFirstDiscoveryAdapter'
import { InMemoryPublishStateStore } from '../src/adapters/discovery/InMemoryPublishStateStore'
import { InMemoryGraphCacheStore } from '../src/adapters/discovery/InMemoryGraphCacheStore'
import {
  ProfileResourceRollbackError,
  type DiscoveryAdapter,
  type PublicAttestationsData,
} from '../src/ports/DiscoveryAdapter'
import type { PublicProfile } from '../src/types/identity'
import type { PublicIdentitySession } from '../src/application/identity'

const ALICE_DID = 'did:key:z6MkAlice1234567890abcdefghijklmnopqrstuvwxyz'

const TEST_PROFILE: PublicProfile = {
  did: ALICE_DID,
  name: 'Alice',
  updatedAt: new Date().toISOString(),
}

const TEST_ATTESTATIONS: PublicAttestationsData = {
  did: ALICE_DID,
  attestations: [],
  updatedAt: new Date().toISOString(),
}

const MOCK_IDENTITY = {} as PublicIdentitySession

function createMockInner(overrides: Partial<DiscoveryAdapter> = {}): DiscoveryAdapter {
  return {
    publishProfile: vi.fn().mockResolvedValue(undefined),
    publishAttestations: vi.fn().mockResolvedValue(undefined),
    publishVerifications: vi.fn().mockResolvedValue(undefined),
    resolveProfile: vi.fn().mockResolvedValue({ profile: null, fromCache: false }),
    resolveAttestations: vi.fn().mockResolvedValue([]),
    resolveVerifications: vi.fn().mockResolvedValue([]),
    ...overrides,
  }
}

describe('OfflineFirstDiscoveryAdapter', () => {
  let inner: DiscoveryAdapter
  let publishState: InMemoryPublishStateStore
  let graphCache: InMemoryGraphCacheStore
  let adapter: OfflineFirstDiscoveryAdapter

  beforeEach(() => {
    inner = createMockInner()
    publishState = new InMemoryPublishStateStore()
    graphCache = new InMemoryGraphCacheStore()
    adapter = new OfflineFirstDiscoveryAdapter(inner, publishState, graphCache)
  })

  describe('publishProfile', () => {
    it('should mark dirty and clear on success', async () => {
      await adapter.publishProfile(TEST_PROFILE, MOCK_IDENTITY)

      expect(inner.publishProfile).toHaveBeenCalledWith(TEST_PROFILE, MOCK_IDENTITY)
      const dirty = await publishState.getDirtyFields(ALICE_DID)
      expect(dirty.size).toBe(0)
    })

    it('should keep dirty flag on failure', async () => {
      inner = createMockInner({
        publishProfile: vi.fn().mockRejectedValue(new Error('Network error')),
      })
      adapter = new OfflineFirstDiscoveryAdapter(inner, publishState, graphCache)

      await adapter.publishProfile(TEST_PROFILE, MOCK_IDENTITY)

      const dirty = await publishState.getDirtyFields(ALICE_DID)
      expect(dirty.has('profile')).toBe(true)
    })
  })

  describe('publishAttestations', () => {
    it('should mark dirty and clear on success', async () => {
      await adapter.publishAttestations(TEST_ATTESTATIONS, MOCK_IDENTITY)

      expect(inner.publishAttestations).toHaveBeenCalledWith(TEST_ATTESTATIONS, MOCK_IDENTITY)
      const dirty = await publishState.getDirtyFields(ALICE_DID)
      expect(dirty.size).toBe(0)
    })

    it('should keep dirty flag on failure', async () => {
      inner = createMockInner({
        publishAttestations: vi.fn().mockRejectedValue(new Error('Network error')),
      })
      adapter = new OfflineFirstDiscoveryAdapter(inner, publishState, graphCache)

      await adapter.publishAttestations(TEST_ATTESTATIONS, MOCK_IDENTITY)

      const dirty = await publishState.getDirtyFields(ALICE_DID)
      expect(dirty.has('attestations')).toBe(true)
    })
  })

  describe('resolveProfile', () => {
    it('should return profile with fromCache=false on successful resolve', async () => {
      inner = createMockInner({
        resolveProfile: vi.fn().mockResolvedValue({ profile: TEST_PROFILE, fromCache: false }),
      })
      adapter = new OfflineFirstDiscoveryAdapter(inner, publishState, graphCache)

      const result = await adapter.resolveProfile(ALICE_DID)

      expect(result.profile).toEqual(TEST_PROFILE)
      expect(result.fromCache).toBe(false)
    })

    it('should return cached profile with fromCache=true when inner fails', async () => {
      // Pre-populate graph cache
      await graphCache.cacheEntry(ALICE_DID, { profile: TEST_PROFILE, attestations: [], verifications: [] })

      inner = createMockInner({
        resolveProfile: vi.fn().mockRejectedValue(new Error('Offline')),
      })
      adapter = new OfflineFirstDiscoveryAdapter(inner, publishState, graphCache)

      const result = await adapter.resolveProfile(ALICE_DID)

      expect(result.profile).not.toBeNull()
      expect(result.profile!.name).toBe('Alice')
      expect(result.profile!.did).toBe(ALICE_DID)
      expect(result.fromCache).toBe(true)
    })

    it('should return null profile with fromCache=true when inner fails and no cache exists', async () => {
      inner = createMockInner({
        resolveProfile: vi.fn().mockRejectedValue(new Error('Offline')),
      })
      adapter = new OfflineFirstDiscoveryAdapter(inner, publishState, graphCache)

      const result = await adapter.resolveProfile(ALICE_DID)

      expect(result.profile).toBeNull()
      expect(result.fromCache).toBe(true)
    })

    it('should return null profile with fromCache=false when inner returns null', async () => {
      inner = createMockInner({
        resolveProfile: vi.fn().mockResolvedValue({ profile: null, fromCache: false }),
      })
      adapter = new OfflineFirstDiscoveryAdapter(inner, publishState, graphCache)

      const result = await adapter.resolveProfile(ALICE_DID)

      expect(result.profile).toBeNull()
      expect(result.fromCache).toBe(false)

      const cached = await graphCache.getEntry(ALICE_DID)
      expect(cached).toBeNull()
    })

    it('should re-throw an inner rollback instead of falling back to cached profile', async () => {
      // VE-3: version monotonicity + rollback detection now live exclusively in
      // the inner HTTP adapter. The decorator must surface the inner
      // ProfileResourceRollbackError, never mask it with the offline cache.
      await graphCache.cacheEntry(ALICE_DID, { profile: TEST_PROFILE, attestations: [], verifications: [] })

      inner = createMockInner({
        resolveProfile: vi.fn()
          .mockResolvedValueOnce({ profile: TEST_PROFILE, version: 7, fromCache: false })
          .mockRejectedValueOnce(new ProfileResourceRollbackError(ALICE_DID, 6, 7, 'profile')),
      })
      adapter = new OfflineFirstDiscoveryAdapter(inner, publishState, graphCache)

      await expect(adapter.resolveProfile(ALICE_DID)).resolves.toMatchObject({
        profile: TEST_PROFILE,
        version: 7,
        fromCache: false,
      })

      await expect(adapter.resolveProfile(ALICE_DID)).rejects.toBeInstanceOf(ProfileResourceRollbackError)
    })
  })

  describe('resolveAttestations', () => {
    it('should return attestations from inner on success', async () => {
      const attestations = [{ id: 'a1' }] as any
      inner = createMockInner({
        resolveAttestations: vi.fn().mockResolvedValue(attestations),
      })
      adapter = new OfflineFirstDiscoveryAdapter(inner, publishState, graphCache)

      const result = await adapter.resolveAttestations(ALICE_DID)

      expect(result).toEqual(attestations)
    })

    it('should return cached attestations when inner fails', async () => {
      const attestations = [{ id: 'a1', from: 'did:key:bob', to: ALICE_DID, claim: 'Test', createdAt: '2026-01-01', proof: {} }] as any
      await graphCache.cacheEntry(ALICE_DID, { profile: TEST_PROFILE, attestations, verifications: [] })

      inner = createMockInner({
        resolveAttestations: vi.fn().mockRejectedValue(new Error('Offline')),
      })
      adapter = new OfflineFirstDiscoveryAdapter(inner, publishState, graphCache)

      const result = await adapter.resolveAttestations(ALICE_DID)

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('a1')
    })

    it('should return empty array when inner fails and no cache exists', async () => {
      inner = createMockInner({
        resolveAttestations: vi.fn().mockRejectedValue(new Error('Offline')),
      })
      adapter = new OfflineFirstDiscoveryAdapter(inner, publishState, graphCache)

      const result = await adapter.resolveAttestations(ALICE_DID)

      expect(result).toEqual([])
    })
  })

  describe('resolveSummaries', () => {
    it('should delegate to inner adapter when supported', async () => {
      const summaries = [
        { did: ALICE_DID, name: 'Alice', verificationCount: 3, attestationCount: 1 },
      ]
      inner = createMockInner({
        resolveSummaries: vi.fn().mockResolvedValue(summaries),
      })
      adapter = new OfflineFirstDiscoveryAdapter(inner, publishState, graphCache)

      const result = await adapter.resolveSummaries([ALICE_DID])

      expect(result).toEqual(summaries)
      expect(inner.resolveSummaries).toHaveBeenCalledWith([ALICE_DID])
    })

    it('should throw when inner adapter does not support resolveSummaries', async () => {
      // Default mock has no resolveSummaries
      await expect(adapter.resolveSummaries([ALICE_DID]))
        .rejects.toThrow('Inner adapter does not support resolveSummaries')
    })
  })

  describe('syncPending', () => {
    it('should do nothing when no dirty fields', async () => {
      const getPublishData = vi.fn()

      await adapter.syncPending(ALICE_DID, MOCK_IDENTITY, getPublishData)

      expect(getPublishData).not.toHaveBeenCalled()
      expect(inner.publishProfile).not.toHaveBeenCalled()
    })

    it('should retry all dirty fields', async () => {
      // Simulate failed publishes
      const failingInner = createMockInner({
        publishProfile: vi.fn().mockRejectedValue(new Error('Offline')),
        publishAttestations: vi.fn().mockRejectedValue(new Error('Offline')),
      })
      const failingAdapter = new OfflineFirstDiscoveryAdapter(failingInner, publishState, graphCache)

      await failingAdapter.publishProfile(TEST_PROFILE, MOCK_IDENTITY)
      await failingAdapter.publishAttestations(TEST_ATTESTATIONS, MOCK_IDENTITY)

      // Verify both are dirty
      const dirty = await publishState.getDirtyFields(ALICE_DID)
      expect(dirty.size).toBe(2)

      // Now retry with a working inner adapter
      const getPublishData = vi.fn().mockResolvedValue({
        profile: TEST_PROFILE,
        attestations: TEST_ATTESTATIONS,
      })

      await adapter.syncPending(ALICE_DID, MOCK_IDENTITY, getPublishData)

      expect(inner.publishProfile).toHaveBeenCalledWith(TEST_PROFILE, MOCK_IDENTITY)
      expect(inner.publishAttestations).toHaveBeenCalledWith(TEST_ATTESTATIONS, MOCK_IDENTITY)

      // All should be cleared
      const dirtyAfter = await publishState.getDirtyFields(ALICE_DID)
      expect(dirtyAfter.size).toBe(0)
    })

    it('should clear individually on partial success', async () => {
      // Mark both as dirty
      await publishState.markDirty(ALICE_DID, 'profile')
      await publishState.markDirty(ALICE_DID, 'attestations')

      // Inner: profile succeeds, attestations fails
      inner = createMockInner({
        publishProfile: vi.fn().mockResolvedValue(undefined),
        publishAttestations: vi.fn().mockRejectedValue(new Error('Server error')),
      })
      adapter = new OfflineFirstDiscoveryAdapter(inner, publishState, graphCache)

      const getPublishData = vi.fn().mockResolvedValue({
        profile: TEST_PROFILE,
        attestations: TEST_ATTESTATIONS,
      })

      await adapter.syncPending(ALICE_DID, MOCK_IDENTITY, getPublishData)

      const dirty = await publishState.getDirtyFields(ALICE_DID)
      expect(dirty.size).toBe(1)
      expect(dirty.has('attestations')).toBe(true)
      expect(dirty.has('profile')).toBe(false)
    })

    it('should skip fields without data in getPublishData', async () => {
      await publishState.markDirty(ALICE_DID, 'profile')
      await publishState.markDirty(ALICE_DID, 'attestations')

      const getPublishData = vi.fn().mockResolvedValue({
        profile: TEST_PROFILE,
        // attestations NOT provided
      })

      await adapter.syncPending(ALICE_DID, MOCK_IDENTITY, getPublishData)

      expect(inner.publishProfile).toHaveBeenCalled()
      expect(inner.publishAttestations).not.toHaveBeenCalled()

      // Profile cleared, attestations still dirty (no data to retry with)
      const dirty = await publishState.getDirtyFields(ALICE_DID)
      expect(dirty.has('profile')).toBe(false)
      expect(dirty.has('attestations')).toBe(true)
    })

    it('should use fresh data from getPublishData callback', async () => {
      await publishState.markDirty(ALICE_DID, 'profile')

      const updatedProfile: PublicProfile = {
        ...TEST_PROFILE,
        name: 'Alice Updated',
      }

      const getPublishData = vi.fn().mockResolvedValue({
        profile: updatedProfile,
      })

      await adapter.syncPending(ALICE_DID, MOCK_IDENTITY, getPublishData)

      // Should publish the UPDATED profile, not the stale one
      expect(inner.publishProfile).toHaveBeenCalledWith(updatedProfile, MOCK_IDENTITY)
    })
  })
})

describe('Discovery 1.B.3 spec-form verification publication surface', () => {
  // VE-1/VE-2 inversion (1.B.3 Step 2): the May refactor (#094 / 9117c82) removed
  // the UNSPECIFIED legacy `/v` publication surface. This slice RESTORES `/v`
  // spec-driven (Sync 004 §004, wot-spec #101/#102), so PublicVerificationsData /
  // publishVerifications / resolveVerifications MUST exist on the discovery surface.
  // STILL BANNED: the legacy structured Verification type module import.
  const read = (file: string): string => {
    const candidates = [file, path.join('..', '..', file), path.join('..', file)]
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) return fs.readFileSync(candidate, 'utf8')
    }
    throw new Error(`source guard cannot locate ${file}`)
  }

  it('exposes PublicVerificationsData/publishVerifications/resolveVerifications on the DiscoveryAdapter surface', () => {
    const port = read('packages/wot-core/src/ports/DiscoveryAdapter.ts')
    const http = read('packages/wot-core/src/adapters/discovery/HttpDiscoveryAdapter.ts')
    const offline = read('packages/wot-core/src/adapters/discovery/OfflineFirstDiscoveryAdapter.ts')

    const hits: string[] = []

    if (!port.includes('PublicVerificationsData')) hits.push('DiscoveryAdapter port must define PublicVerificationsData')
    for (const [file, text] of [['DiscoveryAdapter.ts', port], ['HttpDiscoveryAdapter.ts', http], ['OfflineFirstDiscoveryAdapter.ts', offline]] as const) {
      if (!text.includes('publishVerifications')) hits.push(`${file} must expose publishVerifications`)
      if (!text.includes('resolveVerifications')) hits.push(`${file} must expose resolveVerifications`)
    }

    // STILL BANNED: legacy structured Verification type import in the HTTP adapter.
    if (/from\s+['"][^'"]*types\/verification['"]/.test(http)) {
      hits.push('HttpDiscoveryAdapter.ts still imports the legacy Verification type')
    }

    expect(hits).toEqual([])
  })

  it('narrows PublishStateField to profile | attestations and drops verifications from in-memory store', () => {
    const portFile = 'packages/wot-core/src/ports/PublishStateStore.ts'
    const inMemoryFile = 'packages/wot-core/src/adapters/discovery/InMemoryPublishStateStore.ts'

    const portText = read(portFile)
    const inMemoryText = read(inMemoryFile)

    const hits: string[] = []

    if (portText.includes("'verifications'")) {
      hits.push(`${portFile} still includes 'verifications' in PublishStateField`)
    }
    if (!/PublishStateField\s*=\s*'profile'\s*\|\s*'attestations'/.test(portText)) {
      hits.push(`${portFile} PublishStateField should narrow to 'profile' | 'attestations'`)
    }
    if (inMemoryText.includes("'verifications'") || /case\s+'verifications'/.test(inMemoryText)) {
      hits.push(`${inMemoryFile} still tracks 'verifications' as a publish state field`)
    }

    expect(hits).toEqual([])
  })

  it('drops verifications from OfflineFirstDiscoveryAdapter.syncPending getPublishData callback', () => {
    const offlineText = read('packages/wot-core/src/adapters/discovery/OfflineFirstDiscoveryAdapter.ts')
    const hits: string[] = []

    if (/verifications\??\s*:\s*PublicVerificationsData/.test(offlineText)) {
      hits.push('OfflineFirstDiscoveryAdapter.syncPending still accepts verifications in getPublishData')
    }
    if (/dirty\.has\(\s*['"]verifications['"]\s*\)/.test(offlineText)) {
      hits.push('OfflineFirstDiscoveryAdapter.syncPending still retries verifications dirty field')
    }

    expect(hits).toEqual([])
  })
})
