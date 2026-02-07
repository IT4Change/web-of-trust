import { useCallback, useMemo } from 'react'
import { useAdapters } from '../context'
import { useIdentity } from './useIdentity'
import { useSubscribable } from './useSubscribable'
import type { Attestation } from '@real-life/wot-core'

export function useAttestations() {
  const { attestationService, reactiveStorage } = useAdapters()
  const { identity, keyPair } = useIdentity()

  const attestationsSubscribable = useMemo(() => reactiveStorage.watchReceivedAttestations(), [reactiveStorage])
  const attestations = useSubscribable(attestationsSubscribable)

  const createAttestation = useCallback(
    async (toDid: string, claim: string, tags?: string[]) => {
      if (!identity || !keyPair) {
        throw new Error('No identity found')
      }
      return attestationService.createAttestation(
        identity.did,
        toDid,
        claim,
        keyPair,
        tags
      )
    },
    [identity, keyPair, attestationService]
  )

  const verifyAttestation = useCallback(
    async (attestation: Attestation) => {
      return attestationService.verifyAttestation(attestation)
    },
    [attestationService]
  )

  const importAttestation = useCallback(
    async (encoded: string) => {
      return attestationService.importAttestation(encoded)
    },
    [attestationService]
  )

  const setAttestationAccepted = useCallback(
    async (attestationId: string, accepted: boolean) => {
      await attestationService.setAttestationAccepted(attestationId, accepted)
    },
    [attestationService]
  )

  const myAttestations = useMemo(
    () => identity ? attestations.filter(a => a.from === identity.did) : [],
    [attestations, identity]
  )

  const receivedAttestations = useMemo(
    () => identity ? attestations.filter(a => a.to === identity.did) : [],
    [attestations, identity]
  )

  return {
    attestations,
    myAttestations,
    receivedAttestations,
    isLoading: false,
    error: null,
    createAttestation,
    importAttestation,
    verifyAttestation,
    setAttestationAccepted,
    refresh: () => {},
  }
}
