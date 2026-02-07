/**
 * Framework-agnostic reactive primitive.
 * Maps directly to React's useSyncExternalStore.
 *
 * Implementors must:
 * - Call all subscribers when value changes
 * - Return the current value synchronously via getValue()
 * - Return an unsubscribe function from subscribe()
 */
export interface Subscribable<T> {
  subscribe(callback: (value: T) => void): () => void
  getValue(): T
}
