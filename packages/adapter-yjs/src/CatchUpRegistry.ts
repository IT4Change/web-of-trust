import type { DocCatchUpState } from '@web_of_trust/core/protocol'

export interface CatchUpOverview {
  /** Dokumente, für die nachweislich noch etwas aussteht. */
  outstanding: DocCatchUpState[]
  /** Kurzform: steht irgendwo noch etwas aus? */
  syncing: boolean
}

export interface CatchUpSource {
  /** Als Hook direkt in eine `LogSyncCoordinatorConfig` einsetzbar. */
  readonly update: (state: DocCatchUpState) => void
  /** Lebenszyklus zu Ende: eigenen Eintrag vergessen, spätere Meldungen ignorieren. */
  release(): void
}

const EMPTY: CatchUpOverview = { outstanding: [], syncing: false }

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
  private readonly listeners = new Set<(overview: CatchUpOverview) => void>()
  private readonly owners = new Map<string, number>()
  /** Global monoton, wird nie zurückgesetzt — ein Token darf nie wiederkehren. */
  private sourceSeq = 0
  private overview: CatchUpOverview = EMPTY

  /**
   * Eine Meldequelle für genau einen Coordinator-Lebenszyklus.
   *
   * Ohne diese Bindung könnte ein Flight, der einen Space-Cleanup oder ein
   * `destroy()` überlebt, seinen Zustand nachträglich wieder eintragen — beim
   * PersonalDoc sogar unter derselben deterministischen `docId` in einer neuen
   * Sitzung. Wer als Nächster für ein Dokument meldet, entwertet den
   * Vorgänger; `release()` räumt den eigenen Eintrag ab, fremde nicht.
   */
  source(docId: string): CatchUpSource {
    const token = ++this.sourceSeq
    this.owners.set(docId, token)
    return {
      update: (state: DocCatchUpState) => {
        if (this.owners.get(docId) !== token) return
        this.update(state)
      },
      release: () => {
        if (this.owners.get(docId) !== token) return
        this.owners.delete(docId)
        this.forget(docId)
      },
    }
  }

  /**
   * Roher Eingang ohne Lebenszyklusbindung. Für Aufrufer, die den Zustand
   * selbst besitzen; sonst {@link source} benutzen.
   */
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
    // Auch die Besitzverhältnisse: eine noch laufende alte Quelle darf nach
    // einem `clear()` nichts wiederbeleben.
    this.owners.clear()
    if (this.states.size === 0) return
    this.states.clear()
    this.publish()
  }

  /** Aktueller Gesamtstand aller Dokumente dieser Sitzung. */
  getOverview(): CatchUpOverview {
    return this.overview
  }

  subscribe(listener: (overview: CatchUpOverview) => void): () => void {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  private publish(): void {
    const outstanding = Array.from(this.states.values())
    this.overview = { outstanding, syncing: outstanding.length > 0 }
    for (const listener of this.listeners) {
      try {
        listener(this.overview)
      } catch (err) {
        console.debug('[CatchUpRegistry] listener failed:', err)
      }
    }
  }
}
