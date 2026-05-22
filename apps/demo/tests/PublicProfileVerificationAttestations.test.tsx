import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

function readRepoFile(file: string): string {
  const actualPath = fs.existsSync(file) ? file : path.join('..', '..', file)
  return fs.readFileSync(actualPath, 'utf8')
}

describe('PublicProfile Trust 002 verification-attestation source guard', () => {
  it('renders public verification state from public attestations, not legacy verification documents', () => {
    const text = readRepoFile('apps/demo/src/pages/PublicProfile.tsx')

    expect(text).not.toContain('import type { PublicProfile as PublicProfileType, Verification')
    expect(text).not.toContain('resolveVerifications')
    expect(text).not.toContain('watchReceivedVerifications')
    expect(text).not.toContain('Verification[]')
    expect(text).not.toContain('v.timestamp')

    expect(text).toContain('resolveAttestations')
    expect(text).toContain('isVerificationAttestation')
    expect(text).toContain('getVerificationStatus')
  })
})
