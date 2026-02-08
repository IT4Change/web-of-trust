import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { WotIdentity } from '@real-life/wot-core'

interface IdentityContextValue {
  identity: WotIdentity | null
  did: string | null
  hasStoredIdentity: boolean | null // null = loading, true/false = checked
  setIdentity: (identity: WotIdentity, did: string) => void
  clearIdentity: () => void
}

const IdentityContext = createContext<IdentityContextValue | null>(null)

export function IdentityProvider({ children }: { children: ReactNode }) {
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
    <IdentityContext.Provider
      value={{
        identity,
        did,
        hasStoredIdentity,
        setIdentity,
        clearIdentity,
      }}
    >
      {children}
    </IdentityContext.Provider>
  )
}

export function useIdentity(): IdentityContextValue {
  const context = useContext(IdentityContext)
  if (!context) {
    throw new Error('useIdentity must be used within an IdentityProvider')
  }
  return context
}
