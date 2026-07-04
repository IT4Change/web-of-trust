import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'

// The debug flag + the DebugPanel bind the flag at module load, so each case imports them fresh
// with the env stubbed. Verifies the DOM-level gating (mount matrix + data-testid presence).

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
  vi.resetModules()
  delete (globalThis as { __wotDebug?: unknown }).__wotDebug
})

async function loadPanel(flag: string | undefined) {
  vi.resetModules()
  vi.stubEnv('VITE_WOT_DEBUG_OBSERVABILITY', flag ?? '')
  const obs = await import('../src/debug/debugObservability')
  const { DebugPanel } = await import('../src/components/debug/DebugPanel')
  return { obs, DebugPanel }
}

const SNAP = {
  core: {},
  deviceId: 'test-device-id-xyz',
  did: 'did:key:zTestTestTest',
  spaces: [],
  outboxDepth: 0,
  keystore: { enrolled: false },
  durableStores: [],
}

describe('DebugPanel D2 observability — DOM gating', () => {
  it('DEFAULT-OFF: the data-testid JSON element is NOT in the DOM without the flag', async () => {
    const { obs, DebugPanel } = await loadPanel(undefined)
    // Even if some caller tries to register, gating no-ops it.
    obs.setDebugObservabilityCollector(async () => SNAP as never)
    render(<DebugPanel />)
    expect(screen.queryByTestId('wot-debug-json')).toBeNull()
  })

  it('DEBUG-ON: the data-testid JSON element appears with the snapshot once a collector is registered', async () => {
    const { obs, DebugPanel } = await loadPanel('1')
    obs.setDebugObservabilityCollector(async () => SNAP as never)
    render(<DebugPanel />)
    const el = await screen.findByTestId('wot-debug-json', {}, { timeout: 3000 })
    expect(el.textContent).toContain('test-device-id-xyz')
    expect(el.textContent).toContain('did:key:zTestTestTest')
  })

  it('clears the data-testid element when the collector is unregistered (no stale-identity in the switch gap)', async () => {
    const { obs, DebugPanel } = await loadPanel('1')
    obs.setDebugObservabilityCollector(async () => SNAP as never)
    render(<DebugPanel />)
    await screen.findByTestId('wot-debug-json', {}, { timeout: 3000 })
    // Identity-switch / logout unregisters the collector → the next poll must drop the retained
    // snapshot so the element never shows the previous identity's data.
    obs.setDebugObservabilityCollector(null)
    await waitFor(() => expect(screen.queryByTestId('wot-debug-json')).toBeNull(), { timeout: 3000 })
  })

  it('DEBUG-ON but no collector registered: no data-testid (channel gated on an actual collector)', async () => {
    const { DebugPanel } = await loadPanel('1')
    render(<DebugPanel />)
    // Give the poll a couple ticks; with no collector, appSnapshot stays null → no element.
    await new Promise((r) => setTimeout(r, 100))
    expect(screen.queryByTestId('wot-debug-json')).toBeNull()
  })
})
