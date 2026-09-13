import type {
  MembershipActivityCapable,
  SecureSelfLeaveCapable,
  DeterministicPrivateSpaceCapable,
  NamedRootsCapable,
} from '../../ports/ReplicationAdapter'

// Runtime type guards for the OPTIONAL replication-adapter capabilities. They
// live in the application layer (not in ports/) so the ports tree stays
// type-only; the capability interfaces themselves remain port contracts.

/** Optional capability: membership changes with an attached activity entry. */
export function hasMembershipActivity(value: unknown): value is MembershipActivityCapable {
  return typeof (value as MembershipActivityCapable | null)?.addMemberWithActivity === 'function'
    && typeof (value as MembershipActivityCapable | null)?.removeMemberWithActivity === 'function'
}

/** Optional capability: secure self-leave is fully wired, including durable recovery. */
export function hasSecureSelfLeave(value: unknown): value is SecureSelfLeaveCapable {
  return typeof (value as SecureSelfLeaveCapable | null)?.supportsSecureSelfLeave === 'function'
}

/** Optional capability: a SpaceHandle whose transactDurable proves the durable append of exactly its own transaction. */
export function hasDurableTransact<T>(handle: unknown): handle is { transactDurable(fn: (doc: T) => void): Promise<void> } {
  return typeof (handle as { transactDurable?: unknown } | null)?.transactDurable === 'function'
}

/** Optional capability: deterministic-genesis private space (Sync 001). */
export function hasDeterministicPrivateSpace(value: unknown): value is DeterministicPrivateSpaceCapable {
  return typeof (value as DeterministicPrivateSpaceCapable | null)?.openOrCreateDeterministicPrivateSpace === 'function'
}

/** Der `data`-Wurzeltyp des Space-Docs — nie als benannte Wurzel adressierbar. */
const DATA_ROOT_NAME = 'data'

/** Namensregel fuer benannte Wurzeln: `^[a-z][A-Za-z0-9]*$`, nicht `data`. */
const NAMED_ROOT_NAME_PATTERN = /^[a-z][A-Za-z0-9]*$/

/**
 * Ist `name` ein zulaessiger Name fuer eine benannte Wurzel? Namen mit `_`
 * sind dem Adapter vorbehalten (`_meta`, `_members`, …) und fallen bereits
 * durch das Muster; `data` ist zusaetzlich ausgeschlossen.
 */
export function isValidNamedRootName(name: string): boolean {
  return typeof name === 'string' && name !== DATA_ROOT_NAME && NAMED_ROOT_NAME_PATTERN.test(name)
}

/**
 * Wirft synchron, wenn `name` keine zulaessige benannte Wurzel benennt. Beide
 * Adapter pruefen ueber diese eine Stelle, damit die Regel nicht driftet.
 */
export function assertValidNamedRootName(name: string): void {
  if (typeof name !== 'string' || name.length === 0) {
    throw new TypeError('named root: name must be a non-empty string')
  }
  if (name === DATA_ROOT_NAME) {
    throw new TypeError('named root: "data" is the space doc root and cannot be used as a named root')
  }
  if (name.startsWith('_')) {
    throw new TypeError(`named root: "${name}" is reserved for the adapter (names starting with "_")`)
  }
  if (!NAMED_ROOT_NAME_PATTERN.test(name)) {
    throw new TypeError(`named root: "${name}" must match ^[a-z][A-Za-z0-9]*$`)
  }
}

/**
 * Optional capability: ein SpaceHandle mit benannten Wurzel-Maps neben `data`.
 * Wurzeln kollidieren bei nebenlaeufiger Erstanlage nicht — im Gegensatz zu
 * verschachtelten Maps unter `data`.
 */
export function hasNamedRoots(handle: unknown): handle is NamedRootsCapable {
  const h = handle as NamedRootsCapable | null | undefined
  return typeof h?.getRoot === 'function'
    && typeof h?.transactRoot === 'function'
    && typeof h?.transactRootDurable === 'function'
}
