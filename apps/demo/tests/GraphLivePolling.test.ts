/**
 * Tests für das page-lokale Live-Polling der Network-Seite (Beamer-Modus).
 * Fokus: der Interval feuert periodisch, überlappt NICHT (busy-Latch: ein neuer
 * Tick startet keinen zweiten Sweep, solange der vorige in-flight ist) UND wird
 * beim Unmount sauber aufgeräumt (kein Timer-Leak, kein setState nach Unmount —
 * Letzteres via Unmount-Guard in useGraphCache.forceRefresh, hier mitgetestet).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { Attestation } from '@web_of_trust/core/types'
import { useGraphLivePolling } from '../src/hooks/useGraphLivePolling'

describe('useGraphLivePolling', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('force-refreshes on every interval tick while mounted', async () => {
    const forceRefresh = vi.fn()
    renderHook(() => useGraphLivePolling(forceRefresh, 10_000))

    expect(forceRefresh).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(10_000)
    expect(forceRefresh).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(20_000)
    expect(forceRefresh).toHaveBeenCalledTimes(3)
  })

  it('clears the interval on unmount and stops polling (no timer leak)', async () => {
    const clearSpy = vi.spyOn(globalThis, 'clearInterval')
    const forceRefresh = vi.fn()
    const { unmount } = renderHook(() => useGraphLivePolling(forceRefresh, 10_000))

    await vi.advanceTimersByTimeAsync(10_000)
    expect(forceRefresh).toHaveBeenCalledTimes(1)

    unmount()
    expect(clearSpy).toHaveBeenCalled()

    // After unmount the timer must not fire again.
    await vi.advanceTimersByTimeAsync(60_000)
    expect(forceRefresh).toHaveBeenCalledTimes(1)
  })

  it('does not start a second sweep while the previous one is still in-flight (overlap guard)', async () => {
    let release!: () => void
    const gate = new Promise<void>((resolve) => { release = resolve })
    const forceRefresh = vi.fn(() => gate)
    renderHook(() => useGraphLivePolling(forceRefresh, 10_000))

    await vi.advanceTimersByTimeAsync(10_000)
    expect(forceRefresh).toHaveBeenCalledTimes(1)

    // Sweep dauert länger als 3 weitere Ticks — busy-Latch hält, keine Stapelung.
    await vi.advanceTimersByTimeAsync(30_000)
    expect(forceRefresh).toHaveBeenCalledTimes(1)

    // Sweep beendet → nächster Tick pollt wieder.
    release()
    await vi.advanceTimersByTimeAsync(10_000)
    expect(forceRefresh).toHaveBeenCalledTimes(2)
  })

  it('releases the busy latch after a rejected sweep (next tick retries)', async () => {
    const forceRefresh = vi.fn(async () => { throw new Error('network down') })
    renderHook(() => useGraphLivePolling(forceRefresh, 5_000))

    await vi.advanceTimersByTimeAsync(5_000)
    expect(forceRefresh).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(5_000)
    expect(forceRefresh).toHaveBeenCalledTimes(2)
  })

  it('releases the busy latch after a synchronous throw (next tick retries)', async () => {
    const forceRefresh = vi.fn(() => { throw new Error('sync boom') })
    renderHook(() => useGraphLivePolling(forceRefresh, 5_000))

    await vi.advanceTimersByTimeAsync(5_000)
    expect(forceRefresh).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(5_000)
    expect(forceRefresh).toHaveBeenCalledTimes(2)
  })
})

// --- Unmount-Guard in useGraphCache.forceRefresh (kein setState nach Unmount) ---

const CONTACT_DID = 'did:key:z6MkContact'

let resolveProfileGate!: (value: { profile: null }) => void

const discoveryMock = {
  resolveProfile: vi.fn(),
  resolveAttestations: vi.fn(async () => [] as Attestation[]),
  resolveVerifications: vi.fn(async () => [] as Attestation[]),
  resolveSummaries: vi.fn(async () => []),
}

const graphCacheStoreMock = {
  getEntries: vi.fn(async () => new Map()),
  getEntry: vi.fn(async () => null),
  getCachedVerifications: vi.fn(async () => [] as Attestation[]),
  cacheEntry: vi.fn(async () => {}),
  updateSummary: vi.fn(async () => {}),
  resolveName: vi.fn(async () => null),
}

vi.mock('../src/context', () => ({
  useAdapters: () => ({ discovery: discoveryMock, graphCacheStore: graphCacheStoreMock }),
}))

// Stabile Referenz — eine neue Array-Identität pro Render würde den Mount-Effect
// von useGraphCache (dep: activeContacts) in eine Endlosschleife treiben.
const activeContactsForTest = [{ did: CONTACT_DID, name: 'Contact' }]

vi.mock('../src/hooks/useContacts', () => ({
  useContacts: () => ({ activeContacts: activeContactsForTest }),
}))

import { useGraphCache } from '../src/hooks/useGraphCache'

describe('useGraphCache.forceRefresh unmount guard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    graphCacheStoreMock.getEntries.mockImplementation(async () => new Map())
    graphCacheStoreMock.getCachedVerifications.mockImplementation(async () => [])
  })

  it('does not reload state (getEntries) after unmount when the sweep finishes in-flight', async () => {
    // service.refresh(did) blockiert auf resolveProfile, bis wir das Gate öffnen.
    const gate = new Promise<{ profile: null }>((resolve) => { resolveProfileGate = resolve })
    discoveryMock.resolveProfile.mockImplementation(() => gate)

    const { result, unmount } = renderHook(() => useGraphCache())
    // Mount-Effect (loadAndRefresh) settlen lassen.
    await act(async () => {})

    const getEntriesCallsBefore = graphCacheStoreMock.getEntries.mock.calls.length

    // Sweep starten — bleibt in-flight (resolveProfile hängt am Gate).
    let sweep!: Promise<void>
    act(() => { sweep = result.current.forceRefresh() })

    // Unmount, WÄHREND der Sweep läuft, dann Sweep fertig laufen lassen.
    unmount()
    resolveProfileGate({ profile: null })
    await sweep

    // Guard: nach Unmount weder State-Reload (getEntries) noch setState.
    expect(graphCacheStoreMock.getEntries.mock.calls.length).toBe(getEntriesCallsBefore)
  })

  it('reloads state after the sweep when still mounted (control case)', async () => {
    discoveryMock.resolveProfile.mockImplementation(async () => ({ profile: null }))

    const { result } = renderHook(() => useGraphCache())
    await act(async () => {})

    const getEntriesCallsBefore = graphCacheStoreMock.getEntries.mock.calls.length

    await act(async () => { await result.current.forceRefresh() })

    expect(graphCacheStoreMock.getEntries.mock.calls.length).toBeGreaterThan(getEntriesCallsBefore)
  })
})
