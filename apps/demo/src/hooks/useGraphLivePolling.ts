import { useEffect } from 'react'

/**
 * Live-Polling für die Network-Seite (Beamer-Modus): solange die Seite gemountet
 * ist, alle `intervalMs` die Graph-Cache-Einträge force-refreshen, damit der
 * Graph live wächst, während Workshop-Teilnehmer sich verifizieren. Page-lokal —
 * App-weites Verhalten bleibt unverändert. Der Interval wird beim Unmount sauber
 * aufgeräumt (kein Timer-Leak).
 */
export function useGraphLivePolling(
  forceRefresh: () => void | Promise<void>,
  intervalMs = 10_000,
): void {
  useEffect(() => {
    // Overlap-Guard (workshop-relevant: langsamer Pi + viele Kontakte): ein neuer
    // Tick startet KEINEN neuen Sweep, solange der vorige noch in-flight ist —
    // sonst stapeln sich Läufe, sobald ein Sweep länger als intervalMs dauert.
    let busy = false
    const id = setInterval(() => {
      if (busy) return
      busy = true
      try {
        // Swallow transient refresh failures (offline peer, server hiccup) so a
        // rejected poll never becomes an unhandled rejection — the next tick retries.
        Promise.resolve(forceRefresh())
          .catch(() => {})
          .finally(() => { busy = false })
      } catch {
        // Synchroner Throw aus forceRefresh: Latch sofort lösen, nächster Tick retryt.
        busy = false
      }
    }, intervalMs)
    return () => clearInterval(id)
  }, [forceRefresh, intervalMs])
}
