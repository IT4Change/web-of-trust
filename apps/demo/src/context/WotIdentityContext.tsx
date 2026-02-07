import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { WotIdentity } from '@real-life/wot-core'

interface WotIdentityContextValue {
  identity: WotIdentity | null
  did: string | null
  hasStoredIdentity: boolean | null // null = loading, true/false = checked
  setIdentity: (identity: WotIdentity, did: string) => void
  clearIdentity: () => void
}

const WotIdentityContext = createContext<WotIdentityContextValue | null>(null)

export function WotIdentityProvider({ children }: { children: ReactNode }) {
  const [identity, setIdentityState] = useState<WotIdentity | null>(null)
  const [did, setDid] = useState<string | null>(null)
  const [hasStoredIdentity, setHasStoredIdentity] = useState<boolean | null>(null)

  // Check on mount if there's a stored identity in IndexedDB
  useEffect(() => {
    const checkStoredIdentity = async () => {
      try {
        const tempIdentity = new WotIdentity()
        const hasStored = await tempIdentity.hasStoredIdentity()
        setHasStoredIdentity(hasStored)
      } catch (error) {
        console.error('Error checking stored identity:', error)
        setHasStoredIdentity(false)
      }
    }

    checkStoredIdentity()
  }, [])

  const setIdentity = (newIdentity: WotIdentity, newDid: string) => {
    setIdentityState(newIdentity)
    setDid(newDid)
    setHasStoredIdentity(true)
  }

  const clearIdentity = () => {
    setIdentityState(null)
    setDid(null)
    setHasStoredIdentity(false)
  }

  return (
    <WotIdentityContext.Provider
      value={{
        identity,
        did,
        hasStoredIdentity,
        setIdentity,
        clearIdentity,
      }}
    >
      {children}
    </WotIdentityContext.Provider>
  )
}

export function useWotIdentity(): WotIdentityContextValue {
  const context = useContext(WotIdentityContext)
  if (!context) {
    throw new Error('useWotIdentity must be used within a WotIdentityProvider')
  }
  return context
}
