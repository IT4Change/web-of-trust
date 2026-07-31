/**
 * Lifecycle lease — structured cancellation for long-running adapter flights.
 *
 * A replication adapter's `createSpace` flight is a chain of awaits (key
 * provisioning, durable writes, publication, log seed, snapshot scheduling), and a
 * `stop()` can land in ANY gap between them. Everything after such a gap is a
 * mutation of session-wide state: the spaces map, observers, the coordinator map,
 * the durable log, the vault schedulers. A flight that outlived its session must
 * not perform any of them.
 *
 * Hand-placing an epoch comparison after each await does not hold up: every new
 * await inside the flight silently re-opens the hole, which is how the same class
 * of defect kept reappearing one boundary further down. A lease makes the check the
 * await itself — `await lease.step(work)` resumes only into a session that is still
 * the one that issued the lease.
 *
 * SEMANTICS: a lease bounds which effects are *started*, not which ones complete. A
 * durable write already in flight cannot be recalled, so effects must stay
 * idempotent on their own (for the private space that is the deterministic genesis:
 * same derivation, first-writer-wins registration, resume from durable evidence).
 * What the lease guarantees is that no FURTHER effect begins once the lifecycle
 * moved on.
 */

/** Thrown when a flight tries to continue into a session that is no longer its own. */
export class LifecycleChangedError extends Error {
  constructor(what: string) {
    super(`adapter lifecycle changed (stop) while ${what} was in flight`)
    this.name = 'LifecycleChangedError'
  }
}

export interface LifecycleLease {
  /** True while the session that issued this lease is still the live one. */
  readonly valid: boolean
  /** Throw unless the issuing session is still live. Use before a synchronous effect. */
  check(): void
  /**
   * Await `work` and re-check before returning — so the caller resumes only into its
   * own session. Every await inside a leased flight should go through this.
   */
  step<T>(work: Promise<T>): Promise<T>
}

/**
 * Open a lease on the session that is live right now. `currentEpoch` reads the
 * adapter's monotonic lifecycle counter, which `stop()` increments.
 */
export function openLifecycleLease(currentEpoch: () => number, what = 'the operation'): LifecycleLease {
  const issued = currentEpoch()
  const check = (): void => {
    if (currentEpoch() !== issued) throw new LifecycleChangedError(what)
  }
  return {
    get valid() {
      return currentEpoch() === issued
    },
    check,
    async step<T>(work: Promise<T>): Promise<T> {
      const result = await work
      check()
      return result
    },
  }
}
