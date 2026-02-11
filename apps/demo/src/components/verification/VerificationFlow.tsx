import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, ArrowLeft, Loader2, Wifi, WifiOff, User, ShieldCheck, ShieldX } from 'lucide-react'
import { useVerification, useProfileSync } from '../../hooks'
import type { PublicProfile } from '@real-life/wot-core'
import { Avatar } from '../shared/Avatar'
import { ShowCode } from './ShowCode'
import { ScanCode } from './ScanCode'

type Mode = 'select' | 'initiate' | 'confirm' | 'respond' | 'waiting' | 'success' | 'error'

export function VerificationFlow() {
  const {
    step,
    challenge,
    response,
    error,
    peerName,
    peerDid,
    isConnected,
    createChallenge,
    prepareResponse,
    confirmAndRespond,
    confirmAndComplete,
    completeVerification,
    reset,
  } = useVerification()
  const { fetchContactProfile } = useProfileSync()

  const [mode, setMode] = useState<Mode>('select')
  const [challengeCode, setChallengeCode] = useState('')
  const [responseCode, setResponseCode] = useState('')
  const [peerProfile, setPeerProfile] = useState<PublicProfile | null>(null)

  // Fetch peer profile from Profile Service when entering confirm mode
  useEffect(() => {
    if (mode === 'confirm' && peerDid) {
      setPeerProfile(null)
      fetchContactProfile(peerDid).then((profile) => {
        if (profile) setPeerProfile(profile)
      })
    }
  }, [mode, peerDid, fetchContactProfile])

  // Auto-transition: hook step changes drive mode transitions
  useEffect(() => {
    if (step === 'done' && (mode === 'initiate' || mode === 'waiting' || mode === 'confirm')) {
      setMode('success')
    }
    // Alice: relay received Bob's response → show confirm screen
    // mode 'initiate' = Alice was on the page; mode 'select' = Alice navigated back via global listener
    if (step === 'confirm-complete' && (mode === 'initiate' || mode === 'select')) {
      setMode('confirm')
    }
  }, [step, mode])

  const handleInitiate = async () => {
    try {
      const code = await createChallenge()
      setChallengeCode(code)
      setMode('initiate')
    } catch {
      setMode('error')
    }
  }

  // Bob scans code → decode and show Alice's profile for confirmation
  const handleScanCode = async (code: string) => {
    try {
      await prepareResponse(code)
      setMode('confirm')
    } catch {
      setMode('error')
    }
  }

  // Both sides: user confirms → proceed with crypto
  const handleConfirm = async () => {
    try {
      if (step === 'confirm-respond') {
        // Bob confirms Alice → create response + send
        const respCode = await confirmAndRespond()
        setResponseCode(respCode)
        if (isConnected) {
          setMode('waiting')
        } else {
          setMode('success')
        }
      } else if (step === 'confirm-complete') {
        // Alice confirms Bob → complete verification
        await confirmAndComplete()
        setMode('success')
      }
    } catch {
      setMode('error')
    }
  }

  const handleComplete = async (code: string) => {
    try {
      await completeVerification(code)
      setMode('success')
    } catch {
      setMode('error')
    }
  }

  const handleReset = () => {
    reset()
    setMode('select')
    setChallengeCode('')
    setResponseCode('')
    setPeerProfile(null)
  }

  if (mode === 'select') {
    return (
      <div className="space-y-4">
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-slate-900 mb-2">Kontakt verifizieren</h2>
          <p className="text-slate-600">
            Verifiziere einen Kontakt durch persönliches Treffen.
          </p>
        </div>

        <button
          onClick={handleInitiate}
          className="w-full p-4 border-2 border-primary-200 rounded-xl hover:border-primary-400 hover:bg-primary-50 transition-colors text-left"
        >
          <h3 className="font-medium text-slate-900 mb-1">Verifizierung starten</h3>
          <p className="text-sm text-slate-600">
            Zeige deinen Code der anderen Person
          </p>
        </button>

        <button
          onClick={() => setMode('respond')}
          className="w-full p-4 border-2 border-slate-200 rounded-xl hover:border-slate-300 hover:bg-slate-50 transition-colors text-left"
        >
          <h3 className="font-medium text-slate-900 mb-1">Code eingeben</h3>
          <p className="text-sm text-slate-600">
            Gib den Code ein, den dir jemand zeigt
          </p>
        </button>
      </div>
    )
  }

  if (mode === 'initiate') {
    return (
      <div className="space-y-6">
        <button
          onClick={handleReset}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={18} />
          Zurück
        </button>

        <ShowCode
          code={challengeCode}
          title="Dein Verifizierungs-Code"
          description="Die andere Person scannt diesen Code."
          onRefresh={handleInitiate}
        />

        {/* Relay status */}
        <div className="flex items-center gap-2 text-sm">
          {isConnected ? (
            <>
              <Wifi size={14} className="text-green-500" />
              <span className="text-green-600">Relay verbunden — Antwort wird automatisch empfangen</span>
            </>
          ) : (
            <>
              <WifiOff size={14} className="text-amber-500" />
              <span className="text-amber-600">Relay nicht verbunden</span>
            </>
          )}
        </div>

        {/* Waiting indicator when relay is connected */}
        {isConnected && step === 'initiating' && (
          <div className="flex items-center justify-center gap-3 py-4 text-slate-600">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Warte auf Antwort...</span>
          </div>
        )}

        {step === 'completing' && (
          <div className="flex items-center justify-center gap-3 py-4 text-slate-600">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Verifizierung wird abgeschlossen...</span>
          </div>
        )}

        {/* Fallback: manual response entry (only if relay not connected) */}
        {!isConnected && (
          <div className="border-t border-slate-200 pt-6">
            <ScanCode
              title="Antwort-Code eingeben"
              description="Gib den Code ein, den du von der anderen Person erhältst."
              placeholder="Antwort-Code hier einfügen..."
              buttonText="Verifizierung abschließen"
              onSubmit={handleComplete}
              isLoading={step === 'completing'}
            />
          </div>
        )}
      </div>
    )
  }

  if (mode === 'respond') {
    return (
      <div className="space-y-6">
        <button
          onClick={handleReset}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={18} />
          Zurück
        </button>

        <ScanCode
          title="Code eingeben"
          description="Gib den Code ein, den dir die andere Person zeigt."
          placeholder="Code hier einfügen..."
          buttonText="Code prüfen"
          onSubmit={handleScanCode}
        />
      </div>
    )
  }

  if (mode === 'confirm') {
    return (
      <div className="space-y-6">
        <button
          onClick={handleReset}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={18} />
          Abbrechen
        </button>

        <div className="text-center space-y-4">
          <h3 className="text-lg font-bold text-slate-900">
            Stehst du vor dieser Person?
          </h3>

          <div className="flex flex-col items-center gap-3 py-4">
            <Avatar
              name={peerProfile?.name || peerName || undefined}
              avatar={peerProfile?.avatar}
              size="lg"
            />
            <div>
              <p className="text-xl font-semibold text-slate-900">
                {peerProfile?.name || peerName || 'Unbekannt'}
              </p>
              {peerProfile?.bio && (
                <p className="text-sm text-slate-500 mt-1">
                  {peerProfile.bio}
                </p>
              )}
              {peerDid && (
                <p className="text-xs text-slate-400 font-mono mt-1 max-w-[280px] truncate">
                  {peerDid}
                </p>
              )}
            </div>
          </div>

          <p className="text-sm text-slate-600">
            Bestätige nur, wenn du diese Person persönlich kennst und sie dir gegenüber steht.
          </p>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleReset}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-red-200 text-red-600 font-medium rounded-xl hover:bg-red-50 transition-colors"
            >
              <ShieldX size={18} />
              Abbrechen
            </button>
            <button
              onClick={handleConfirm}
              disabled={step === 'responding' || step === 'completing'}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {step === 'responding' || step === 'completing' ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <ShieldCheck size={18} />
              )}
              Bestätigen
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (mode === 'waiting') {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto animate-pulse">
          <User className="w-8 h-8 text-primary-600" />
        </div>
        <h3 className="text-xl font-bold text-slate-900">
          Warte auf Bestätigung
        </h3>
        <p className="text-slate-600">
          {peerName ? `${peerName} bestätigt die Verifizierung...` : 'Bestätigung läuft...'}
        </p>
        <div className="flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
        </div>

        {/* Fallback: show response code if relay doesn't deliver */}
        {responseCode && (
          <details className="mt-6 text-left">
            <summary className="cursor-pointer text-xs text-slate-400 text-center">
              Falls die automatische Bestätigung nicht klappt...
            </summary>
            <div className="mt-4">
              <ShowCode
                code={responseCode}
                title="Antwort-Code"
                description="Zeige diesen Code der anderen Person, damit sie die Verifizierung abschließen kann."
              />
            </div>
          </details>
        )}
      </div>
    )
  }

  if (mode === 'success') {
    return (
      <div className="text-center py-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Verifizierung erfolgreich!</h3>
          <p className="text-slate-600 mb-6">
            {peerName
              ? `${peerName} wurde verifiziert.`
              : challenge?.fromName
              ? `${challenge.fromName} wurde verifiziert.`
              : response?.toName
              ? `${response.toName} wurde verifiziert.`
              : 'Der Kontakt wurde verifiziert.'}
          </p>

          {/* Fallback: show response code if relay was offline (Bob needs to show it to Alice) */}
          {responseCode && !isConnected && (
            <div className="mb-6">
              <ShowCode
                code={responseCode}
                title="Antwort-Code"
                description="Zeige diesen Code der anderen Person, damit sie die Verifizierung abschließen kann."
              />
            </div>
          )}

          <button
            onClick={handleReset}
            className="px-6 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            Weitere Verifizierung
          </button>
        </div>
    )
  }

  if (mode === 'error') {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <XCircle className="w-8 h-8 text-red-600" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">Fehler</h3>
        <p className="text-slate-600 mb-6">
          {error?.message || 'Die Verifizierung ist fehlgeschlagen.'}
        </p>
        <button
          onClick={handleReset}
          className="px-6 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
        >
          Erneut versuchen
        </button>
      </div>
    )
  }

  return null
}
