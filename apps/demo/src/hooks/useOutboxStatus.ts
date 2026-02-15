import { useState, useEffect } from 'react'
import { useAdapters } from '../context'

/**
 * Hook that tracks pending outbox message count.
 * Returns the number of unsent messages waiting in the outbox.
 */
export function useOutboxStatus() {
  const { outboxStore } = useAdapters()
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    const subscribable = outboxStore.watchPendingCount()
    setPendingCount(subscribable.getValue())

    const unsub = subscribable.subscribe((count) => {
      setPendingCount(count)
    })

    return unsub
  }, [outboxStore])

  return { pendingCount, hasPendingMessages: pendingCount > 0 }
}
