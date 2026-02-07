import { useSyncExternalStore } from 'react'
import type { Subscribable } from '@real-life/wot-core'

export function useSubscribable<T>(subscribable: Subscribable<T>): T {
  return useSyncExternalStore(
    subscribable.subscribe,
    subscribable.getValue
  )
}
