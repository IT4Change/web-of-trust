import { createContext, useContext, useState, type ReactNode } from 'react'
import { WotIdentity } from '@real-life/wot-core'

interface WotIdentityContextValue {
  identity: WotIdentity | null
  did: string | null
  setIdentity: (identity: WotIdentity, did: string) => void
  clearIdentity: () => void
}

const WotIdentityContext = createContext<WotIdentityContextValue | null>(null)

export function WotIdentityProvider({ children }: { children: ReactNode }) {
  const [identity, setIdentityState] = useState<WotIdentity | null>(null)
  const [did, setDid] = useState<string | null>(null)

  const setIdentity = (newIdentity: WotIdentity, newDid: string) => {
    setIdentityState(newIdentity)
    setDid(newDid)
  }

  const clearIdentity = () => {
    setIdentityState(null)
    setDid(null)
  }

  return (
    <WotIdentityContext.Provider
      value={{
        identity,
        did,
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
