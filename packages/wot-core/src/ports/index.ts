export * from './CryptoAdapter'
export * from './DiscoveryAdapter'
export * from './DocLogStore'
export * from './GraphCacheStore'
export * from './identity-vault'
export * from './key-management'
export * from './MemberUpdatePendingStore'
export * from './MessageIdHistory'
export * from './MessagingAdapter'
export * from './OutboxStore'
export * from './PublishStateStore'
export * from './ReactiveStorageAdapter'
export * from './ReplicationAdapter'
// Compatibility re-export: the published `@web_of_trust/core/ports` subpath has
// always shipped these runtime capability guards (the ReplicationAdapter barrel
// exported them). Their implementation moved to the application layer; this
// re-export keeps the shipped surface identical. New code should import them
// from '@web_of_trust/core/application'.
export { hasMembershipActivity, hasSecureSelfLeave, hasDeterministicPrivateSpace } from '../application/spaces/replication-capabilities'
export * from './spaces'
export * from './SpaceMetadataStorage'
export * from './StorageAdapter'
export * from './Subscribable'
export * from './VerificationStateStore'
