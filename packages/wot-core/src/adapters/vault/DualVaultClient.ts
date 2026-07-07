import type { VaultClient, VaultChangesResponse, VaultDocInfo } from './VaultClient'

/**
 * Structural vault-client surface shared by {@link VaultClient} and
 * {@link DualVaultClient} — consumers (personal-doc manager, replication
 * adapter) depend on this, not on the concrete class.
 */
export interface VaultClientLike {
  pushChange(docId: string, encryptedData: Uint8Array): Promise<number>
  getChanges(docId: string, since?: number): Promise<VaultChangesResponse>
  putSnapshot(docId: string, encryptedData: Uint8Array, nonce: Uint8Array, upToSeq: number): Promise<void>
  getDocInfo(docId: string): Promise<VaultDocInfo | null>
  deleteDoc(docId: string): Promise<void>
}

/**
 * Dual-vault decorator (Stage A, I-VAULT-SURVIVES): writes go to EVERY vault
 * (best-effort — one target failing never blocks the other; throws only when
 * ALL fail), reads MERGE both vaults so recovery works no matter which vault
 * survived (the festival box may be gone, or freshly reset while the public
 * vault still holds the data).
 *
 * seq semantics: vault sequence numbers are VAULT-LOCAL (independent counters).
 * pushChange returns the primary's seq when the primary succeeded, else the
 * first successful secondary's. Consumers must not correlate seqs across
 * vaults — the merge-read below never does.
 */
export class DualVaultClient implements VaultClientLike {
  private readonly targets: VaultClient[]

  constructor(targets: VaultClient[]) {
    if (targets.length === 0) throw new Error('DualVaultClient: need at least one vault')
    this.targets = targets
  }

  async pushChange(docId: string, encryptedData: Uint8Array): Promise<number> {
    const results = await Promise.allSettled(this.targets.map((t) => t.pushChange(docId, encryptedData)))
    const firstOk = results.find((r): r is PromiseFulfilledResult<number> => r.status === 'fulfilled')
    if (!firstOk) {
      const firstErr = (results[0] as PromiseRejectedResult).reason
      throw firstErr instanceof Error ? firstErr : new Error(String(firstErr))
    }
    this.logPartialFailures('pushChange', results)
    return firstOk.value
  }

  async putSnapshot(docId: string, encryptedData: Uint8Array, nonce: Uint8Array, upToSeq: number): Promise<void> {
    // upToSeq is vault-local — computing it from one vault and applying it to the
    // other could prune foreign changes. Safe stage-A semantics: only the PRIMARY
    // gets the compacting snapshot with the caller's upToSeq; secondaries receive
    // the same snapshot bytes with upToSeq=0 (pure additive backup, no pruning).
    const results = await Promise.allSettled(
      this.targets.map((t, i) => t.putSnapshot(docId, encryptedData, nonce, i === 0 ? upToSeq : 0)),
    )
    if (!results.some((r) => r.status === 'fulfilled')) {
      const firstErr = (results[0] as PromiseRejectedResult).reason
      throw firstErr instanceof Error ? firstErr : new Error(String(firstErr))
    }
    this.logPartialFailures('putSnapshot', results)
  }

  /**
   * Merge-read: query ALL vaults, apply everything. CRDT updates are
   * idempotent/commutative, so concatenating both change sets (plus the newest
   * snapshot by upToSeq) is safe and strictly more complete than first-success —
   * it survives "one vault is reachable but empty".
   */
  async getChanges(docId: string, since = 0): Promise<VaultChangesResponse> {
    const results = await Promise.allSettled(this.targets.map((t) => t.getChanges(docId, since)))
    const ok = results.filter((r): r is PromiseFulfilledResult<VaultChangesResponse> => r.status === 'fulfilled')
    if (ok.length === 0) {
      const firstErr = (results[0] as PromiseRejectedResult).reason
      throw firstErr instanceof Error ? firstErr : new Error(String(firstErr))
    }
    this.logPartialFailures('getChanges', results)
    const snapshots = ok.map((r) => r.value.snapshot).filter((s): s is NonNullable<typeof s> => s != null)
    const newestSnapshot = snapshots.length
      ? snapshots.reduce((a, b) => (b.upToSeq > a.upToSeq ? b : a))
      : null
    return {
      docId,
      snapshot: newestSnapshot,
      changes: ok.flatMap((r) => r.value.changes),
    }
  }

  async getDocInfo(docId: string): Promise<VaultDocInfo | null> {
    const results = await Promise.allSettled(this.targets.map((t) => t.getDocInfo(docId)))
    const infos = results
      .filter((r): r is PromiseFulfilledResult<VaultDocInfo | null> => r.status === 'fulfilled')
      .map((r) => r.value)
      .filter((v): v is VaultDocInfo => v !== null)
    if (infos.length === 0) {
      if (results.every((r) => r.status === 'rejected')) {
        const firstErr = (results[0] as PromiseRejectedResult).reason
        throw firstErr instanceof Error ? firstErr : new Error(String(firstErr))
      }
      return null
    }
    return infos.reduce((a, b) => (b.latestSeq > a.latestSeq ? b : a))
  }

  async deleteDoc(docId: string): Promise<void> {
    const results = await Promise.allSettled(this.targets.map((t) => t.deleteDoc(docId)))
    // Teardown is a security surface: deletion must not silently half-succeed.
    if (!results.every((r) => r.status === 'fulfilled')) {
      const firstErr = (results.find((r) => r.status === 'rejected') as PromiseRejectedResult).reason
      throw firstErr instanceof Error ? firstErr : new Error(String(firstErr))
    }
  }

  private logPartialFailures(op: string, results: PromiseSettledResult<unknown>[]): void {
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        console.debug(`[DualVault] ${op}: target ${i} failed (best-effort):`, r.reason)
      }
    })
  }
}
