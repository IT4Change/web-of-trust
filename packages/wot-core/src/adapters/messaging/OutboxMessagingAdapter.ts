import type { MessagingAdapter } from '../interfaces/MessagingAdapter'
import type { OutboxStore } from '../interfaces/OutboxStore'
import type {
  MessageEnvelope,
  DeliveryReceipt,
  MessagingState,
  MessageType,
} from '../../types/messaging'

/**
 * Offline-first wrapper for any MessagingAdapter.
 *
 * Decorator pattern (like OfflineFirstDiscoveryAdapter):
 * - Wraps an inner MessagingAdapter
 * - Persists unsent messages in an OutboxStore
 * - Retries on reconnect via flushOutbox()
 * - send() never throws for queued message types
 *
 * Usage:
 *   const ws = new WebSocketMessagingAdapter(url)
 *   const outboxStore = new EvoluOutboxStore(evolu)
 *   const messaging = new OutboxMessagingAdapter(ws, outboxStore)
 */
export class OutboxMessagingAdapter implements MessagingAdapter {
  private flushing = false
  private skipTypes: Set<MessageType>
  private sendTimeoutMs: number

  constructor(
    private inner: MessagingAdapter,
    private outbox: OutboxStore,
    options?: {
      skipTypes?: MessageType[]
      sendTimeoutMs?: number
    },
  ) {
    this.skipTypes = new Set(options?.skipTypes ?? ['profile-update'])
    this.sendTimeoutMs = options?.sendTimeoutMs ?? 15_000
  }

  // --- Connection lifecycle: delegate to inner ---

  async connect(myDid: string): Promise<void> {
    await this.inner.connect(myDid)
    // Fire-and-forget flush after successful connect
    this.flushOutbox()
  }

  async disconnect(): Promise<void> {
    return this.inner.disconnect()
  }

  getState(): MessagingState {
    return this.inner.getState()
  }

  // --- Send with outbox ---

  async send(envelope: MessageEnvelope): Promise<DeliveryReceipt> {
    // Skip outbox for non-critical types (fire-and-forget)
    if (this.skipTypes.has(envelope.type)) {
      return this.inner.send(envelope)
    }

    // If not connected, queue immediately
    if (this.inner.getState() !== 'connected') {
      await this.outbox.enqueue(envelope)
      return {
        messageId: envelope.id,
        status: 'accepted',
        timestamp: new Date().toISOString(),
        reason: 'queued-in-outbox',
      }
    }

    // Connected — try to send with timeout
    try {
      return await this.sendWithTimeout(envelope)
    } catch {
      // Send failed — queue for retry
      await this.outbox.enqueue(envelope)
      return {
        messageId: envelope.id,
        status: 'accepted',
        timestamp: new Date().toISOString(),
        reason: 'queued-in-outbox',
      }
    }
  }

  // --- Receiving: delegate to inner ---

  onMessage(callback: (envelope: MessageEnvelope) => void): () => void {
    return this.inner.onMessage(callback)
  }

  onReceipt(callback: (receipt: DeliveryReceipt) => void): () => void {
    return this.inner.onReceipt(callback)
  }

  // --- Transport: delegate to inner ---

  async registerTransport(did: string, transportAddress: string): Promise<void> {
    return this.inner.registerTransport(did, transportAddress)
  }

  async resolveTransport(did: string): Promise<string | null> {
    return this.inner.resolveTransport(did)
  }

  // --- State change: delegate to inner (WebSocketMessagingAdapter-specific) ---

  onStateChange(callback: (state: MessagingState) => void): () => void {
    if ('onStateChange' in this.inner && typeof (this.inner as any).onStateChange === 'function') {
      return (this.inner as any).onStateChange(callback)
    }
    return () => {}
  }

  // --- Outbox flush ---

  /**
   * Retry all pending outbox messages.
   * Called automatically on connect(). Can also be called manually.
   * FIFO order. Individual failures don't abort the flush.
   */
  async flushOutbox(): Promise<void> {
    if (this.flushing) return
    this.flushing = true

    try {
      const pending = await this.outbox.getPending()
      for (const entry of pending) {
        if (this.inner.getState() !== 'connected') break

        try {
          await this.sendWithTimeout(entry.envelope)
          await this.outbox.dequeue(entry.envelope.id)
        } catch {
          await this.outbox.incrementRetry(entry.envelope.id)
        }
      }
    } finally {
      this.flushing = false
    }
  }

  /** Expose outbox store for UI (pending count badge). */
  getOutboxStore(): OutboxStore {
    return this.outbox
  }

  // --- Private ---

  private sendWithTimeout(envelope: MessageEnvelope): Promise<DeliveryReceipt> {
    if (this.sendTimeoutMs <= 0) {
      return this.inner.send(envelope)
    }

    return new Promise<DeliveryReceipt>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Send timeout after ${this.sendTimeoutMs}ms`))
      }, this.sendTimeoutMs)

      this.inner.send(envelope).then(
        (receipt) => { clearTimeout(timer); resolve(receipt) },
        (error) => { clearTimeout(timer); reject(error) },
      )
    })
  }
}
