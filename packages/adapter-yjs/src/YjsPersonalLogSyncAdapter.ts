/**
 * YjsPersonalLogSyncAdapter — Personal-Doc multi-device sync on the Sync 002/003
 * LOG path (Slice A VE-6, Sync 006).
 *
 * This is the additive, opt-in (`enableLogSync`) counterpart to
 * {@link YjsPersonalSyncAdapter} (the legacy `personal-sync` OneShot broadcast).
 * It reuses the SAME engine-neutral {@link LogSyncCoordinator} as the Space path,
 * so the Personal-Doc gets the identical single-writer / multi-device / loop-guard
 * / catch-up / restore-clone machinery.
 *
 * Personal-Doc bindings (Sync 006 / Sync 003 `#persönliche-dokumente`):
 *  - It is a Single-Writer-per-device, Multi-Device CRDT — same Log-Core.
 *  - NO space-register (the personal doc is not a Space; `sendSpaceRegister`
 *    is omitted). The capability is a SELF-ISSUED Personal-Doc-Capability under
 *    the Identity Key (kid = `<did>#sig-0`, audience = own DID).
 *  - The content key is derived deterministically from the seed and is NEVER
 *    rotated (generation = 0 permanently). Nonce uniqueness therefore rests
 *    SOLELY on seq monotonicity per deviceId — so the broker-head-abgleich
 *    (VE-2) before the first publication AND the restore/clone path (VE-4) apply
 *    to the Personal-Doc docId with IDENTICAL strictness as for Spaces.
 *
 * LOOP-GUARD (VE-3, as in the Space path): the Y.Doc `update` observer writes a
 * log entry ONLY for LOCAL changes (`origin !== 'remote'`); the read path applies
 * remote entries with `origin='remote'` and NEVER re-broadcasts or re-writes.
 *
 * NON-GOAL: this does NOT touch `useProfileSync` / the `profile-update` envelope
 * (that is Old-World contact distribution, not a Personal-Doc CRDT sync) and does
 * NOT touch the legacy `personal-sync` path.
 */
import * as Y from 'yjs'
import type { MessagingAdapter, WireMessage, DocLogStore } from '@web_of_trust/core/ports'
import type { IdentitySession } from '@web_of_trust/core/types'
import type {
  ProtocolCryptoAdapter,
  CapabilitySource,
  LogSyncEngineHooks,
} from '@web_of_trust/core/protocol'
import {
  LogSyncCoordinator,
  AuthorMismatchError,
  createPersonalDocCapabilityJwsWithSigner,
  LOG_ENTRY_MESSAGE_TYPE,
  SYNC_RESPONSE_MESSAGE_TYPE,
} from '@web_of_trust/core/protocol'
import { WebCryptoProtocolCryptoAdapter } from '@web_of_trust/core/protocol-adapters'
import { createRestoreCloneHandler } from './logRestoreClone'

/** The Personal-Doc capability/content generation — permanently 0 (never rotated). */
const PERSONAL_DOC_GENERATION = 0

export interface YjsPersonalLogSyncConfig {
  doc: Y.Doc
  messaging: MessagingAdapter
  identity: IdentitySession
  /** The deterministic Personal-Doc content key (derived from the seed; never rotated). */
  personalKey: Uint8Array
  /** The Personal-Doc docId (UUID v4, e.g. personalDocIdFromKey(personalKey)). */
  docId: string
  docLogStore: DocLogStore
  /** Stable per-device UUID for the seq namespace. */
  deviceId: string
  crypto?: ProtocolCryptoAdapter
  /** Mint a fresh deviceId on restore-clone (injectable for tests). */
  mintDeviceId?: () => string
  /** Notified after a restore-clone re-binds the deviceId (durable persistence hook). */
  onDeviceIdChanged?: (newDeviceId: string, oldDeviceId: string) => void | Promise<void>
}

export class YjsPersonalLogSyncAdapter {
  private readonly doc: Y.Doc
  private readonly messaging: MessagingAdapter
  private readonly identity: IdentitySession
  private readonly personalKey: Uint8Array
  private readonly docId: string
  private readonly crypto: ProtocolCryptoAdapter
  private readonly coordinator: LogSyncCoordinator
  private unsubDocUpdate: (() => void) | null = null
  private unsubMessage: (() => void) | null = null
  private unsubStateChange: (() => void) | null = null
  private started = false

  constructor(config: YjsPersonalLogSyncConfig) {
    this.doc = config.doc
    this.messaging = config.messaging
    this.identity = config.identity
    this.personalKey = config.personalKey
    this.docId = config.docId
    this.crypto = config.crypto ?? new WebCryptoProtocolCryptoAdapter()

    this.coordinator = new LogSyncCoordinator({
      docId: this.docId,
      deviceId: config.deviceId,
      ownDid: this.identity.getDid(),
      authorKid: `${this.identity.getDid()}#sig-0`,
      crypto: this.crypto,
      logStore: config.docLogStore,
      control: {
        sendControlFrame: (frame) => this.messaging.sendControlFrame!(frame),
      },
      envelopes: {
        send: (envelope) => this.messaging.send(envelope as WireMessage),
      },
      capabilities: this.personalCapabilitySource(),
      hooks: this.yjsEngineHooks(),
      signLogEntry: (input) => this.identity.signEd25519(input),
      // Personal-Doc is single-owner multi-device: recipients = just own DID.
      getRecipients: () => [this.identity.getDid()],
      // generation 0 permanent; the content key never rotates.
      getContentKey: async () => ({ key: this.personalKey, generation: PERSONAL_DOC_GENERATION }),
      getContentKeyByGeneration: async (generation) =>
        generation === PERSONAL_DOC_GENERATION ? this.personalKey : null,
      getAvailableKeyGenerations: async () => [PERSONAL_DOC_GENERATION],
      // NO space-register for a Personal-Doc (sendSpaceRegister omitted).
      // VE-4/VE-5 restore-clone with FULL strictness (generation never resets, so
      // nonce-uniqueness rests solely on the per-deviceId seq monotonicity).
      onWriteRejected: createRestoreCloneHandler({
        identity: this.identity,
        messaging: this.messaging,
        mintDeviceId: config.mintDeviceId,
        onDeviceIdChanged: (_docId, newDeviceId, oldDeviceId) =>
          config.onDeviceIdChanged?.(newDeviceId, oldDeviceId),
      }),
      // VE-6 (MUSS, identical strictness to Spaces): after a restore-clone
      // re-binds the deviceId, re-write the FULL Personal-Doc state as a fresh
      // log entry under the new deviceId (seq=0). Without this, restoreClone()
      // would fall back to resendPending() — re-sending the OLD colliding
      // (oldDeviceId,seq) entry, which a PERSISTENT collision (the real restore
      // case) already rejects → the edit would never reach the other device.
      // Mirrors writeFullStateViaLog in the Space path.
      onAfterRestoreClone: () => this.writeFullStateViaLog(),
    })
  }

  /**
   * VE-6 restore-clone re-write: publish the full Personal-Doc state as one log
   * entry under the (freshly re-bound) deviceId, so the second device converges
   * after a real (persistent) seq-collision restore. Generation stays 0.
   */
  private async writeFullStateViaLog(): Promise<void> {
    const fullState = Y.encodeStateAsUpdate(this.doc)
    if (fullState.length <= 2) return // empty Y.Doc update — nothing to republish
    await this.coordinator.writeLocalUpdate(fullState).catch((err) => {
      if (err instanceof AuthorMismatchError) {
        console.error('[YjsPersonalLogSync] AUTHOR_MISMATCH during restore-clone re-write:', err.message)
        return
      }
      console.debug('[YjsPersonalLogSync] restore-clone re-write failed (retry on reconnect):', err)
    })
  }

  /** The underlying coordinator (test/inspection + manual catch-up). */
  getCoordinator(): LogSyncCoordinator {
    return this.coordinator
  }

  /** The active local deviceId (re-bound by a restore-clone). */
  getDeviceId(): string {
    return this.coordinator.getDeviceId()
  }

  start(): void {
    if (this.started) return
    this.started = true

    // First publication + catch-up: present-capability → sync-request head-abgleich
    // (VE-2/VE-4) BEFORE the first local write reserves seq. Fire-and-forget; a
    // hard AUTHOR_MISMATCH is surfaced to audit, transient errors retry on reconnect.
    void this.coordinator
      .catchUp()
      .catch((err) => this.reportPublishError('initial catch-up', err))

    // LOOP-GUARD: write a log entry ONLY for LOCAL changes.
    const updateHandler = (update: Uint8Array, origin: unknown) => {
      if (origin === 'remote') return
      void this.coordinator.writeLocalUpdate(update).catch((err) => {
        if (err instanceof AuthorMismatchError) {
          console.error('[YjsPersonalLogSync] AUTHOR_MISMATCH on personal-doc write — hard stop:', err.message)
          return
        }
        console.debug('[YjsPersonalLogSync] personal-doc log write failed (retry on reconnect):', err)
      })
    }
    this.doc.on('update', updateHandler)
    this.unsubDocUpdate = () => this.doc.off('update', updateHandler)

    // Read path: route log-path messages (log-entry/1.0, sync-response/1.0) AND the
    // routed write-path error frames to the coordinator. Personal-doc messages are
    // own-DID-addressed (multi-device), so any log-path message for THIS docId is
    // ours; the coordinator re-verifies + filters by docId internally.
    this.unsubMessage = this.messaging.onMessage(async (message) => {
      if (this.isLogPathMessage(message) || this.isErrorFrame(message)) {
        await this.coordinator.handleIncoming(message)
      }
    })

    // Re-sync on reconnect: a new socket = empty scope cache → re-present + catch-up.
    this.unsubStateChange = this.messaging.onStateChange((state) => {
      if (state === 'connected' && this.started) {
        this.coordinator.resetForReconnect()
        void this.coordinator
          .catchUp()
          .then(() => this.coordinator.resendPending())
          .catch((err) => this.reportPublishError('reconnect catch-up', err))
      }
    })
  }

  destroy(): void {
    this.unsubDocUpdate?.()
    this.unsubDocUpdate = null
    this.unsubMessage?.()
    this.unsubMessage = null
    this.unsubStateChange?.()
    this.unsubStateChange = null
    this.started = false
  }

  /**
   * Self-issued Personal-Doc capability (Sync 003 `#persönliche-dokumente`): kid =
   * `<did>#sig-0`, audience = own DID, generation 0. Signed via the operation-shaped
   * Identity Key (no raw seed) — spaceCapabilitySigningKey is NEVER the author kid
   * here; the Identity Key self-issues ONLY for the Personal-Doc.
   */
  private personalCapabilitySource(): CapabilitySource {
    return {
      getCapabilityJws: async () => {
        const did = this.identity.getDid()
        const nowMs = Date.now()
        const validityMs = 6 * 30 * 24 * 60 * 60 * 1000
        return createPersonalDocCapabilityJwsWithSigner({
          payload: {
            type: 'capability',
            spaceId: this.docId,
            audience: did,
            permissions: ['read', 'write'],
            generation: PERSONAL_DOC_GENERATION,
            issuedAt: new Date(nowMs).toISOString(),
            validUntil: new Date(nowMs + validityMs).toISOString(),
          },
          kid: `${did}#sig-0`,
          sign: (input) => this.identity.signEd25519(input),
        })
      },
    }
  }

  /** Yjs engine hooks: encode = identity; applyRemote = applyUpdate(origin='remote'). */
  private yjsEngineHooks(): LogSyncEngineHooks {
    return {
      engine: 'yjs',
      encodeUpdate: (update) => update,
      applyRemoteUpdate: (plaintext) => {
        // LOOP-GUARD: origin='remote' suppresses the local update observer above,
        // so this apply never re-enters the write path / re-broadcasts.
        Y.applyUpdate(this.doc, plaintext, 'remote')
      },
    }
  }

  private isLogPathMessage(message: WireMessage): boolean {
    const type = (message as { type?: unknown }).type
    return type === LOG_ENTRY_MESSAGE_TYPE || type === SYNC_RESPONSE_MESSAGE_TYPE
  }

  private isErrorFrame(message: WireMessage): boolean {
    return (message as { type?: unknown }).type === 'error'
  }

  private reportPublishError(phase: string, err: unknown): void {
    if (err instanceof AuthorMismatchError) {
      console.error(`[YjsPersonalLogSync] AUTHOR_MISMATCH during ${phase}:`, err.message)
      return
    }
    console.debug(`[YjsPersonalLogSync] ${phase} deferred (retry on reconnect):`, err)
  }
}
