import type { DocCatchUpState } from '@web_of_trust/core/protocol'

export interface CatchUpSnapshot {
  /** Dokumente, für die nachweislich noch etwas aussteht. */
  outstanding: DocCatchUpState[]
  /** Kurzform: steht irgendwo noch etwas aus? */
  syncing: boolean
}

const EMPTY: CatchUpSnapshot = { outstanding: [], syncing: false }

/**
 * Sammelstelle für den Catch-up-Zustand aller Dokumente einer Sitzung (#343).
 *
 * Der PersonalDoc-Logsync und jeder Space benutzen denselben
 * {@link LogSyncCoordinator}; beide melden hierher, und eine Anwendung
 * abonniert EINE Quelle statt pro Dokument zu buchführen.
 *
 * Der Zustand ist bewusst nur so gross wie nötig: welche Dokumente haben noch
 * etwas offen. Was „offen" heisst, entscheidet der Coordinator — inklusive des
 * Falls, dass ein Lauf sauber endet und trotzdem eine Lücke bleibt.
 */
export class CatchUpRegistry {
  private readonly states = new Map<string, DocCatchUpState>()
  private readonly listeners = new Set<(snapshot: CatchUpSnapshot) => void>()
  private snapshot: CatchUpSnapshot = EMPTY

  /** Als Hook direkt in eine `LogSyncCoordinatorConfig` einsetzbar. */
  readonly update = (state: DocCatchUpState): void => {
    const previous = this.states.get(state.docId)
    if (
      previous &&
      previous.inFlight === state.inFlight &&
      previous.outstanding === state.outstanding &&
      previous.reason === state.reason
    ) return

    if (state.outstanding) this.states.set(state.docId, state)
    else this.states.delete(state.docId)
    this.publish()
  }

  /** Ein Dokument vergessen (Space verlassen, lokal entfernt). */
  forget(docId: string): void {
    if (!this.states.delete(docId)) return
    this.publish()
  }

  /** Sitzungsende: alles vergessen, ohne Abonnenten zu verlieren. */
  clear(): void {
    if (this.states.size === 0) return
    this.states.clear()
    this.publish()
  }

  getSnapshot(): CatchUpSnapshot {
    return this.snapshot
  }

  subscribe(listener: (snapshot: CatchUpSnapshot) => void): () => void {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  private publish(): void {
    const outstanding = Array.from(this.states.values())
    this.snapshot = { outstanding, syncing: outstanding.length > 0 }
    for (const listener of this.listeners) {
      try {
        listener(this.snapshot)
      } catch (err) {
        console.debug('[CatchUpRegistry] listener failed:', err)
      }
    }
  }
}
