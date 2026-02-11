import type { Verification } from '@real-life/wot-core'

export interface VerificationResponsePayload {
  action: 'response'
  responseCode: string
}

export interface VerificationCompletePayload {
  action: 'complete'
  verification: Verification
}

export type VerificationPayload =
  | VerificationResponsePayload
  | VerificationCompletePayload
