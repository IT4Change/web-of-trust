import { describe, expect, it } from 'vitest'
import { controlFrameDocId } from '../src/protocol/sync/control-frame-doc-id'
import {
  createAdminAddMessage,
  createAdminRemoveMessage,
  createSpaceRegisterMessage,
  createSpaceRotateMessage,
} from '../src/protocol/sync/broker-admin-messages'
import type { ControlFrame } from '../src/protocol/sync/control-frame-transport'

// `controlFrameDocId` is the correlation gate of `sendControlFrame`: a frame type
// missing from its catalog is thrown away CLIENT-SIDE before anything reaches the
// wire. That is exactly how the admin-remove of every self-leave died in the field
// (2026-08-17): the workflow's pauschal catch dressed the throw up as "space-rotate
// not confirmed", the network tab stayed empty, and the leave retried forever.
// The catalog must therefore cover every admin-signed frame the client can send.

const SEED = new Uint8Array(32).fill(7)
const SPACE = '99999999-9999-4999-8999-999999999999'
const KID = 'did:key:z6MkfujcrCFmQfvXJsRc4jTRZAGWrM2q37DRLZS9DHUHqSbP#sig-0'
const OTHER_ADMIN = 'did:key:z6MkfujcrCFmQfvXJsRc4jTRZAGWrM2q37DRLZS9DHUHqSbP'

describe('controlFrameDocId — the send-path correlation catalog', () => {
  it('resolves the spaceId of a space-rotate (the long-covered case)', async () => {
    const frame = await createSpaceRotateMessage({
      spaceId: SPACE,
      newSpaceCapabilityVerificationKey: Buffer.alloc(32).toString('base64url'),
      newGeneration: 1,
      kid: KID,
      signingSeed: SEED,
    })
    expect(controlFrameDocId(frame as unknown as ControlFrame)).toBe(SPACE)
  })

  it('resolves the spaceId of an admin-remove — the self-leave hand-back frame', async () => {
    const frame = await createAdminRemoveMessage({
      spaceId: SPACE,
      removedAdminDid: OTHER_ADMIN,
      kid: KID,
      signingSeed: SEED,
    })
    expect(controlFrameDocId(frame as unknown as ControlFrame)).toBe(SPACE)
  })

  it('resolves the spaceId of an admin-add — same catalog, same correlation rule', async () => {
    const frame = await createAdminAddMessage({
      spaceId: SPACE,
      newAdminDid: OTHER_ADMIN,
      kid: KID,
      signingSeed: SEED,
    })
    expect(controlFrameDocId(frame as unknown as ControlFrame)).toBe(SPACE)
  })

  it('resolves the spaceId of a space-register', async () => {
    const frame = await createSpaceRegisterMessage({
      spaceId: SPACE,
      spaceCapabilityVerificationKey: Buffer.alloc(32).toString('base64url'),
      adminDids: [OTHER_ADMIN],
      kid: KID,
      signingSeed: SEED,
    })
    expect(controlFrameDocId(frame as unknown as ControlFrame)).toBe(SPACE)
  })

  it('stays undefined for frames that genuinely carry no doc scope', () => {
    expect(controlFrameDocId({ type: 'ping' } as unknown as ControlFrame)).toBeUndefined()
  })
})
