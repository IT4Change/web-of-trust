import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import {
  WebCryptoAdapter,
  NoOpSyncAdapter,
  type StorageAdapter,
  type ReactiveStorageAdapter,
  type CryptoAdapter,
  type SyncAdapter,
  type WotIdentity,
} from '@real-life/wot-core'
import {
  ContactService,
  VerificationService,
  AttestationService,
} from '../services'
import { EvoluStorageAdapter } from '../adapters/EvoluStorageAdapter'
import { createWotEvolu, isEvoluInitialized, getEvolu } from '../db'

interface AdapterContextValue {
  storage: StorageAdapter
  reactiveStorage: ReactiveStorageAdapter
  crypto: CryptoAdapter
  sync: SyncAdapter
  contactService: ContactService
  verificationService: VerificationService
  attestationService: AttestationService
  isInitialized: boolean
}

const AdapterContext = createContext<AdapterContextValue | null>(null)

interface AdapterProviderProps {
  children: ReactNode
  identity: WotIdentity
}

/**
 * AdapterProvider initializes Evolu with WotIdentity-derived custom keys.
 * The identity must be unlocked before this provider is rendered.
 */
export function AdapterProvider({ children, identity }: AdapterProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false)
  const [adapters, setAdapters] = useState<Omit<AdapterContextValue, 'isInitialized'> | null>(null)

  useEffect(() => {
    let cancelled = false

    async function initEvolu() {
      try {
        const evolu = isEvoluInitialized()
          ? getEvolu()
          : await createWotEvolu(identity)

        const storage = new EvoluStorageAdapter(evolu)
        const crypto = new WebCryptoAdapter()
        const sync = new NoOpSyncAdapter()

        if (!cancelled) {
          setAdapters({
            storage,
            reactiveStorage: storage,
            crypto,
            sync,
            contactService: new ContactService(storage),
            verificationService: new VerificationService(storage),
            attestationService: new AttestationService(storage, crypto),
          })
          setIsInitialized(true)
        }
      } catch (error) {
        console.error('Failed to initialize Evolu:', error)
      }
    }

    initEvolu()
    return () => { cancelled = true }
  }, [identity])

  if (!isInitialized || !adapters) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-500">Initialisiere Evolu...</div>
      </div>
    )
  }

  return (
    <AdapterContext.Provider value={{ ...adapters, isInitialized }}>
      {children}
    </AdapterContext.Provider>
  )
}

export function useAdapters(): AdapterContextValue {
  const context = useContext(AdapterContext)
  if (!context) {
    throw new Error('useAdapters must be used within an AdapterProvider')
  }
  return context
}
