import type { ControlFrame } from './control-frame-transport'
import {
  PRESENT_CAPABILITY_CONTROL_FRAME_TYPE,
  parsePresentCapabilityControlFrame,
} from './present-capability-control-frame'
import {
  ADMIN_ADD_MESSAGE_TYPE,
  ADMIN_REMOVE_MESSAGE_TYPE,
  SPACE_REGISTER_MESSAGE_TYPE,
  SPACE_ROTATE_MESSAGE_TYPE,
  parseAdminAddMessage,
  parseAdminRemoveMessage,
  parseSpaceRegisterMessage,
  parseSpaceRotateMessage,
} from './broker-admin-messages'

/**
 * Extract the docId (= spaceId) a control frame targets, or undefined.
 *
 * The relay correlates control-frame receipts by `messageId == docId`, so a
 * caller serializing control frames per (socket, docId) needs this to key the
 * pending-receipt waiter. `present-capability` carries the docId inside its
 * capability JWS payload; the four admin-signed frames (`space-register` /
 * `space-rotate` / `admin-add` / `admin-remove`) inside their inner JWS payload.
 * `device-revoke` is not docId-scoped (returns undefined).
 *
 * CLOSED CATALOG — moves with the emitters: `sendControlFrame` THROWS for any
 * frame this switch does not resolve, client-side and before the wire. A newly
 * emitted frame type that is missing here therefore never leaves the device.
 * That is precisely how the self-leave's `admin-remove` died in the field
 * (2026-08-17): rotation confirmed and committed, then every retry failed at
 * this gate while the error message blamed the rotation.
 */
export function controlFrameDocId(frame: ControlFrame): string | undefined {
  try {
    switch (frame.type) {
      case PRESENT_CAPABILITY_CONTROL_FRAME_TYPE: {
        const parsed = parsePresentCapabilityControlFrame(frame)
        return typeof parsed.payload.spaceId === 'string' ? parsed.payload.spaceId : undefined
      }
      case SPACE_REGISTER_MESSAGE_TYPE:
        return parseSpaceRegisterMessage(frame).payload.spaceId
      case SPACE_ROTATE_MESSAGE_TYPE:
        return parseSpaceRotateMessage(frame).payload.spaceId
      case ADMIN_ADD_MESSAGE_TYPE:
        return parseAdminAddMessage(frame).payload.spaceId
      case ADMIN_REMOVE_MESSAGE_TYPE:
        return parseAdminRemoveMessage(frame).payload.spaceId
      default:
        return undefined
    }
  } catch {
    return undefined
  }
}
