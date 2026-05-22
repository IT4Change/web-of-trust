import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

function readRepoFile(file: string): string {
  const actualPath = fs.existsSync(file) ? file : path.join('..', '..', file)
  return fs.readFileSync(actualPath, 'utf8')
}

describe('Identity Trust 002 verification-attestation source guard', () => {
  it('renders local verifications from received verification-attestations with holder-controlled publish metadata', () => {
    const text = readRepoFile('apps/demo/src/pages/Identity.tsx')

    expect(text).not.toContain('watchReceivedVerifications')
    expect(text).not.toContain('v.timestamp')

    expect(text).toContain('isVerificationAttestation')
    expect(text).toContain('getAttestationMetadata')
    expect(text).toContain('setAttestationAccepted')
  })

  it('publishes accepted received attestations without legacy verification publication', () => {
    const text = readRepoFile('apps/demo/src/hooks/useProfileSync.ts')

    expect(text).not.toContain('getReceivedVerifications')
    expect(text).not.toContain('publishVerifications')
    expect(text).not.toContain('watchReceivedVerifications')

    expect(text).toContain('getReceivedAttestations')
    expect(text).toContain('getAttestationMetadata')
    expect(text).toContain('publishAttestations')
  })
})
