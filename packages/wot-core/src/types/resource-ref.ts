/**
 * ResourceRef: Standardized pointer format for WoT resources.
 *
 * Format: wot:<type>:<id>[/<sub-path>]
 *
 * Examples:
 *   wot:attestation:abc-123
 *   wot:verification:def-456
 *   wot:space:wg-kalender
 *   wot:space:wg-kalender/item/event-789
 *   wot:contact:did:key:z6Mk...
 */

export type ResourceType =
  | 'attestation'
  | 'verification'
  | 'contact'
  | 'space'
  | 'item'

declare const __brand: unique symbol
export type ResourceRef = string & { readonly [__brand]: 'ResourceRef' }

const VALID_TYPES: ReadonlySet<string> = new Set<ResourceType>([
  'attestation',
  'verification',
  'contact',
  'space',
  'item',
])

export function createResourceRef(
  type: ResourceType,
  id: string,
  subPath?: string,
): ResourceRef {
  const ref = subPath ? `wot:${type}:${id}/${subPath}` : `wot:${type}:${id}`
  return ref as ResourceRef
}

export function parseResourceRef(
  ref: ResourceRef,
): { type: ResourceType; id: string; subPath?: string } {
  if (!ref.startsWith('wot:')) {
    throw new Error(`Invalid ResourceRef: must start with "wot:" — got "${ref}"`)
  }

  const withoutPrefix = ref.slice(4) // Remove "wot:"
  const colonIndex = withoutPrefix.indexOf(':')
  if (colonIndex === -1) {
    throw new Error(`Invalid ResourceRef: missing type — got "${ref}"`)
  }

  const type = withoutPrefix.slice(0, colonIndex)
  if (!VALID_TYPES.has(type)) {
    throw new Error(`Invalid ResourceRef: unknown type "${type}" — got "${ref}"`)
  }

  const rest = withoutPrefix.slice(colonIndex + 1)
  if (!rest) {
    throw new Error(`Invalid ResourceRef: missing id — got "${ref}"`)
  }

  // Find the first slash that separates id from subPath
  // Special case: contact refs can contain did:key:z6Mk... (colons in ID)
  const slashIndex = rest.indexOf('/')
  if (slashIndex === -1) {
    return { type: type as ResourceType, id: rest }
  }

  const id = rest.slice(0, slashIndex)
  const subPath = rest.slice(slashIndex + 1)
  return { type: type as ResourceType, id, subPath }
}
