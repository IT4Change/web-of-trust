import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { AdapterProvider, IdentityProvider, useIdentity, PendingVerificationProvider, usePendingVerification } from './context'
import { AppShell, IdentityManagement, Confetti } from './components'
import { Home, Identity, Contacts, Verify, Attestations, PublicProfile } from './pages'
import { useProfileSync, useMessaging, useContacts } from './hooks'
import type { VerificationPayload } from './types/verification-messages'

/**
 * Mounts useProfileSync globally so profile-update listeners
 * and initial contact sync run on every page, not just /identity.
 */
function ProfileSyncEffect() {
  useProfileSync()
  return null
}

/**
 * Global listener for incoming verification messages.
 * - response: If Alice leaves /verify and Bob responds, stores pending and navigates back.
 * - complete: Bob receives Alice's completion → triggers global confetti.
 */
function VerificationListenerEffect() {
  const { onMessage } = useMessaging()
  const { challengeNonce, setPending, triggerConfetti } = usePendingVerification()
  const { activeContacts } = useContacts()
  const navigate = useNavigate()

  useEffect(() => {
    const unsubscribe = onMessage((envelope) => {
      if (envelope.type !== 'verification') return

      let payload: VerificationPayload
      try {
        payload = JSON.parse(envelope.payload)
      } catch {
        return
      }

      if (payload.action === 'response' && challengeNonce) {
        const decoded = JSON.parse(atob(payload.responseCode))
        if (decoded.nonce !== challengeNonce) return

        // Only show confirm screen if peer is not already a verified contact
        const alreadyContact = activeContacts.some(c => c.did === decoded.toDid)
        if (alreadyContact) return

        setPending({ responseCode: payload.responseCode, decoded })
        navigate('/verify')
      }
    })
    return unsubscribe
  }, [onMessage, challengeNonce, setPending, navigate, activeContacts, triggerConfetti])

  return null
}

/**
 * Renders global confetti overlay when triggerConfetti() is called.
 */
function GlobalConfetti() {
  const { confettiKey } = usePendingVerification()
  if (confettiKey === 0) return null
  return <Confetti key={confettiKey} />
}

/**
 * RequireIdentity gate - shows onboarding if no unlocked identity.
 * Once identity is unlocked, it renders AdapterProvider (which inits Evolu)
 * and then the rest of the app.
 */
function RequireIdentity({ children }: { children: React.ReactNode }) {
  const { identity, did, hasStoredIdentity, setIdentity } = useIdentity()

  // Still checking if identity exists in storage
  if (hasStoredIdentity === null) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-600">Lade...</p>
        </div>
      </div>
    )
  }

  // Identity not unlocked yet (but might be stored)
  if (!identity || !did) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <IdentityManagement
          onComplete={(newIdentity, newDid) => {
            setIdentity(newIdentity, newDid)
          }}
        />
      </div>
    )
  }

  // Identity is unlocked -> initialize Evolu with identity-derived keys
  return (
    <AdapterProvider identity={identity}>
      <PendingVerificationProvider>
        <ProfileSyncEffect />
        <VerificationListenerEffect />
        <GlobalConfetti />
        {children}
      </PendingVerificationProvider>
    </AdapterProvider>
  )
}

function AppRoutes() {
  return (
    <RequireIdentity>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Home />} />
          <Route path="/identity" element={<Identity />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/attestations/*" element={<Attestations />} />
          <Route path="/profile/:did" element={<PublicProfile />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </RequireIdentity>
  )
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <IdentityProvider>
        <AppRoutes />
      </IdentityProvider>
    </BrowserRouter>
  )
}
