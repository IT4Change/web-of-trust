import type {
  MembershipActivityCapable,
  SecureSelfLeaveCapable,
  DeterministicPrivateSpaceCapable,
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

/** Optional capability: deterministic-genesis private space (Sync 001). */
export function hasDeterministicPrivateSpace(value: unknown): value is DeterministicPrivateSpaceCapable {
  return typeof (value as DeterministicPrivateSpaceCapable | null)?.openOrCreateDeterministicPrivateSpace === 'function'
}
