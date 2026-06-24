import 'fake-indexeddb/auto'

// The replication adapters run background sync loops; on teardown they may log
// expected async failures (offline sends, callback errors) AFTER the test that
// started them finished. Left unsuppressed these race vitest worker teardown and
// surface as spurious EnvironmentTeardownError. Drop only this known noise; real
// failures surface via assertions.
const EXPECTED_SYNC_NOISE =
  /^\[(EncryptedSync|Replication|ReplicationAdapter|YjsReplication|AutomergeReplication|Discovery|InboxReception)\]|^Message callback error|must call connect\(\) before send|PendingMessageNotDurableError|^\[WebSocket\]/

for (const level of ['log', 'warn', 'error'] as const) {
  const original = console[level].bind(console)
  console[level] = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && EXPECTED_SYNC_NOISE.test(args[0])) return
    original(...args)
  }
}
