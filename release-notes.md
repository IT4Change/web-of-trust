:robot: I have created a release *beep* *boop*
---


<details><summary>adapter-automerge: 0.3.0</summary>

## [0.3.0](https://github.com/IT4Change/web-of-trust/compare/adapter-automerge-v0.2.6...adapter-automerge-v0.3.0) (2026-08-18)


###   BREAKING CHANGES

* **adapters:** Die peerDependency auf @web_of_trust/core ist jetzt eine Caret-Range statt eines exakten Pins, und sie zieht mit core 0.5.0 eine breaking Version nach. Konsumenten auf core 0.4.x muessen mit-upgraden.

### Features

* **1b3:** Automerge-Mirror  Members-Set, Resolution/Cleanup, future-rotation durabel (Step 5) ([ce74e3d](https://github.com/IT4Change/web-of-trust/commit/ce74e3d899ca1778fea1be78d3aea01e983d00e6))
* **adapters:** I-READ "Key-available Ò replayBlockedByKey" on all key-available paths (Yjs + Automerge) ([3bae587](https://github.com/IT4Change/web-of-trust/commit/3bae587e1810bd649d793d348df9975e13fc687f))
* **adapters:** SpaceHandle.transactDurable  transaction-bound durability ack ([55a758e](https://github.com/IT4Change/web-of-trust/commit/55a758ecfb24859c65ea2cfb2e66ad77aa1af180))
* **adapters:** SpaceHandle.transactDurable  transaction-bound durability ack ([fc71e42](https://github.com/IT4Change/web-of-trust/commit/fc71e4274fc7a0e08a46a3b15153569fe7cf7794))
* **automerge+core:** convert Automerge adapter onto the shared log path + VE-9 UUID-docId (Slice A Phase 4) ([ae6803b](https://github.com/IT4Change/web-of-trust/commit/ae6803bd8c7e8746251a2efc3be2aadd294f8e91))
* **core,adapters,demo:** Durable Wiring  completion gate (headline e2e + reload-decrypt + onSecurityError) ([4e5774d](https://github.com/IT4Change/web-of-trust/commit/4e5774df38a07c90fe10f6f0f208a3bc164c76b4))
* **core,adapters:** catch-up completeness  pagination loop + seq-gap handling (Slice B) ([d022e57](https://github.com/IT4Change/web-of-trust/commit/d022e57537f8c1d455253357604da3a33800cdaa))
* **core,adapters:** Durable Wiring Phase 1  N2 partial-store guards + E1 propagation + sendControlFrame passthrough ([da4e2b4](https://github.com/IT4Change/web-of-trust/commit/da4e2b42d90841c2808ae2b05dd60cb50af47aa6))
* **core,adapters:** Durable Wiring Phase 2b  VE-11 restore-clone rebind + Trigger-1/2 split ([7c5e719](https://github.com/IT4Change/web-of-trust/commit/7c5e719a75bea7f7f7fc1f05cc0e1d2d63e9ac6e))
* **core,adapters:** two-phase broker-enforced secure removal (Slice SR VE-C1/VE-C3) ([6a2c4cd](https://github.com/IT4Change/web-of-trust/commit/6a2c4cdf02275a1831529bfbf45e02aa0294a4c8))
* **core,relay,adapters:** KEY_GENERATION_STALE re-emit for the legitimate lagger (Slice SR VE-C2) ([2e9c150](https://github.com/IT4Change/web-of-trust/commit/2e9c15041109f52d232dbc71d9f09223dabe9099))
* **core:** I-CAP  content-bound capability import on the duplicate key-rotation path (multi-device write after rotation) ([2d570e6](https://github.com/IT4Change/web-of-trust/commit/2d570e6c1b700c646e840f220467fea5458180ba))
* **demo,adapters:** generischer Dialog-Lifecycle multi-device (synced dismissedNotifications) ([a1ef3d8](https://github.com/IT4Change/web-of-trust/commit/a1ef3d87b2da52ee24ffde8e89c3de0ae072b2cd))
* **demo:** A2 Teil A  wire PersonalLogSyncAdapter onto the durable-log path [WIP: E2E hardening pending] ([e7aef1d](https://github.com/IT4Change/web-of-trust/commit/e7aef1db6eb9cc78ed79f46510b32bfac6686274))
* **spaces:** echte Admin-Liste im synced Doc  1.B.3-admin-management ([5ade33c](https://github.com/IT4Change/web-of-trust/commit/5ade33c77fc5c7a549d4237c99d542e92b00042a))
* **spaces:** echte Admin-Liste im synced Doc  1.B.3-admin-management ([bff37c2](https://github.com/IT4Change/web-of-trust/commit/bff37c2ce2659472a68fefdba3b34de3dee715cc))
* **sync:** deterministic-genesis private space (core + adapters) ([7d4d97d](https://github.com/IT4Change/web-of-trust/commit/7d4d97dd731f7f693099d9e1e44176f6270e6a80))
* **sync:** deterministic-genesis private space (core + adapters)  PR 1/2 ([9d2da66](https://github.com/IT4Change/web-of-trust/commit/9d2da665e1ccacb1483f47ac57702500ccb96006))
* **sync:** P0b  MembershipActivityCapable + membershipRemovals (Membership-Schnitt) ([c161b7c](https://github.com/IT4Change/web-of-trust/commit/c161b7cd7e6882f35d72b9cbda4b3794c76f4647))


### Bug Fixes

* **1b3:** AM content-pending-buffer blocked-by-key + atomares Key/Gen-Lesen (Sync 002 Z.173, B1/F4) ([396bee3](https://github.com/IT4Change/web-of-trust/commit/396bee3997d056b78928c57d0927306aa89695c5))
* **1b3:** AM event-set auf reservierten root-key (Kollisionsschutz, F-6) ([fcd8abb](https://github.com/IT4Change/web-of-trust/commit/fcd8abbf804ba58eefa561aa38509ca3d3d74e12))
* **1b3:** AM members-container-seed im invite-apply (Review-Minor) ([ce42849](https://github.com/IT4Change/web-of-trust/commit/ce42849959128527b806b29dbb880dca8541e181))
* **1b3:** AM resolution-chain + enc-key-pruning (M1-Spiegel, MINOR-1) ([227947b](https://github.com/IT4Change/web-of-trust/commit/227947b309775b3ba2b48c8e7209b61dca22de31))
* **1b3:** deterministischer members-container-seed auch in createSpace (M2) ([1ffb67d](https://github.com/IT4Change/web-of-trust/commit/1ffb67d51b3b18ab7eff5d6c0c4a4714f2ce3918))
* **1b3:** publish empty /v and /a on offline-retry; untrack tsbuildinfo (Codex review [#198](https://github.com/IT4Change/web-of-trust/issues/198)) ([6f33008](https://github.com/IT4Change/web-of-trust/commit/6f3300886bdf9f7225e928810f3278f2b6e29655))
* **1b3:** re-derive isVerification from stored vcJws on storage read (review BLOCKER) ([6f3420f](https://github.com/IT4Change/web-of-trust/commit/6f3420ff44004ca8c1a57f6825c83ef5cafb8e84))
* **1b3:** resolution auch nach savePending + restore (Sync 005 Z.194, Review-M1) ([ccd8354](https://github.com/IT4Change/web-of-trust/commit/ccd83549a2562005295490ef2aafd737008082cc))
* **1b3:** review-nacharbeiten (Befund-Pin-Header, Drop-Logzeile, members[0]-Kommentare, Test-Flake-Härtung) ([54142e4](https://github.com/IT4Change/web-of-trust/commit/54142e48502ad24bfa0ce1f1027d2609c0409449))
* **adapter-automerge:** cancel mid-flight sends across a reconnect via lifecycle epoch ([#321](https://github.com/IT4Change/web-of-trust/issues/321)) ([93909cf](https://github.com/IT4Change/web-of-trust/commit/93909cf197f19fb2c18be3d6d74f01187113e14c))
* **adapter-automerge:** PersonalDocManager importiert Core via /storage statt Root (CI [#201](https://github.com/IT4Change/web-of-trust/issues/201)) ([f975bad](https://github.com/IT4Change/web-of-trust/commit/f975badfa44b02f8916bf17d0d5056f611e0da05))
* **adapter-automerge:** stop mid-flight sync-send from logging after disconnect ([cec4691](https://github.com/IT4Change/web-of-trust/commit/cec469126a55cb740682d97c89c90177319c2c06))
* **adapter-automerge:** stop mid-flight sync-send from logging after disconnect (CI teardown flake) ([0676e0f](https://github.com/IT4Change/web-of-trust/commit/0676e0f41f7b609c0eab9e146f1b68eb2ff75d51))
* **adapters:** a creation flight must not certify a lifecycle it no longer belongs to ([36a089d](https://github.com/IT4Change/web-of-trust/commit/36a089d788364ea4f4cfd75b550b28e11ca39434))
* **adapters:** close B3 retry/idempotency hole  never treat local presence as durable proof (loop-review re-review) ([14babe0](https://github.com/IT4Change/web-of-trust/commit/14babe0c075257c810e58fc3cf70f80b906a92e5))
* **adapters:** drop the coordinator + replay-guard state on cleanupSpaceLocally (stale-coordinator, Yjs”Automerge parity) ([a81c95c](https://github.com/IT4Change/web-of-trust/commit/a81c95cf06b5cf6360a87ce897e1761f36da824c))
* **adapters:** extend the lifecycle epoch over the late coordinator tail ([5fc4105](https://github.com/IT4Change/web-of-trust/commit/5fc410539b51ecf70f8f29500be3ca9abafcb401))
* **adapters:** guard member-removal under enableLogSync as unsupported; remove half-built VE-10 broker-enforcement (Slice A) ([45771f1](https://github.com/IT4Change/web-of-trust/commit/45771f1928d851b005436480d858fba96df8f674))
* **adapters:** guard the earlier await boundaries of a creation flight too ([b3d302b](https://github.com/IT4Change/web-of-trust/commit/b3d302b409e8d87736e3a29d7cf93f9d2a897ec2))
* **adapters:** issue the lifecycle lease synchronously at the entry point ([2461e5c](https://github.com/IT4Change/web-of-trust/commit/2461e5cbcf472d9d8c4a01c2634dbd28ca1ba513))
* **adapters:** make private-space completion survive a process restart ([ad39cc0](https://github.com/IT4Change/web-of-trust/commit/ad39cc04c2c39549bf173804dfe32bc596f6369f))
* **adapters:** peerDependency auf core als Range statt exaktem Pin ([dd9a477](https://github.com/IT4Change/web-of-trust/commit/dd9a47795e775ca4bdee5b926d72c522670549ba))
* **adapters:** put the creation flight under a lifecycle lease ([de5a45a](https://github.com/IT4Change/web-of-trust/commit/de5a45a670a31681c3be0026b8657b82c19ce383))
* **adapters:** resume a failed private-space create instead of reporting success ([e3482c7](https://github.com/IT4Change/web-of-trust/commit/e3482c744334a7b35c0d5e8aed69de87f68518a4))
* **adapters:** transactDurable fails closed on missing key; Automerge frees localChanging during the async append ([87a74f3](https://github.com/IT4Change/web-of-trust/commit/87a74f3cbca119aa76d0d1a223d3a154cff06d9e))
* **automerge:** defer keyless ghost capability work ([49b6ea5](https://github.com/IT4Change/web-of-trust/commit/49b6ea5a1f14d0929d5150e0b2c3ef9d1a3f51ce))
* chain capability catch-up after coalescing ([14e93cb](https://github.com/IT4Change/web-of-trust/commit/14e93cb262ff8f68ab144b7a9bc063d1073d3831))
* converge secure removal recovery ([0d13b4d](https://github.com/IT4Change/web-of-trust/commit/0d13b4d9df626962b6d6d0561de30191cfbb1673))
* **core,adapters,test:** address loop-review (codex-gpt-5 + CodeRabbit) on PR [#214](https://github.com/IT4Change/web-of-trust/issues/214) ([50b4fd5](https://github.com/IT4Change/web-of-trust/commit/50b4fd5d341614d97767aa616ee66b5aed4380e7))
* **core,relay,adapters:** close 3 safety blockers + broker-url check from loop-review (Slice SR-3) ([0f25188](https://github.com/IT4Change/web-of-trust/commit/0f2518863f21dbbf924cb42aec497feabee80df7))
* **core,relay,adapters:** close the 3 CodeRabbit Non-Security findings + minors (Slice SR-4) ([91bce7f](https://github.com/IT4Change/web-of-trust/commit/91bce7f1391990b68cd32a247cc7e948bf7d4223))
* **core,relay:** converge the legitimate lagger over real WS + route all write-path rejects (Slice SR-2, [#213](https://github.com/IT4Change/web-of-trust/issues/213)) ([4101225](https://github.com/IT4Change/web-of-trust/commit/41012259a8d73e373e969d1501d27d9385fb844d))
* **core+adapters:** close AES-GCM nonce-reuse blocker + churn/liveness concerns from dual review (Slice A) ([f71d2bd](https://github.com/IT4Change/web-of-trust/commit/f71d2bd306a04d27cd09a54902d5f0ab28877696))
* **core+adapters:** enforce member-removal at the broker via durable retriable space-rotate (Slice A VE-10 blocker) ([3cf4ee9](https://github.com/IT4Change/web-of-trust/commit/3cf4ee920df721b044ec612bd005cc7e126f5b1c))
* defer reseed capability generation ([a9db57d](https://github.com/IT4Change/web-of-trust/commit/a9db57d2a53fb02efbc25f6a432d0314ed825269))
* gate secure self-leave by durable capabilities ([f5a67c8](https://github.com/IT4Change/web-of-trust/commit/f5a67c8f16aa10979e888158edef881716cf6793))
* **inbox-wire:** automerge documentUrl in den authentifizierten Pfad (Review M2) ([e55ee3b](https://github.com/IT4Change/web-of-trust/commit/e55ee3b8b83842790281cdd984f9985ab7f5650f))
* **inbox-wire:** message-id-history erst bei konklusiver Verarbeitung (Sync 003 Z.466) ([e92ecb4](https://github.com/IT4Change/web-of-trust/commit/e92ecb4b5d399d029406dadde8ec9cce2a72022a))
* **inbox-wire:** review-nacharbeiten (stale kommentare, VE-6-doku, space-invite-klassifikation, outbox-typen) ([d99d794](https://github.com/IT4Change/web-of-trust/commit/d99d7940770e57d1c0f5a7442b0658de5b0413f9))
* **publish:** Repository-URL auf real-life-org, npm-view-Auswertung korrigieren ([cdb2bcc](https://github.com/IT4Change/web-of-trust/commit/cdb2bcca0c72dc729a520e9e05d91565843c8e7b))
* retry capability catchup after reseed ([0ef7f73](https://github.com/IT4Change/web-of-trust/commit/0ef7f7310602ec2710d17e17ddbc1b1358338a04))
* **sync:** address PR-review blockers ([#234](https://github.com/IT4Change/web-of-trust/issues/234)) ([59c2ee1](https://github.com/IT4Change/web-of-trust/commit/59c2ee1da3094abceef9fe7724ab15ea18bd864d))
* **sync:** Automerge catchUpGeneration an echten Coordinator statt Stub  Fremd-Removal konvergiert nach GENERATION_GAP ([49996d2](https://github.com/IT4Change/web-of-trust/commit/49996d277a5ab2f800fbf598c504c9f7649df08d))
* **sync:** guard generation&gt;=0 in _persistSpaceMetadata seed lookup ([#234](https://github.com/IT4Change/web-of-trust/issues/234) PR-review) ([fbad51c](https://github.com/IT4Change/web-of-trust/commit/fbad51c923c9de61256767d3b29e67b017763b02))
* **sync:** persist+restore capability signing seed so a recovered device can write ([#234](https://github.com/IT4Change/web-of-trust/issues/234)) ([239bbd0](https://github.com/IT4Change/web-of-trust/commit/239bbd0a2b39fbf645c4cc50c59738f4b54c8d84))
* **sync:** recovered device can write to existing spaces  persist+restore capability signing seed ([#234](https://github.com/IT4Change/web-of-trust/issues/234)) ([2abc70c](https://github.com/IT4Change/web-of-trust/commit/2abc70c40451fc5ea160d0267aaa6069af903e46))
* **sync:** Reseed  Capability-Praesentation deferrt bei fehlenden Keys statt zu crashen ([21a8223](https://github.com/IT4Change/web-of-trust/commit/21a8223d42eae3baf92c3390434069cbfd6cc07f))
* **vault:** bound every VaultClient fetch with an AbortController timeout ([46b2f4e](https://github.com/IT4Change/web-of-trust/commit/46b2f4e9c45032e319aef06dfd79d1c0af3d3e5c))
* **vault:** VaultClient-fetch-Timeout  kappt den 5G-Startup-Hang (ohne Init-Umbau) ([29ca509](https://github.com/IT4Change/web-of-trust/commit/29ca5095b682c45a2ee4e34bbf9e58d0d00bfdb5))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @web_of_trust/core bumped to 0.6.0
  * peerDependencies
    * @web_of_trust/core bumped to 0.6.0
</details>

<details><summary>adapter-yjs: 0.3.0</summary>

## [0.3.0](https://github.com/IT4Change/web-of-trust/compare/adapter-yjs-v0.2.6...adapter-yjs-v0.3.0) (2026-08-18)


###   BREAKING CHANGES

* **adapters:** Die peerDependency auf @web_of_trust/core ist jetzt eine Caret-Range statt eines exakten Pins, und sie zieht mit core 0.5.0 eine breaking Version nach. Konsumenten auf core 0.4.x muessen mit-upgraden.

### Features

* **1b3:** Yjs _members-Event-Set + createdBy, Backfill tot (Step 2) ([969456c](https://github.com/IT4Change/web-of-trust/commit/969456c46d120ccb5a52cc955f72acc6d08b46c0))
* **1b3:** Yjs Resolution/Cleanup + Generation-Gap (Steps 3+4) ([83475ec](https://github.com/IT4Change/web-of-trust/commit/83475ec9c28f32bc0930c8b6c3a0503e93e288b2))
* **adapter-yjs:** additives notificationState im PersonalDoc (P0 Notification-Center) ([5cc611b](https://github.com/IT4Change/web-of-trust/commit/5cc611b7b4cc093a340d6dddeb3a3703c980a51a))
* **adapter-yjs:** persist personal notification state ([28e84b4](https://github.com/IT4Change/web-of-trust/commit/28e84b4b2302d2732839ff5ade85dc9488216220))
* **adapters:** I-READ "Key-available Ò replayBlockedByKey" on all key-available paths (Yjs + Automerge) ([3bae587](https://github.com/IT4Change/web-of-trust/commit/3bae587e1810bd649d793d348df9975e13fc687f))
* **adapters:** SpaceHandle.transactDurable  transaction-bound durability ack ([55a758e](https://github.com/IT4Change/web-of-trust/commit/55a758ecfb24859c65ea2cfb2e66ad77aa1af180))
* **adapters:** SpaceHandle.transactDurable  transaction-bound durability ack ([fc71e42](https://github.com/IT4Change/web-of-trust/commit/fc71e4274fc7a0e08a46a3b15153569fe7cf7794))
* add yjs membership activity capability ([7609e82](https://github.com/IT4Change/web-of-trust/commit/7609e8250674197d66a40fd5a6c136065a9f9494))
* **automerge+core:** convert Automerge adapter onto the shared log path + VE-9 UUID-docId (Slice A Phase 4) ([ae6803b](https://github.com/IT4Change/web-of-trust/commit/ae6803bd8c7e8746251a2efc3be2aadd294f8e91))
* **core,adapters,demo:** Durable Wiring  completion gate (headline e2e + reload-decrypt + onSecurityError) ([4e5774d](https://github.com/IT4Change/web-of-trust/commit/4e5774df38a07c90fe10f6f0f208a3bc164c76b4))
* **core,adapters:** catch-up completeness  pagination loop + seq-gap handling (Slice B) ([d022e57](https://github.com/IT4Change/web-of-trust/commit/d022e57537f8c1d455253357604da3a33800cdaa))
* **core,adapters:** Durable Wiring Phase 1  N2 partial-store guards + E1 propagation + sendControlFrame passthrough ([da4e2b4](https://github.com/IT4Change/web-of-trust/commit/da4e2b42d90841c2808ae2b05dd60cb50af47aa6))
* **core,adapters:** Durable Wiring Phase 2b  VE-11 restore-clone rebind + Trigger-1/2 split ([7c5e719](https://github.com/IT4Change/web-of-trust/commit/7c5e719a75bea7f7f7fc1f05cc0e1d2d63e9ac6e))
* **core,adapters:** two-phase broker-enforced secure removal (Slice SR VE-C1/VE-C3) ([6a2c4cd](https://github.com/IT4Change/web-of-trust/commit/6a2c4cdf02275a1831529bfbf45e02aa0294a4c8))
* **core,relay,adapters:** KEY_GENERATION_STALE re-emit for the legitimate lagger (Slice SR VE-C2) ([2e9c150](https://github.com/IT4Change/web-of-trust/commit/2e9c15041109f52d232dbc71d9f09223dabe9099))
* **core+adapter-yjs:** appData  erweiterbare App-Metadaten im Space-_meta ([009eac6](https://github.com/IT4Change/web-of-trust/commit/009eac67713ec4b428e7c41530ef3de1aac56550))
* **core:** I-CAP  content-bound capability import on the duplicate key-rotation path (multi-device write after rotation) ([2d570e6](https://github.com/IT4Change/web-of-trust/commit/2d570e6c1b700c646e840f220467fea5458180ba))
* **demo,adapters:** generischer Dialog-Lifecycle multi-device (synced dismissedNotifications) ([a1ef3d8](https://github.com/IT4Change/web-of-trust/commit/a1ef3d87b2da52ee24ffde8e89c3de0ae072b2cd))
* **demo:** A2 Teil A  wire PersonalLogSyncAdapter onto the durable-log path [WIP: E2E hardening pending] ([e7aef1d](https://github.com/IT4Change/web-of-trust/commit/e7aef1db6eb9cc78ed79f46510b32bfac6686274))
* persist confirmed membership removals ([d46903d](https://github.com/IT4Change/web-of-trust/commit/d46903d76291246498670484b394128406facb53))
* **spaces:** echte Admin-Liste im synced Doc  1.B.3-admin-management ([5ade33c](https://github.com/IT4Change/web-of-trust/commit/5ade33c77fc5c7a549d4237c99d542e92b00042a))
* **spaces:** echte Admin-Liste im synced Doc  1.B.3-admin-management ([bff37c2](https://github.com/IT4Change/web-of-trust/commit/bff37c2ce2659472a68fefdba3b34de3dee715cc))
* **sync:** Catch-up-Zustand beobachtbar machen ([1704181](https://github.com/IT4Change/web-of-trust/commit/1704181392ed7adab617a2eda6493c28600123a7))
* **sync:** Catch-up-Zustand beobachtbar machen ([29ab1ed](https://github.com/IT4Change/web-of-trust/commit/29ab1ed310048797b159a18170c4a4d4478c3b0b))
* **sync:** deterministic-genesis private space (core + adapters) ([7d4d97d](https://github.com/IT4Change/web-of-trust/commit/7d4d97dd731f7f693099d9e1e44176f6270e6a80))
* **sync:** deterministic-genesis private space (core + adapters)  PR 1/2 ([9d2da66](https://github.com/IT4Change/web-of-trust/commit/9d2da665e1ccacb1483f47ac57702500ccb96006))
* **sync:** dual-broker Stage A  camp handshakes work anywhere (Sync 003 Multi-Broker) ([a6fa2cc](https://github.com/IT4Change/web-of-trust/commit/a6fa2ccee39af0b42116ae307243c1ae42605b60))
* **sync:** Dual-Broker Stufe A  Camp-Handshakes funktionieren überall ([6822f0b](https://github.com/IT4Change/web-of-trust/commit/6822f0b2ff79fa7e42a23296a227462e4fa1126c))
* **sync:** P0b  MembershipActivityCapable + membershipRemovals (Membership-Schnitt) ([c161b7c](https://github.com/IT4Change/web-of-trust/commit/c161b7cd7e6882f35d72b9cbda4b3794c76f4647))
* **yjs+core:** blocked-by-key replay, restore-clone, personal-doc log sync, content-off, space-rotate (Slice A VE-5/6/7/10) ([556037d](https://github.com/IT4Change/web-of-trust/commit/556037dfea2de734893dcbbdf9f5737b8885699c))
* **yjs+core:** rewire Yjs content sync onto Sync-002 log-entry path (Slice A VE-2/3/4/8/9) ([9bd7ae0](https://github.com/IT4Change/web-of-trust/commit/9bd7ae0e5b203e82e82f1dd35613c33f86ee9c71))


### Bug Fixes

* **1b3:** publish empty /v and /a on offline-retry; untrack tsbuildinfo (Codex review [#198](https://github.com/IT4Change/web-of-trust/issues/198)) ([6f33008](https://github.com/IT4Change/web-of-trust/commit/6f3300886bdf9f7225e928810f3278f2b6e29655))
* **1b3:** re-derive isVerification from stored vcJws on storage read (review BLOCKER) ([6f3420f](https://github.com/IT4Change/web-of-trust/commit/6f3420ff44004ca8c1a57f6825c83ef5cafb8e84))
* **1b3:** resolution auch nach savePending + restore (Sync 005 Z.194, Review-M1) ([ccd8354](https://github.com/IT4Change/web-of-trust/commit/ccd83549a2562005295490ef2aafd737008082cc))
* **1b3:** review-nacharbeiten (Befund-Pin-Header, Drop-Logzeile, members[0]-Kommentare, Test-Flake-Härtung) ([54142e4](https://github.com/IT4Change/web-of-trust/commit/54142e48502ad24bfa0ce1f1027d2609c0409449))
* **1b3:** Yjs cleanup schliesst offene SpaceHandles (Codex-Re-Review M1) ([f9f8126](https://github.com/IT4Change/web-of-trust/commit/f9f81268f2bd71f0aec8ec2af39af265d390fa61))
* **1b3:** Yjs resolution-chain verkettet + members re-gelesen, enc-key-pruning (M1, MINOR-1) ([0e58690](https://github.com/IT4Change/web-of-trust/commit/0e5869049c77809be18da9b0a124f7013f48a79c))
* **adapter-yjs:** appData  Fingerprint, Komplett-Loeschung, Key- und Wert-Validierung ([8aa6fc4](https://github.com/IT4Change/web-of-trust/commit/8aa6fc40a36df827847330cc04e6a38b24a34a7f))
* **adapter-yjs:** deleteProperty für Top-Level-Felder + echte Konvergenz-Fixtures im CRDT-Test ([2d28e0a](https://github.com/IT4Change/web-of-trust/commit/2d28e0aabe37a4e5d5687a10fd1dd8888baba1d6))
* **adapter-yjs:** Ghost-Space-Grace läuft auf lokaler Uhr  Reseed zerstört keine Spaces mehr ([72f0767](https://github.com/IT4Change/web-of-trust/commit/72f0767f54335ad418d74163c1256bd73bba4dd5))
* **adapter-yjs:** has-Trap für notificationState-Felder ('field' in state) ([a8e263a](https://github.com/IT4Change/web-of-trust/commit/a8e263a9cd29704666c0c51fd098da322e8e875a))
* **adapter-yjs:** notificationState lazy-initialisierbar + symbol-sichere Proxy-Traps ([d927ce1](https://github.com/IT4Change/web-of-trust/commit/d927ce1676af1b9368db8313593630d48363dc31))
* **adapter-yjs:** Reseed-Datenverlust  Ghost-Space-Grace auf lokaler Uhr ([3cce51f](https://github.com/IT4Change/web-of-trust/commit/3cce51f40914c850749cf1accd0f800963700b9a))
* **adapter-yjs:** Review-Runde  Key-Reimport vor Ghost-Urteil, Grace-Reset bei stop(), tgz raus ([6fa757f](https://github.com/IT4Change/web-of-trust/commit/6fa757f3f59fd2cccca43b7ddc5e63207281e34f))
* **adapter-yjs:** transactDurable fails fast before mutating without log-sync ([4c949d2](https://github.com/IT4Change/web-of-trust/commit/4c949d28db0927f96cb090f4dbaa2f11470d0d30))
* **adapters:** a creation flight must not certify a lifecycle it no longer belongs to ([36a089d](https://github.com/IT4Change/web-of-trust/commit/36a089d788364ea4f4cfd75b550b28e11ca39434))
* **adapters:** close B3 retry/idempotency hole  never treat local presence as durable proof (loop-review re-review) ([14babe0](https://github.com/IT4Change/web-of-trust/commit/14babe0c075257c810e58fc3cf70f80b906a92e5))
* **adapters:** drop the coordinator + replay-guard state on cleanupSpaceLocally (stale-coordinator, Yjs”Automerge parity) ([a81c95c](https://github.com/IT4Change/web-of-trust/commit/a81c95cf06b5cf6360a87ce897e1761f36da824c))
* **adapters:** extend the lifecycle epoch over the late coordinator tail ([5fc4105](https://github.com/IT4Change/web-of-trust/commit/5fc410539b51ecf70f8f29500be3ca9abafcb401))
* **adapters:** guard member-removal under enableLogSync as unsupported; remove half-built VE-10 broker-enforcement (Slice A) ([45771f1](https://github.com/IT4Change/web-of-trust/commit/45771f1928d851b005436480d858fba96df8f674))
* **adapters:** guard the earlier await boundaries of a creation flight too ([b3d302b](https://github.com/IT4Change/web-of-trust/commit/b3d302b409e8d87736e3a29d7cf93f9d2a897ec2))
* **adapters:** issue the lifecycle lease synchronously at the entry point ([2461e5c](https://github.com/IT4Change/web-of-trust/commit/2461e5cbcf472d9d8c4a01c2634dbd28ca1ba513))
* **adapters:** make private-space completion survive a process restart ([ad39cc0](https://github.com/IT4Change/web-of-trust/commit/ad39cc04c2c39549bf173804dfe32bc596f6369f))
* **adapters:** peerDependency auf core als Range statt exaktem Pin ([dd9a477](https://github.com/IT4Change/web-of-trust/commit/dd9a47795e775ca4bdee5b926d72c522670549ba))
* **adapters:** put the creation flight under a lifecycle lease ([de5a45a](https://github.com/IT4Change/web-of-trust/commit/de5a45a670a31681c3be0026b8657b82c19ce383))
* **adapters:** resume a failed private-space create instead of reporting success ([e3482c7](https://github.com/IT4Change/web-of-trust/commit/e3482c744334a7b35c0d5e8aed69de87f68518a4))
* **adapters:** transactDurable fails closed on missing key; Automerge frees localChanging during the async append ([87a74f3](https://github.com/IT4Change/web-of-trust/commit/87a74f3cbca119aa76d0d1a223d3a154cff06d9e))
* chain capability catch-up after coalescing ([14e93cb](https://github.com/IT4Change/web-of-trust/commit/14e93cb262ff8f68ab144b7a9bc063d1073d3831))
* converge secure removal recovery ([0d13b4d](https://github.com/IT4Change/web-of-trust/commit/0d13b4d9df626962b6d6d0561de30191cfbb1673))
* **core,adapters,test:** address loop-review (codex-gpt-5 + CodeRabbit) on PR [#214](https://github.com/IT4Change/web-of-trust/issues/214) ([50b4fd5](https://github.com/IT4Change/web-of-trust/commit/50b4fd5d341614d97767aa616ee66b5aed4380e7))
* **core,adapters:** Slice B v3  close the multi-page-tail data-loss + 2 majors (3rd dual-review) ([0d64607](https://github.com/IT4Change/web-of-trust/commit/0d646072013ad44f75f72b24195de13538a2898f))
* **core,relay,adapters:** close 3 safety blockers + broker-url check from loop-review (Slice SR-3) ([0f25188](https://github.com/IT4Change/web-of-trust/commit/0f2518863f21dbbf924cb42aec497feabee80df7))
* **core,relay:** converge the legitimate lagger over real WS + route all write-path rejects (Slice SR-2, [#213](https://github.com/IT4Change/web-of-trust/issues/213)) ([4101225](https://github.com/IT4Change/web-of-trust/commit/41012259a8d73e373e969d1501d27d9385fb844d))
* **core+adapter-yjs:** Delete-Persistenz  Scheduler-Heads deletion-fest, Restore-Guard auf Doc-Load ([f373b94](https://github.com/IT4Change/web-of-trust/commit/f373b944417a6adca90834e4e5bf906c5748ceb3))
* **core+adapters:** close AES-GCM nonce-reuse blocker + churn/liveness concerns from dual review (Slice A) ([f71d2bd](https://github.com/IT4Change/web-of-trust/commit/f71d2bd306a04d27cd09a54902d5f0ab28877696))
* **core+adapters:** enforce member-removal at the broker via durable retriable space-rotate (Slice A VE-10 blocker) ([3cf4ee9](https://github.com/IT4Change/web-of-trust/commit/3cf4ee920df721b044ec612bd005cc7e126f5b1c))
* defer reseed capability generation ([a9db57d](https://github.com/IT4Change/web-of-trust/commit/a9db57d2a53fb02efbc25f6a432d0314ed825269))
* enforce durable self-leave removal flow ([79045c1](https://github.com/IT4Change/web-of-trust/commit/79045c1123db857199e7bc044abcbfea51c62ae9))
* gate secure self-leave by durable capabilities ([f5a67c8](https://github.com/IT4Change/web-of-trust/commit/f5a67c8f16aa10979e888158edef881716cf6793))
* **inbox-wire:** message-id-history erst bei konklusiver Verarbeitung (Sync 003 Z.466) ([e92ecb4](https://github.com/IT4Change/web-of-trust/commit/e92ecb4b5d399d029406dadde8ec9cce2a72022a))
* **inbox-wire:** review-nacharbeiten (stale kommentare, VE-6-doku, space-invite-klassifikation, outbox-typen) ([d99d794](https://github.com/IT4Change/web-of-trust/commit/d99d7940770e57d1c0f5a7442b0658de5b0413f9))
* **publish:** Repository-URL auf real-life-org, npm-view-Auswertung korrigieren ([cdb2bcc](https://github.com/IT4Change/web-of-trust/commit/cdb2bcca0c72dc729a520e9e05d91565843c8e7b))
* retry capability catchup after reseed ([0ef7f73](https://github.com/IT4Change/web-of-trust/commit/0ef7f7310602ec2710d17e17ddbc1b1358338a04))
* **storage:** Kontakt-Identität kommt aus dem Map-Schlüssel ([13f6f9d](https://github.com/IT4Change/web-of-trust/commit/13f6f9da87ded2e2b4fc53ebe961bb2f0dee6e01))
* **storage:** Kontakt-Identität kommt aus dem Map-Schlüssel ([444a50e](https://github.com/IT4Change/web-of-trust/commit/444a50e1395c3bf47628259a8413566a81c4101a))
* **storage:** Lesepfad-Invariante auch beim Einzelabruf und für Leerzeichen ([a851eec](https://github.com/IT4Change/web-of-trust/commit/a851eecea7406773f36c515ffd1fa87e41ffe349))
* **sync:** Abschluss eines Catch-ups auch ohne Konfigurations-Hook melden ([864652c](https://github.com/IT4Change/web-of-trust/commit/864652c1e9c4d43a96eae8a7535e20c2e1e480ae))
* **sync:** Abschluss eines Catch-ups auch ohne Konfigurations-Hook melden ([c25dd45](https://github.com/IT4Change/web-of-trust/commit/c25dd45ea08c8e7a83d753dd801a5aa1a186c5dd))
* **sync:** address PR-review blockers ([#234](https://github.com/IT4Change/web-of-trust/issues/234)) ([59c2ee1](https://github.com/IT4Change/web-of-trust/commit/59c2ee1da3094abceef9fe7724ab15ea18bd864d))
* **sync:** bot-review round  empty vaultUrl guard, per-field getDocInfo merge, carrying-broker metrics URL, monitor XSS escape ([1ff898b](https://github.com/IT4Change/web-of-trust/commit/1ff898bb91f77716fc695bc57a610ca9e728f493))
* **sync:** Eine Retry-Autorität für Log-Sync-Envelopes  Outbox-Orphans + Hard-Stop-Loop ([#236](https://github.com/IT4Change/web-of-trust/issues/236)) ([5396261](https://github.com/IT4Change/web-of-trust/commit/53962619f67e6165f4d3cf4140841fb49b5987c0))
* **sync:** Lifecycle-Altbug-Fixes aus [#291](https://github.com/IT4Change/web-of-trust/issues/291) ins Release-Artefakt (0.1.6-Trigger) ([#295](https://github.com/IT4Change/web-of-trust/issues/295)) ([2089773](https://github.com/IT4Change/web-of-trust/commit/2089773c49e7db6e1bebd81dbf997cb6005aa92b))
* **sync:** Lifecycle-Besitz, Meldereihenfolge und der First-Publication-Pfad ([5a228b0](https://github.com/IT4Change/web-of-trust/commit/5a228b0bed2a0eb3173bb4582afad85929b07ec4))
* **sync:** make generation gap recovery broker-authoritative ([1db6150](https://github.com/IT4Change/web-of-trust/commit/1db6150f49ec6e774393a8333668aad08d09c9ce))
* **sync:** Meldequelle über Neustart und Aufbau-Wettläufe hinweg gültig halten ([3bfdc0c](https://github.com/IT4Change/web-of-trust/commit/3bfdc0cea6f25b8410fb6fb544e1e5e09590d5fb))
* **sync:** Meldezähler an die Verbindungsepoche binden ([5686bd7](https://github.com/IT4Change/web-of-trust/commit/5686bd7a7637ffe98de39fe147fec3124681b888))
* **sync:** P0a Gates 2+3  Membership-Catch-up-Routing + Initial-Catch-up bei stehender Verbindung ([#288](https://github.com/IT4Change/web-of-trust/issues/288)) ([c63c86d](https://github.com/IT4Change/web-of-trust/commit/c63c86d0ee1ee2fde976a6e9ca83d0ff072994fb))
* **sync:** persist+restore capability signing seed so a recovered device can write ([#234](https://github.com/IT4Change/web-of-trust/issues/234)) ([239bbd0](https://github.com/IT4Change/web-of-trust/commit/239bbd0a2b39fbf645c4cc50c59738f4b54c8d84))
* **sync:** recover generation gaps and revoke self admin ([25a4dac](https://github.com/IT4Change/web-of-trust/commit/25a4dac66e27a98e08256c7bad7b254597be91ac))
* **sync:** recovered device can write to existing spaces  persist+restore capability signing seed ([#234](https://github.com/IT4Change/web-of-trust/issues/234)) ([2abc70c](https://github.com/IT4Change/web-of-trust/commit/2abc70c40451fc5ea160d0267aaa6069af903e46))
* **sync:** Removal-Persistenz  explizite Init-Sonde statt String-Match, Wiring-Fehler laut ([08f005c](https://github.com/IT4Change/web-of-trust/commit/08f005cbc8b38b1d8abb9604f5dcc58c0d6f824a))
* **sync:** Reseed  Capability-Praesentation deferrt bei fehlenden Keys statt zu crashen ([21a8223](https://github.com/IT4Change/web-of-trust/commit/21a8223d42eae3baf92c3390434069cbfd6cc07f))
* **sync:** resolve multi-device self-leave ([0e29e41](https://github.com/IT4Change/web-of-trust/commit/0e29e413637900d40527ebbd77cd7467122374e8))
* **sync:** Self-Removal-Echo  Own-DID-Zustellung wird beim Sender nicht verarbeitet (sentMessageIds-Guard) ([d635351](https://github.com/IT4Change/web-of-trust/commit/d635351cd6958e1232b7261e86f65dae5ea58f3d))
* **sync:** single retry authority for log-sync envelopes ([#236](https://github.com/IT4Change/web-of-trust/issues/236)) ([ee69f2a](https://github.com/IT4Change/web-of-trust/commit/ee69f2a5197209d9a299292b179c47f5cf9d8e90))
* **sync:** Single-Flight an den Lebenszyklus binden; E2E-Polling null-sicher ([b2ad58c](https://github.com/IT4Change/web-of-trust/commit/b2ad58c875a104fcdeffc2336470b6313c5f4af2))
* **sync:** support non-admin self leave ([63dd3ed](https://github.com/IT4Change/web-of-trust/commit/63dd3eddb28802ce9c7b4bd5341bbd62cddc5bb8))
* **verification:** Yjs-Adapter re-derivt isVerification-Marker aus vcJws ([a5806a6](https://github.com/IT4Change/web-of-trust/commit/a5806a6b26b11997791cc983e50eb621d8a1c1b5))
* **verification:** Yjs-Adapter re-derivt isVerification-Marker aus vcJws ([2c626b1](https://github.com/IT4Change/web-of-trust/commit/2c626b1ce5f2a5734f129a095dde40c5d75ddfd1))
* **yjs:** alle state.info.members-Iterationen defensiv (undefined members wirft nie mehr not-iterable) ([35003e3](https://github.com/IT4Change/web-of-trust/commit/35003e3862a6d3a754517dcb8353fd8cc7f051e4))
* **yjs:** catch up spaces on already-connected start ([4133e7b](https://github.com/IT4Change/web-of-trust/commit/4133e7b1c92fab3d8d406cb4ed64433cd3b514bf))
* **yjs:** catch up spaces restored after connect ([f321e98](https://github.com/IT4Change/web-of-trust/commit/f321e989790d892d290933d1817faadc4e6b9e7c))
* **yjs:** defer restore catch-up until start is ready ([bcd1b59](https://github.com/IT4Change/web-of-trust/commit/bcd1b59f5f9efa8d754a3110c17edd276051006b))
* **yjs:** isolate late space catch-up sessions ([ebb44c4](https://github.com/IT4Change/web-of-trust/commit/ebb44c40e919f9b6a66f803c7526ac6083aa839f))
* **yjs:** make membership cleanup durable and serialized ([4b46113](https://github.com/IT4Change/web-of-trust/commit/4b4611386f560801e481cc248bbbfc789c200087))
* **yjs:** malformte Space-Metadata (undefined members/admins) blockiert Restore/Unlock nicht mehr ([72121a3](https://github.com/IT4Change/web-of-trust/commit/72121a30a0c48b0d6cb42cfaf4836e7da5a78103))
* **yjs:** malformter Space-Metadata-Record blockiert Unlock nicht mehr  per-Space try/catch skippt+loggt statt Restore abzubrechen ([76c9546](https://github.com/IT4Change/web-of-trust/commit/76c954668ade39175068de1a91e319ed100aec40))
* **yjs:** notify listeners after unobserved catch-up ([d3e4d24](https://github.com/IT4Change/web-of-trust/commit/d3e4d24142ef38c7bd1b69ddf7681f54c4b0adb8))
* **yjs:** retain capability catch-up retry markers ([6c6fd52](https://github.com/IT4Change/web-of-trust/commit/6c6fd521e682c028b0d156695934a905ad9c1a94))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @web_of_trust/core bumped to 0.6.0
  * peerDependencies
    * @web_of_trust/core bumped to 0.6.0
</details>

<details><summary>core: 0.6.0</summary>

## [0.6.0](https://github.com/IT4Change/web-of-trust/compare/core-v0.5.6...core-v0.6.0) (2026-08-18)


###   BREAKING CHANGES

* **crypto:** CryptoAdapter.exportKeyPair wurde entfernt. Private Schluessel werden non-extractable gehalten, es gibt daher keinen unterstuetzten Weg mehr, rohes privates Schluesselmaterial aus dem Adapter herauszureichen. Es gibt keinen direkten Ersatz. Wer ein Schluesselpaar wiederherstellen muss, leitet es mit deriveKeyPairFromSeed deterministisch aus dem Seed ab, statt es zu exportieren und wieder einzuspielen. importKeyPair bleibt fuer den Import vorhandenen Materials erhalten.

### Features

* **1b3:** [#102](https://github.com/IT4Change/web-of-trust/issues/102)-Vektoren in wot-core ziehen + ProtocolInterop-Stil-Tests (Step 1) ([fc7d906](https://github.com/IT4Change/web-of-trust/commit/fc7d906cf5a4be4eab9f787b4bfd681d27f4eb96))
* **1b3:** demo publish-split + recovery-workflow wiring (Step 6) ([1d342b9](https://github.com/IT4Change/web-of-trust/commit/1d342b9e0823eb1f7c60298f93210bcd529f2564))
* **1b3:** discovery-recovery + discovery-attestations  /a+/v Compact-JWS ListResource, Rollback, Server-Monotonie, Recovery-Workflow ([c9fa7d3](https://github.com/IT4Change/web-of-trust/commit/c9fa7d34ba6a375c288f16d439e0ae7642d482b8))
* **1b3:** HttpDiscoveryAdapter compact-JWS ListResource wire + 409-retry (Step 3) ([119c4dc](https://github.com/IT4Change/web-of-trust/commit/119c4dc4534450eb937435270baf46d18b73092b))
* **1b3:** MembershipEvent-Set + resolveActiveMembers + Resolution-Workflow (Step 1) ([f867c00](https://github.com/IT4Change/web-of-trust/commit/f867c007e298f4a8c3379556fc9c6d786ae43c5d))
* **1b3:** OfflineFirst verifications-dirty + wot-profiles server-monotonicity (Step 4) ([72d1f3c](https://github.com/IT4Change/web-of-trust/commit/72d1f3cf86ddc612348cdfc5ea059cb7ff632969))
* **1b3:** ports + version-cache + graph-cache + type-marker (Step 2) ([921f9dd](https://github.com/IT4Change/web-of-trust/commit/921f9ddafb0dff6fa52ae0363bc74c5ffb78c10a))
* **1b3:** profile-recovery-workflow consumes classify-guard (Step 5) ([c3b3ac5](https://github.com/IT4Change/web-of-trust/commit/c3b3ac5017b65eeb04ba308711a0d5be0394e877))
* **1b3:** Yjs _members-Event-Set + createdBy, Backfill tot (Step 2) ([969456c](https://github.com/IT4Change/web-of-trust/commit/969456c46d120ccb5a52cc955f72acc6d08b46c0))
* **adapters:** SpaceHandle.transactDurable  transaction-bound durability ack ([55a758e](https://github.com/IT4Change/web-of-trust/commit/55a758ecfb24859c65ea2cfb2e66ad77aa1af180))
* **adapters:** SpaceHandle.transactDurable  transaction-bound durability ack ([fc71e42](https://github.com/IT4Change/web-of-trust/commit/fc71e4274fc7a0e08a46a3b15153569fe7cf7794))
* add yjs membership activity capability ([7609e82](https://github.com/IT4Change/web-of-trust/commit/7609e8250674197d66a40fd5a6c136065a9f9494))
* **automerge+core:** convert Automerge adapter onto the shared log path + VE-9 UUID-docId (Slice A Phase 4) ([ae6803b](https://github.com/IT4Change/web-of-trust/commit/ae6803bd8c7e8746251a2efc3be2aadd294f8e91))
* **core,adapters,demo:** Durable Wiring  completion gate (headline e2e + reload-decrypt + onSecurityError) ([4e5774d](https://github.com/IT4Change/web-of-trust/commit/4e5774df38a07c90fe10f6f0f208a3bc164c76b4))
* **core,adapters:** catch-up completeness  pagination loop + seq-gap handling (Slice B) ([d022e57](https://github.com/IT4Change/web-of-trust/commit/d022e57537f8c1d455253357604da3a33800cdaa))
* **core,adapters:** Durable Wiring Phase 1  N2 partial-store guards + E1 propagation + sendControlFrame passthrough ([da4e2b4](https://github.com/IT4Change/web-of-trust/commit/da4e2b42d90841c2808ae2b05dd60cb50af47aa6))
* **core,adapters:** Durable Wiring Phase 2b  VE-11 restore-clone rebind + Trigger-1/2 split ([7c5e719](https://github.com/IT4Change/web-of-trust/commit/7c5e719a75bea7f7f7fc1f05cc0e1d2d63e9ac6e))
* **core,adapters:** two-phase broker-enforced secure removal (Slice SR VE-C1/VE-C3) ([6a2c4cd](https://github.com/IT4Change/web-of-trust/commit/6a2c4cdf02275a1831529bfbf45e02aa0294a4c8))
* **core,relay,adapters:** KEY_GENERATION_STALE re-emit for the legitimate lagger (Slice SR VE-C2) ([2e9c150](https://github.com/IT4Change/web-of-trust/commit/2e9c15041109f52d232dbc71d9f09223dabe9099))
* **core+adapter-yjs:** appData  erweiterbare App-Metadaten im Space-_meta ([009eac6](https://github.com/IT4Change/web-of-trust/commit/009eac67713ec4b428e7c41530ef3de1aac56550))
* **core:** add attestation-receipt inbox body discriminator ([7dfbe9f](https://github.com/IT4Change/web-of-trust/commit/7dfbe9f848248a7c40ee31d62c42038c027afa56))
* **core:** durable DocLogStore with crash-safe seq + cross-tab atomicity (Slice A VE-1) ([b0c02c7](https://github.com/IT4Change/web-of-trust/commit/b0c02c7a77bbd4a780b63ec514aded34d1eaa33a))
* **core:** durable PendingRemoval staging store for two-phase secure removal (Slice SR VE-S0) ([2ff90a8](https://github.com/IT4Change/web-of-trust/commit/2ff90a8e2909bc0817b8ba37e859b4bcf7a18a1b))
* **core:** Durable Wiring Phase 2a  durable KeyManagement/MemberUpdate/MessageIdHistory stores ([d13a70b](https://github.com/IT4Change/web-of-trust/commit/d13a70bc66c3d00e39478fcdcd72da90ead089f4))
* **core:** I-CAP  content-bound capability import on the duplicate key-rotation path (multi-device write after rotation) ([2d570e6](https://github.com/IT4Change/web-of-trust/commit/2d570e6c1b700c646e840f220467fea5458180ba))
* **core:** inner-JWS broker management frames + space-register + personal-doc capability (Slice CG Phase 1) ([f7fd9c2](https://github.com/IT4Change/web-of-trust/commit/f7fd9c2231bfa37008ba6f3c6007fe6e95891be2))
* **demo,adapters:** generischer Dialog-Lifecycle multi-device (synced dismissedNotifications) ([a1ef3d8](https://github.com/IT4Change/web-of-trust/commit/a1ef3d87b2da52ee24ffde8e89c3de0ae072b2cd))
* **demo:** Zwei-Häkchen-Zustellstatus für Attestationen (persistent) ([e4f42f4](https://github.com/IT4Change/web-of-trust/commit/e4f42f4aea0d5b5a5fbbeda41475ea1812070a2a))
* **discovery:** FallbackDiscoveryAdapter + per-target caches (Stage A.2) ([d0021d7](https://github.com/IT4Change/web-of-trust/commit/d0021d734cffc0001614600ecba6bf35564fbbf5))
* **discovery:** Stage A.2  Discovery-Dual + Relay-Sichtbarkeit ([d55a51d](https://github.com/IT4Change/web-of-trust/commit/d55a51df28d69af8ff918419414a071602fbf9e8))
* **relay:** capability-gate + full-rotation + author-binding (Slice CG, WIP) ([f463e5b](https://github.com/IT4Change/web-of-trust/commit/f463e5bb402902d3bf926a05e745f5c266dc2fdf))
* **relay:** ingest generation-gate + relay whitelist for secure removal (Slice SR VE-R1/VE-R2) ([55c280f](https://github.com/IT4Change/web-of-trust/commit/55c280f55e18138d0436db80996c520525adb5cc))
* **relay:** space-register control-frame + durable space registry (Slice CG Phase 3, VE-3) ([166fcf6](https://github.com/IT4Change/web-of-trust/commit/166fcf6c901b05d0b0e3d85a6937802907e10b10))
* **spaces:** echte Admin-Liste im synced Doc  1.B.3-admin-management ([5ade33c](https://github.com/IT4Change/web-of-trust/commit/5ade33c77fc5c7a549d4237c99d542e92b00042a))
* **spaces:** echte Admin-Liste im synced Doc  1.B.3-admin-management ([bff37c2](https://github.com/IT4Change/web-of-trust/commit/bff37c2ce2659472a68fefdba3b34de3dee715cc))
* **sync:** Catch-up-Zustand beobachtbar machen ([1704181](https://github.com/IT4Change/web-of-trust/commit/1704181392ed7adab617a2eda6493c28600123a7))
* **sync:** Catch-up-Zustand beobachtbar machen ([29ab1ed](https://github.com/IT4Change/web-of-trust/commit/29ab1ed310048797b159a18170c4a4d4478c3b0b))
* **sync:** deterministic-genesis private space (core + adapters) ([7d4d97d](https://github.com/IT4Change/web-of-trust/commit/7d4d97dd731f7f693099d9e1e44176f6270e6a80))
* **sync:** deterministic-genesis private space (core + adapters)  PR 1/2 ([9d2da66](https://github.com/IT4Change/web-of-trust/commit/9d2da665e1ccacb1483f47ac57702500ccb96006))
* **sync:** dual-broker Stage A  camp handshakes work anywhere (Sync 003 Multi-Broker) ([a6fa2cc](https://github.com/IT4Change/web-of-trust/commit/a6fa2ccee39af0b42116ae307243c1ae42605b60))
* **sync:** Dual-Broker Stufe A  Camp-Handshakes funktionieren überall ([6822f0b](https://github.com/IT4Change/web-of-trust/commit/6822f0b2ff79fa7e42a23296a227462e4fa1126c))
* **sync:** GENERATION_GAP + Historical-Retry nach Spec R5/R6 ([0bb62d6](https://github.com/IT4Change/web-of-trust/commit/0bb62d632dbcbfab151ad59cc547a2cf0806000b))
* **sync:** P0b  MembershipActivityCapable + membershipRemovals (Membership-Schnitt) ([c161b7c](https://github.com/IT4Change/web-of-trust/commit/c161b7cd7e6882f35d72b9cbda4b3794c76f4647))
* **verification:** aktive QR-Challenge überlebt Reload via StateStore (Entscheidung 1c) ([cc6240c](https://github.com/IT4Change/web-of-trust/commit/cc6240c0dfba0b1fe25bab0b6bb352f32472ebe4))
* **verification:** aktive QR-Challenge überlebt Reload via StateStore (Entscheidung 1c) ([fdae5c2](https://github.com/IT4Change/web-of-trust/commit/fdae5c2a5886de4f2e7f39b35eb998b7fba6776b))
* **yjs+core:** blocked-by-key replay, restore-clone, personal-doc log sync, content-off, space-rotate (Slice A VE-5/6/7/10) ([556037d](https://github.com/IT4Change/web-of-trust/commit/556037dfea2de734893dcbbdf9f5737b8885699c))
* **yjs+core:** rewire Yjs content sync onto Sync-002 log-entry path (Slice A VE-2/3/4/8/9) ([9bd7ae0](https://github.com/IT4Change/web-of-trust/commit/9bd7ae0e5b203e82e82f1dd35613c33f86ee9c71))


### Bug Fixes

* **1b3:** address CodeRabbit + Copilot review (defensive copies, overflow guards, test hardening) ([edd7955](https://github.com/IT4Change/web-of-trust/commit/edd795581a6aef1a66fd8e81cf3a71851fdb6e31))
* **1b3:** createdBy in wot-core AutomergeSpaceMetadataStorage persistieren (VE-2-Nachzug) ([3f41cd0](https://github.com/IT4Change/web-of-trust/commit/3f41cd02a96880691491ed1f6a7f685393746480))
* **1b3:** demo classifies verifications by WotVerification type, not claim text (review MAJOR 2) ([f45f34f](https://github.com/IT4Change/web-of-trust/commit/f45f34fc1f3a2f9770d802372e4333549a5ff8f4))
* **1b3:** idempotency fast-path enforces rollback; cached /v keeps isVerification (Codex re-review [#198](https://github.com/IT4Change/web-of-trust/issues/198)) ([f9ea764](https://github.com/IT4Change/web-of-trust/commit/f9ea764b6132ae813d3df0ac053ebd625fa85a43))
* **1b3:** membership-event generation auf safe integers begrenzt (Codex-Re-Review) ([77f1683](https://github.com/IT4Change/web-of-trust/commit/77f1683559fc66d91c20544c952a2810b69c1b4d))
* **1b3:** re-derive isVerification from stored vcJws on storage read (review BLOCKER) ([6f3420f](https://github.com/IT4Change/web-of-trust/commit/6f3420ff44004ca8c1a57f6825c83ef5cafb8e84))
* **1b3:** resolution auch nach savePending + restore (Sync 005 Z.194, Review-M1) ([ccd8354](https://github.com/IT4Change/web-of-trust/commit/ccd83549a2562005295490ef2aafd737008082cc))
* **1b3:** review-nacharbeiten (Befund-Pin-Header, Drop-Logzeile, members[0]-Kommentare, Test-Flake-Härtung) ([54142e4](https://github.com/IT4Change/web-of-trust/commit/54142e48502ad24bfa0ce1f1027d2609c0409449))
* abgelehnter admin-remove ist korrelierbar und wird nicht als Rotations-Fehler gemeldet ([06c9c70](https://github.com/IT4Change/web-of-trust/commit/06c9c708226b91f676cf409ed7c891ef209bc1b1))
* abgelehnter admin-remove ist korrelierbar und wird nicht als Rotations-Fehler gemeldet ([3983a89](https://github.com/IT4Change/web-of-trust/commit/3983a89ea69b78bf91fe3b0e94a7f19b405c2f14))
* **adapters:** guard member-removal under enableLogSync as unsupported; remove half-built VE-10 broker-enforcement (Slice A) ([45771f1](https://github.com/IT4Change/web-of-trust/commit/45771f1928d851b005436480d858fba96df8f674))
* **adapters:** put the creation flight under a lifecycle lease ([de5a45a](https://github.com/IT4Change/web-of-trust/commit/de5a45a670a31681c3be0026b8657b82c19ce383))
* **adapters:** transactDurable fails closed on missing key; Automerge frees localChanging during the async append ([87a74f3](https://github.com/IT4Change/web-of-trust/commit/87a74f3cbca119aa76d0d1a223d3a154cff06d9e))
* admin-remove/admin-add in den controlFrameDocId-Katalog  der Self-Leave-Frame verliess das Geraet nie ([3b35291](https://github.com/IT4Change/web-of-trust/commit/3b3529196ba6dd8a9e30cd445346d353285d4025))
* **attestation:** bind receipt-ack to the original recipient + harden discriminator ([99afbaa](https://github.com/IT4Change/web-of-trust/commit/99afbaafd0ff685749a05bc039889dcc239d8de3))
* chain capability catch-up after coalescing ([14e93cb](https://github.com/IT4Change/web-of-trust/commit/14e93cb262ff8f68ab144b7a9bc063d1073d3831))
* **ci:** testTimeout 20s für wot-core + demo  runWithTimeout-Flake-Familie ([#277](https://github.com/IT4Change/web-of-trust/issues/277)) ([593a973](https://github.com/IT4Change/web-of-trust/commit/593a97331fa38f317e6b11860eb9207965c8d120))
* converge secure removal recovery ([0d13b4d](https://github.com/IT4Change/web-of-trust/commit/0d13b4d9df626962b6d6d0561de30191cfbb1673))
* **core,adapters,test:** address loop-review (codex-gpt-5 + CodeRabbit) on PR [#214](https://github.com/IT4Change/web-of-trust/issues/214) ([50b4fd5](https://github.com/IT4Change/web-of-trust/commit/50b4fd5d341614d97767aa616ee66b5aed4380e7))
* **core,adapters:** Slice B v3  close the multi-page-tail data-loss + 2 majors (3rd dual-review) ([0d64607](https://github.com/IT4Change/web-of-trust/commit/0d646072013ad44f75f72b24195de13538a2898f))
* **core,relay,adapters:** close 3 safety blockers + broker-url check from loop-review (Slice SR-3) ([0f25188](https://github.com/IT4Change/web-of-trust/commit/0f2518863f21dbbf924cb42aec497feabee80df7))
* **core,relay,adapters:** close the 3 CodeRabbit Non-Security findings + minors (Slice SR-4) ([91bce7f](https://github.com/IT4Change/web-of-trust/commit/91bce7f1391990b68cd32a247cc7e948bf7d4223))
* **core+adapter-yjs:** Delete-Persistenz  Scheduler-Heads deletion-fest, Restore-Guard auf Doc-Load ([f373b94](https://github.com/IT4Change/web-of-trust/commit/f373b944417a6adca90834e4e5bf906c5748ceb3))
* **core+adapters:** close AES-GCM nonce-reuse blocker + churn/liveness concerns from dual review (Slice A) ([f71d2bd](https://github.com/IT4Change/web-of-trust/commit/f71d2bd306a04d27cd09a54902d5f0ab28877696))
* **core+adapters:** enforce member-removal at the broker via durable retriable space-rotate (Slice A VE-10 blocker) ([3cf4ee9](https://github.com/IT4Change/web-of-trust/commit/3cf4ee920df721b044ec612bd005cc7e126f5b1c))
* **core:** Durable Wiring Phase 2b  VE-11 review fixes (write-pause race, rebind rollback, security surface) ([8abe92f](https://github.com/IT4Change/web-of-trust/commit/8abe92faaa9ce0e8ca1a3bb8b5c3f3f11a7447fe))
* **core:** keep the published ports subpath shipping the capability guards ([caf2df4](https://github.com/IT4Change/web-of-trust/commit/caf2df446c566348fbea9b8c53d587dd1b9625b2))
* **core:** move PERSONAL_DOC_OWNER_MISMATCH into the client broker-error catalog (A2 Teil B) ([5577056](https://github.com/IT4Change/web-of-trust/commit/5577056f791a7ea297b7010c24ac2ba20bceb697))
* **core:** Personal-Doc-Metadata-Cache persistiert appData im Round-trip ([83899a1](https://github.com/IT4Change/web-of-trust/commit/83899a19f004d8fc5049215f872b0079571367e0))
* **core:** propagate in-flight catch-up failure into a coalescing ensurePublished (loop-review [#2](https://github.com/IT4Change/web-of-trust/issues/2) blocker) ([5a2773c](https://github.com/IT4Change/web-of-trust/commit/5a2773c159661f3b8bbe992e56a9e5569503fc12))
* **core:** retain unverified removal pending provenance ([5c3757e](https://github.com/IT4Change/web-of-trust/commit/5c3757ee368ca75af2d7a7b37e461cd6b6f8d3ab))
* **core:** route write-path error frames to the coordinator over real WS (Slice SR P5.5) ([c1d8520](https://github.com/IT4Change/web-of-trust/commit/c1d852055b34f6daefdb645b48721426e166ab60))
* **core:** single-flight ensureDb so concurrent first ops can't orphan a vault connection ([5e179ff](https://github.com/IT4Change/web-of-trust/commit/5e179ff0636c2b6713a97768582b615ff0ca6371))
* **core:** Slice B v3  close STACKED permanent-gaps + the unsolicited page-boundary false-positive (3rd dual-review) ([e1edb99](https://github.com/IT4Change/web-of-trust/commit/e1edb99620ee76379ad77e2cc45d56d636cc09cb))
* **core:** Space-Metadata-Storage spreadet info.members defensiv (undefined blockiert Unlock/Restore nicht mehr) ([bbf9040](https://github.com/IT4Change/web-of-trust/commit/bbf904097e9216019b2e3a1b64b05b8cefb96a77))
* **crypto:** X25519-Public-Key ohne Private-Key-Export ableiten ([d21cbe8](https://github.com/IT4Change/web-of-trust/commit/d21cbe8592e486533a8b0648b8806dd87b024963))
* **crypto:** X25519-Public-Key ohne Private-Key-Export ableiten ([36de563](https://github.com/IT4Change/web-of-trust/commit/36de5637cbb80d78179d473b70bc84893112ef03))
* **debug:** anchor metrics/trace singletons on globalThis ([#237](https://github.com/IT4Change/web-of-trust/issues/237)) ([f4cb02b](https://github.com/IT4Change/web-of-trust/commit/f4cb02be28a81342267c80b9102f564494553556))
* **debug:** Panel zeigt echten Relay-Status  Singleton überlebt Chunk-Duplikation ([#237](https://github.com/IT4Change/web-of-trust/issues/237)) ([696b64a](https://github.com/IT4Change/web-of-trust/commit/696b64afc7bb9fdfbe273fccc75d40fe6db228f4))
* defer reseed capability generation ([a9db57d](https://github.com/IT4Change/web-of-trust/commit/a9db57d2a53fb02efbc25f6a432d0314ed825269))
* **demo:** complete the seed-vault wipe so logout/delete redirects (Cluster B) ([a180fdf](https://github.com/IT4Change/web-of-trust/commit/a180fdfddb92f0cb8d72f488c31470613b6cb044))
* **discovery:** CodeRabbit-Findings  Multi-Key-Scan + flaky Test ([17826b3](https://github.com/IT4Change/web-of-trust/commit/17826b309b7e3c648a0fbaf1143eb5b279df9c55))
* **discovery:** offline keyAgreement-Key-Cache fuer ECIES-Zustellung ([31bed10](https://github.com/IT4Change/web-of-trust/commit/31bed10ca72235d5bb9b2687b4e7e7863717c67b))
* **discovery:** offline keyAgreement-Key-Cache für ECIES-Zustellung ([e11256a](https://github.com/IT4Change/web-of-trust/commit/e11256a6d7900160cf67ff8d1f8d61533848f49b))
* **discovery:** rollback error is security-final  never masked by fallback ([3202a00](https://github.com/IT4Change/web-of-trust/commit/3202a00afce02f0a0e1d9d1a55861744ccfad8fa))
* enforce durable self-leave removal flow ([79045c1](https://github.com/IT4Change/web-of-trust/commit/79045c1123db857199e7bc044abcbfea51c62ae9))
* gate secure self-leave by durable capabilities ([f5a67c8](https://github.com/IT4Change/web-of-trust/commit/f5a67c8f16aa10979e888158edef881716cf6793))
* **inbox-wire:** M-D future-bound auf created_time (Pflichtprüfung 4) ([d4f1ff2](https://github.com/IT4Change/web-of-trust/commit/d4f1ff2b59aa8748157830d66e349a5e812ac9a7))
* **inbox-wire:** message-id-history erst bei konklusiver Verarbeitung (Sync 003 Z.466) ([e92ecb4](https://github.com/IT4Change/web-of-trust/commit/e92ecb4b5d399d029406dadde8ec9cce2a72022a))
* **inbox-wire:** receiveInboxMessage gated auf normative Inbox-Type-URIs ([da75228](https://github.com/IT4Change/web-of-trust/commit/da752283cc96ebcb5fb8c9011351a47c5f8b16a4))
* **inbox-wire:** review-nacharbeiten (stale kommentare, VE-6-doku, space-invite-klassifikation, outbox-typen) ([d99d794](https://github.com/IT4Change/web-of-trust/commit/d99d7940770e57d1c0f5a7442b0658de5b0413f9))
* **inbox:** konkreten Prüf-Fehler bei invalid-inner-jws-Reject durchreichen ([35ef0fb](https://github.com/IT4Change/web-of-trust/commit/35ef0fbb0ad077dfce4d5349d9954c045e2bf61c))
* **inbox:** konkreten Prüf-Fehler bei invalid-inner-jws-Reject durchreichen ([2f819c6](https://github.com/IT4Change/web-of-trust/commit/2f819c67033dba2c64b5d86c19d3c4c5abaf27ca))
* **publish:** Repository-URL auf real-life-org, npm-view-Auswertung korrigieren ([cdb2bcc](https://github.com/IT4Change/web-of-trust/commit/cdb2bcca0c72dc729a520e9e05d91565843c8e7b))
* Review-Majors  INTERNAL_ERROR mit thid, admin-change-eigene Hard-Reject-Klassifikation ([b6e98bf](https://github.com/IT4Change/web-of-trust/commit/b6e98bfb712bf0ca2fa214055e71a811ba547e5f))
* **sync:** Abschluss eines Catch-ups auch ohne Konfigurations-Hook melden ([864652c](https://github.com/IT4Change/web-of-trust/commit/864652c1e9c4d43a96eae8a7535e20c2e1e480ae))
* **sync:** Abschluss eines Catch-ups auch ohne Konfigurations-Hook melden ([c25dd45](https://github.com/IT4Change/web-of-trust/commit/c25dd45ea08c8e7a83d753dd801a5aa1a186c5dd))
* **sync:** bind space rotation retries to key material ([a35748d](https://github.com/IT4Change/web-of-trust/commit/a35748dae1797eeee201b7b44ccd8a302573b1ac))
* **sync:** bot-review round  empty vaultUrl guard, per-field getDocInfo merge, carrying-broker metrics URL, monitor XSS escape ([1ff898b](https://github.com/IT4Change/web-of-trust/commit/1ff898bb91f77716fc695bc57a610ca9e728f493))
* **sync:** Catch-up-Guard nur vom eigenen Lauf freigeben; Epochentest deterministisch ([4a481f4](https://github.com/IT4Change/web-of-trust/commit/4a481f4c6c34f09750f7781ab8f4a2020962b046))
* **sync:** dual-broker review round 1  connect idempotency, hung-dial reset, receipt aggregation, vault snapshot freshness ([269c58e](https://github.com/IT4Change/web-of-trust/commit/269c58ef35034d9831d1be76cb0f3c9946e5b255))
* **sync:** Eine Retry-Autorität für Log-Sync-Envelopes  Outbox-Orphans + Hard-Stop-Loop ([#236](https://github.com/IT4Change/web-of-trust/issues/236)) ([5396261](https://github.com/IT4Change/web-of-trust/commit/53962619f67e6165f4d3cf4140841fb49b5987c0))
* **sync:** late-registered guard after teardown + model-reference comment (review round 2) ([87c1ac0](https://github.com/IT4Change/web-of-trust/commit/87c1ac0fde1481db2dcd2fef04dbadd8bed688fd))
* **sync:** Lifecycle-Besitz, Meldereihenfolge und der First-Publication-Pfad ([5a228b0](https://github.com/IT4Change/web-of-trust/commit/5a228b0bed2a0eb3173bb4582afad85929b07ec4))
* **sync:** make generation gap recovery broker-authoritative ([1db6150](https://github.com/IT4Change/web-of-trust/commit/1db6150f49ec6e774393a8333668aad08d09c9ce))
* **sync:** Meldequelle über Neustart und Aufbau-Wettläufe hinweg gültig halten ([3bfdc0c](https://github.com/IT4Change/web-of-trust/commit/3bfdc0cea6f25b8410fb6fb544e1e5e09590d5fb))
* **sync:** Meldezähler an die Verbindungsepoche binden ([5686bd7](https://github.com/IT4Change/web-of-trust/commit/5686bd7a7637ffe98de39fe147fec3124681b888))
* **sync:** persist+restore capability signing seed so a recovered device can write ([#234](https://github.com/IT4Change/web-of-trust/issues/234)) ([239bbd0](https://github.com/IT4Change/web-of-trust/commit/239bbd0a2b39fbf645c4cc50c59738f4b54c8d84))
* **sync:** Publikationszustand dem eigenen Lauf zuordnen; Test über Barrieren steuern ([26b17fd](https://github.com/IT4Change/web-of-trust/commit/26b17fd47c4ab79a59d7b908d846ff7317bfa0ce))
* **sync:** recover generation gaps and revoke self admin ([25a4dac](https://github.com/IT4Change/web-of-trust/commit/25a4dac66e27a98e08256c7bad7b254597be91ac))
* **sync:** recovered device can write to existing spaces  persist+restore capability signing seed ([#234](https://github.com/IT4Change/web-of-trust/issues/234)) ([2abc70c](https://github.com/IT4Change/web-of-trust/commit/2abc70c40451fc5ea160d0267aaa6069af903e46))
* **sync:** Reseed  Capability-Praesentation deferrt bei fehlenden Keys statt zu crashen ([21a8223](https://github.com/IT4Change/web-of-trust/commit/21a8223d42eae3baf92c3390434069cbfd6cc07f))
* **sync:** resolve multi-device self-leave ([0e29e41](https://github.com/IT4Change/web-of-trust/commit/0e29e413637900d40527ebbd77cd7467122374e8))
* **sync:** Self-Leave-Preflight im Core-Workflow vor jeder Staging-/Broker-Wirkung ([6b6caea](https://github.com/IT4Change/web-of-trust/commit/6b6caea56463dbde31d9bd6e5775b3db877e2f8e))
* **sync:** single retry authority for log-sync envelopes ([#236](https://github.com/IT4Change/web-of-trust/issues/236)) ([ee69f2a](https://github.com/IT4Change/web-of-trust/commit/ee69f2a5197209d9a299292b179c47f5cf9d8e90))
* **sync:** socket-instance-safe WebSocket handlers (re-review blocker) ([c8a4607](https://github.com/IT4Change/web-of-trust/commit/c8a46074c0d6302f817e967bccdd87564a8e084f))
* **sync:** support non-admin self leave ([63dd3ed](https://github.com/IT4Change/web-of-trust/commit/63dd3eddb28802ce9c7b4bd5341bbd62cddc5bb8))
* **sync:** trace a failed write-path receipt as failure ([#236](https://github.com/IT4Change/web-of-trust/issues/236) review NIT) ([c08fea9](https://github.com/IT4Change/web-of-trust/commit/c08fea923e159a5341e11f4d35c3fec80ac33c56))
* **sync:** vault seq-space consistency (loop-review blocker) ([e2a3afc](https://github.com/IT4Change/web-of-trust/commit/e2a3afcce3063a4be2b31689fb54a87e709ebd01))
* **trust:** Clock-Skew-Toleranz für den Attestation-VC-Zeitgate (Camp-Blocker) ([b028493](https://github.com/IT4Change/web-of-trust/commit/b0284939bc13c874744fcfcbf5516086d7596948))
* **trust:** fail closed on invalid maxClockSkewMs and pin the exp boundary ([cb69d13](https://github.com/IT4Change/web-of-trust/commit/cb69d137c0133ea88eddc22e290b2fc9842d9501))
* **trust:** give attestation VC nbf/exp gate 5min clock-skew tolerance ([108aac8](https://github.com/IT4Change/web-of-trust/commit/108aac840e01c10edc70f7d6435552627566594e))
* **vault:** bound every VaultClient fetch with an AbortController timeout ([46b2f4e](https://github.com/IT4Change/web-of-trust/commit/46b2f4e9c45032e319aef06dfd79d1c0af3d3e5c))
* **vault:** VaultClient-fetch-Timeout  kappt den 5G-Startup-Hang (ohne Init-Umbau) ([29ca509](https://github.com/IT4Change/web-of-trust/commit/29ca5095b682c45a2ee4e34bbf9e58d0d00bfdb5))
* **verification:** erfolgreicher Accept rückt die Challenge-Epoche vor ([043c3c0](https://github.com/IT4Change/web-of-trust/commit/043c3c036d252c16497ffb988ab278b2669908e3))
* **verification:** Re-Review [#339](https://github.com/IT4Change/web-of-trust/issues/339)  compare-and-delete per Nonce, Persist-Fehler laut, Restore fehlertolerant ([db9d8af](https://github.com/IT4Change/web-of-trust/commit/db9d8afe9919db3539288f704c9d7c6d273c0a25))
* **verification:** Re-Review [#339](https://github.com/IT4Change/web-of-trust/issues/339) (2. Runde)  blinder Reset löscht nichts, Flight-gebundener Create-Rollback ([9b54ba0](https://github.com/IT4Change/web-of-trust/commit/9b54ba00018b7aff2ceb860099b534ede0c3784a))
* **verification:** Re-Review [#339](https://github.com/IT4Change/web-of-trust/issues/339) (3. Runde)  Ownership-Guard auf den RAM-Mutationen ([ff3bb0a](https://github.com/IT4Change/web-of-trust/commit/ff3bb0a2bdd2e9505329d525bf372c906c20a77e))
* **verification:** Review [#339](https://github.com/IT4Change/web-of-trust/issues/339)  Challenge-Store-Operationen serialisiert, Accept clear-fehlertolerant ([6d56c0a](https://github.com/IT4Change/web-of-trust/commit/6d56c0a955436b7613a17c1536fa32317a3a51d1))
* **wot-core:** de-flake VE-B2 convergence tests  widen per-page wait under CI load ([39408e7](https://github.com/IT4Change/web-of-trust/commit/39408e74e8600f008c9c039885d1adeaa45fc5f9))
* **wot-core:** de-flake VE-B2 convergence tests under CI load ([08481c1](https://github.com/IT4Change/web-of-trust/commit/08481c107b65262ff3509758506d47723a7fa3f1))
* **wot-core:** toten Half-open-Socket im Heartbeat erkennen (B1) ([2ef8c45](https://github.com/IT4Change/web-of-trust/commit/2ef8c458623332e6efd50adc9fdc82d219e5bb36))
* **wot-core:** toten Half-open-Socket im Heartbeat erkennen (B1) ([adfb6cc](https://github.com/IT4Change/web-of-trust/commit/adfb6cc70412ea3c9571e06301939bdc3fd09d62))


### Code Refactoring

* **crypto:** private Schluessel non-extractable, exportKeyPair entfernt ([cfcd47b](https://github.com/IT4Change/web-of-trust/commit/cfcd47b5024901c21159a32d3c84f2fe9dc519e2))
</details>

<details><summary>profiles: 0.2.5</summary>

## [0.2.5](https://github.com/IT4Change/web-of-trust/compare/profiles-v0.2.4...profiles-v0.2.5) (2026-08-18)


### Features

* **1b3:** discovery-recovery + discovery-attestations  /a+/v Compact-JWS ListResource, Rollback, Server-Monotonie, Recovery-Workflow ([c9fa7d3](https://github.com/IT4Change/web-of-trust/commit/c9fa7d34ba6a375c288f16d439e0ae7642d482b8))
* **1b3:** OfflineFirst verifications-dirty + wot-profiles server-monotonicity (Step 4) ([72d1f3c](https://github.com/IT4Change/web-of-trust/commit/72d1f3cf86ddc612348cdfc5ea059cb7ff632969))


### Bug Fixes

* **1b3:** address CodeRabbit + Copilot review (defensive copies, overflow guards, test hardening) ([edd7955](https://github.com/IT4Change/web-of-trust/commit/edd795581a6aef1a66fd8e81cf3a71851fdb6e31))
* **1b3:** wot-profiles enforces mandatory integer version + always-on monotonicity (review MAJOR 1) ([7ae10c7](https://github.com/IT4Change/web-of-trust/commit/7ae10c74d6d3e0fc2a6db7bbcb10d9f0d0c9aea4))
* **docker:** relay+profiles bauen [@web](https://github.com/web)_of_trust/core aus dem Workspace ([76adf02](https://github.com/IT4Change/web-of-trust/commit/76adf0252078e8fcdacb92136e02c99751d05ac1))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @web_of_trust/core bumped to 0.6.0
</details>

<details><summary>relay: 0.1.9</summary>

## [0.1.9](https://github.com/IT4Change/web-of-trust/compare/relay-v0.1.8...relay-v0.1.9) (2026-08-18)


### Features

* **core,relay,adapters:** KEY_GENERATION_STALE re-emit for the legitimate lagger (Slice SR VE-C2) ([2e9c150](https://github.com/IT4Change/web-of-trust/commit/2e9c15041109f52d232dbc71d9f09223dabe9099))
* **e2e:** Spur-C remote-relay enablement + read-only relay stats (D1) ([12c9757](https://github.com/IT4Change/web-of-trust/commit/12c975781836800c4f2964039df5b3ef261d75ab))
* **relay:** A2 Teil B  Personal-Doc TOFU owner-binding + dashboard docId redaction ([5d18959](https://github.com/IT4Change/web-of-trust/commit/5d18959b43273da3923cb88453886169017cc8eb))
* **relay:** add always-public shortened `display` block to /dashboard/data ([252106b](https://github.com/IT4Change/web-of-trust/commit/252106b7a3a00e0066b2716afd406343373a08ff))
* **relay:** bind deviceId”authorKid first-writer-wins (Slice R VE-3a) ([413e1f3](https://github.com/IT4Change/web-of-trust/commit/413e1f36ef7ba66b872d375e8b104bc2b07c2c59))
* **relay:** capability gate  present-capability + scope cache + write/read gate (Slice CG Phase 4, VE-4/5/8) ([a3dcaf0](https://github.com/IT4Change/web-of-trust/commit/a3dcaf0fea408515b27d59898c69043d57df2648))
* **relay:** capability-gate + full-rotation + author-binding (Slice CG, WIP) ([f463e5b](https://github.com/IT4Change/web-of-trust/commit/f463e5bb402902d3bf926a05e745f5c266dc2fdf))
* **relay:** dashboard card explainers (i-buttons) + disk fill-level donut ([9e2232b](https://github.com/IT4Change/web-of-trust/commit/9e2232b9defa03b6da4a22c7ce718080191868a0))
* **relay:** durable append-only log store + sync-request catch-up (Slice R) ([ea6ee5f](https://github.com/IT4Change/web-of-trust/commit/ea6ee5f23dcda32ebe4e803f0d4dfd77517a3e98))
* **relay:** durable append-only log store + sync-request catch-up (Slice R) ([3b32b25](https://github.com/IT4Change/web-of-trust/commit/3b32b256d65048846332f95317cf0925455039c6))
* **relay:** durable device list + device-revoke + spec author-binding (Slice CG Phase 2, VE-1/2) ([543e2de](https://github.com/IT4Change/web-of-trust/commit/543e2de4994c4c7ffb9f669e63c8bb4adf50870e))
* **relay:** generisches Broker-Dashboard  schöne Oberfläche auf jedem Relay ([da58098](https://github.com/IT4Change/web-of-trust/commit/da58098ca864a7a5d0b3af397ce8f15b9286cdfb))
* **relay:** history graphs on the broker dashboard ([7e729ec](https://github.com/IT4Change/web-of-trust/commit/7e729eca2bf5736fe61e809e8e544ccc5a53f54d))
* **relay:** ingest generation-gate + relay whitelist for secure removal (Slice SR VE-R1/VE-R2) ([55c280f](https://github.com/IT4Change/web-of-trust/commit/55c280f55e18138d0436db80996c520525adb5cc))
* **relay:** metrics ring + host stats + /dashboard/metrics endpoint ([2a8e670](https://github.com/IT4Change/web-of-trust/commit/2a8e670e96c1d42fe365ee07dcdb42b9a29a758f))
* **relay:** Metriken-Ring + Pi-Host-Stats + Verlaufs-Graphen (stacked auf [#256](https://github.com/IT4Change/web-of-trust/issues/256)) ([ee9068a](https://github.com/IT4Change/web-of-trust/commit/ee9068a487192b42740beffd9ca333ef810cd771))
* **relay:** multi-device inbox store-and-forward (per-device ack, Sync 003 §Store-and-Forward) ([6b6fb21](https://github.com/IT4Change/web-of-trust/commit/6b6fb21141c4855b1e511e90140fc860fd56e01d))
* **relay:** rewrite /dashboard as a calm dark broker dashboard ([91dfa69](https://github.com/IT4Change/web-of-trust/commit/91dfa6912b71a13a5ffe2b9af6e62d00fd579ca7))
* **relay:** space-register control-frame + durable space registry (Slice CG Phase 3, VE-3) ([166fcf6](https://github.com/IT4Change/web-of-trust/commit/166fcf6c901b05d0b0e3d85a6937802907e10b10))
* **relay:** space-rotate + cross-socket cache invalidation + admin-add/remove (Slice CG Phase 5, VE-6/7) ([8618b98](https://github.com/IT4Change/web-of-trust/commit/8618b981f68613e1c83c31f407a7dcfc49a8d758))
* **sync:** GENERATION_GAP + Historical-Retry nach Spec R5/R6 ([0bb62d6](https://github.com/IT4Change/web-of-trust/commit/0bb62d632dbcbfab151ad59cc547a2cf0806000b))
* **sync:** P0b  MembershipActivityCapable + membershipRemovals (Membership-Schnitt) ([c161b7c](https://github.com/IT4Change/web-of-trust/commit/c161b7cd7e6882f35d72b9cbda4b3794c76f4647))


### Bug Fixes

* **1b3:** publish empty /v and /a on offline-retry; untrack tsbuildinfo (Codex review [#198](https://github.com/IT4Change/web-of-trust/issues/198)) ([6f33008](https://github.com/IT4Change/web-of-trust/commit/6f3300886bdf9f7225e928810f3278f2b6e29655))
* **1b3:** re-derive isVerification from stored vcJws on storage read (review BLOCKER) ([6f3420f](https://github.com/IT4Change/web-of-trust/commit/6f3420ff44004ca8c1a57f6825c83ef5cafb8e84))
* abgelehnter admin-remove ist korrelierbar und wird nicht als Rotations-Fehler gemeldet ([06c9c70](https://github.com/IT4Change/web-of-trust/commit/06c9c708226b91f676cf409ed7c891ef209bc1b1))
* abgelehnter admin-remove ist korrelierbar und wird nicht als Rotations-Fehler gemeldet ([3983a89](https://github.com/IT4Change/web-of-trust/commit/3983a89ea69b78bf91fe3b0e94a7f19b405c2f14))
* **core,relay,adapters:** close 3 safety blockers + broker-url check from loop-review (Slice SR-3) ([0f25188](https://github.com/IT4Change/web-of-trust/commit/0f2518863f21dbbf924cb42aec497feabee80df7))
* **core,relay,adapters:** close the 3 CodeRabbit Non-Security findings + minors (Slice SR-4) ([91bce7f](https://github.com/IT4Change/web-of-trust/commit/91bce7f1391990b68cd32a247cc7e948bf7d4223))
* **core,relay:** converge the legitimate lagger over real WS + route all write-path rejects (Slice SR-2, [#213](https://github.com/IT4Change/web-of-trust/issues/213)) ([4101225](https://github.com/IT4Change/web-of-trust/commit/41012259a8d73e373e969d1501d27d9385fb844d))
* **docker:** relay+profiles bauen [@web](https://github.com/web)_of_trust/core aus dem Workspace ([76adf02](https://github.com/IT4Change/web-of-trust/commit/76adf0252078e8fcdacb92136e02c99751d05ac1))
* **relay:** address inbox store-and-forward review findings (GC wiring, fan-out/completeness alignment, id-less key) ([6d3d552](https://github.com/IT4Change/web-of-trust/commit/6d3d55244e5f7374d771075df16d6021508688c9))
* **relay:** bind Personal’Space upgrade to the SIGNER, not adminDids membership ([9beef57](https://github.com/IT4Change/web-of-trust/commit/9beef571714e0a8e89ae27dd1732356d23f525c6))
* **relay:** close 3 authorization-boundary blockers + 2 should-fixes from codex rereview (Slice CG) ([588e941](https://github.com/IT4Change/web-of-trust/commit/588e9416d837ce233d4442469ce2c0733d8b2bb6))
* **relay:** close 3 review blockers  GC unreachable, revoked-sender inbox bypass, divergent messageId collision ([a2560ee](https://github.com/IT4Change/web-of-trust/commit/a2560eeeaff3faba465a8c45c1d73b25dd644b43))
* **relay:** control-frame-ACK respektiert DIDComm-ack-Ownership (Review-Blocker) ([f7094a4](https://github.com/IT4Change/web-of-trust/commit/f7094a4b1dcbea57a243e67e2528e1b089a1532e))
* **relay:** dashboard defaults to shortened display ids; full ids only flag-gated ([92daa07](https://github.com/IT4Change/web-of-trust/commit/92daa079ec7ec9cd7eb98f5bab1f505458d3b9d8))
* **relay:** drop redundant pre-build/test/typecheck hooks that raced turbo (CI green) ([3b5d8bd](https://github.com/IT4Change/web-of-trust/commit/3b5d8bd9ddf04dd00e76f8d869de782057b763f2))
* **relay:** gate sensitive /dashboard/data stats behind RELAY_DEBUG_STATS + review should-fixes ([9632ff2](https://github.com/IT4Change/web-of-trust/commit/9632ff2b963cb6377e2ca15d0ce55ea9a4324682))
* **relay:** keyed docId shortcuts (per-process salt) + SQL-limited display queries ([78fbd63](https://github.com/IT4Change/web-of-trust/commit/78fbd6326f8aa3fcbe0c7e8170c8aeb385957b7c))
* **relay:** payload-JCS content-hash + default sync-request limit 100 (Slice R) ([59dc0c4](https://github.com/IT4Change/web-of-trust/commit/59dc0c47af2667c59a7661cd9eef0fe83f377aa3))
* **relay:** Personal’Space-Upgrade an den SIGNER binden (Anti-Escalation härten) ([22ee815](https://github.com/IT4Change/web-of-trust/commit/22ee81526c56f78b86b1019e360c48cf73dee36e))
* **relay:** readable history-chart axes  zero baseline, nice ticks, real-pixel labels ([bbb7c04](https://github.com/IT4Change/web-of-trust/commit/bbb7c0484d1670eb89ca0166f67239c48a82ce85))
* **relay:** strictly monotonic metric bucket times + gap-preserving downsampling ([2ce03e3](https://github.com/IT4Change/web-of-trust/commit/2ce03e393179e26fdd570541b4946b82ca60836c))
* **relay:** use the WebView-safe timeout fallback in tickMetrics too ([d5edf31](https://github.com/IT4Change/web-of-trust/commit/d5edf31e831367bcbd25f52dbcb59393eba32de7))
* Review-Majors  INTERNAL_ERROR mit thid, admin-change-eigene Hard-Reject-Klassifikation ([b6e98bf](https://github.com/IT4Change/web-of-trust/commit/b6e98bfb712bf0ca2fa214055e71a811ba547e5f))
* **sync:** bind space rotation retries to key material ([a35748d](https://github.com/IT4Change/web-of-trust/commit/a35748dae1797eeee201b7b44ccd8a302573b1ac))
* **sync:** make generation gap recovery broker-authoritative ([1db6150](https://github.com/IT4Change/web-of-trust/commit/1db6150f49ec6e774393a8333668aad08d09c9ce))
* **sync:** recover generation gaps and revoke self admin ([25a4dac](https://github.com/IT4Change/web-of-trust/commit/25a4dac66e27a98e08256c7bad7b254597be91ac))
* **test:** bind port:0 + read bound port to remove free-port TOCTOU flake ([f512e10](https://github.com/IT4Change/web-of-trust/commit/f512e10534728d691ccef308ef5b7f06c83feb99))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @web_of_trust/core bumped to 0.6.0
</details>

<details><summary>vault: 0.1.8</summary>

## [0.1.8](https://github.com/IT4Change/web-of-trust/compare/vault-v0.1.7...vault-v0.1.8) (2026-08-18)


### Bug Fixes

* **1b3:** publish empty /v and /a on offline-retry; untrack tsbuildinfo (Codex review [#198](https://github.com/IT4Change/web-of-trust/issues/198)) ([6f33008](https://github.com/IT4Change/web-of-trust/commit/6f3300886bdf9f7225e928810f3278f2b6e29655))
* **1b3:** re-derive isVerification from stored vcJws on storage read (review BLOCKER) ([6f3420f](https://github.com/IT4Change/web-of-trust/commit/6f3420ff44004ca8c1a57f6825c83ef5cafb8e84))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @web_of_trust/core bumped to 0.6.0
</details>

<details><summary>app: 0.4.0</summary>

## [0.4.0](https://github.com/IT4Change/web-of-trust/compare/app-v0.3.4...app-v0.4.0) (2026-08-18)


###   BREAKING CHANGES

* **ci:** WoT flavorlos  build-on-tag baut APK (F-Droid) + AAB (Play)

### Features

* **1b3:** demo publish-split + recovery-workflow wiring (Step 6) ([1d342b9](https://github.com/IT4Change/web-of-trust/commit/1d342b9e0823eb1f7c60298f93210bcd529f2564))
* **1b3:** discovery-recovery + discovery-attestations  /a+/v Compact-JWS ListResource, Rollback, Server-Monotonie, Recovery-Workflow ([c9fa7d3](https://github.com/IT4Change/web-of-trust/commit/c9fa7d34ba6a375c288f16d439e0ae7642d482b8))
* **1b3:** OfflineFirst verifications-dirty + wot-profiles server-monotonicity (Step 4) ([72d1f3c](https://github.com/IT4Change/web-of-trust/commit/72d1f3cf86ddc612348cdfc5ea059cb7ff632969))
* **1b3:** ports + version-cache + graph-cache + type-marker (Step 2) ([921f9dd](https://github.com/IT4Change/web-of-trust/commit/921f9ddafb0dff6fa52ae0363bc74c5ffb78c10a))
* **1b3:** Yjs _members-Event-Set + createdBy, Backfill tot (Step 2) ([969456c](https://github.com/IT4Change/web-of-trust/commit/969456c46d120ccb5a52cc955f72acc6d08b46c0))
* **adapters:** I-READ "Key-available Ò replayBlockedByKey" on all key-available paths (Yjs + Automerge) ([3bae587](https://github.com/IT4Change/web-of-trust/commit/3bae587e1810bd649d793d348df9975e13fc687f))
* App-Releases über release-please (unified train) + volle Doku ([2ea1656](https://github.com/IT4Change/web-of-trust/commit/2ea1656030d559e96ea84731e2c1873c6370fe48))
* App-Releases über release-please (unified train) + volle Doku ([1286106](https://github.com/IT4Change/web-of-trust/commit/1286106bbf4603ccbf1b696ce9eea99c120695e1))
* **ci:** WoT flavorlos  build-on-tag baut APK (F-Droid) + AAB (Play) ([c744053](https://github.com/IT4Change/web-of-trust/commit/c7440534eaec8d5039bb46f935cf76772010a297))
* **core,adapters,demo:** Durable Wiring  completion gate (headline e2e + reload-decrypt + onSecurityError) ([4e5774d](https://github.com/IT4Change/web-of-trust/commit/4e5774df38a07c90fe10f6f0f208a3bc164c76b4))
* **core:** I-CAP  content-bound capability import on the duplicate key-rotation path (multi-device write after rotation) ([2d570e6](https://github.com/IT4Change/web-of-trust/commit/2d570e6c1b700c646e840f220467fea5458180ba))
* **demo,adapters:** generischer Dialog-Lifecycle multi-device (synced dismissedNotifications) ([a1ef3d8](https://github.com/IT4Change/web-of-trust/commit/a1ef3d87b2da52ee24ffde8e89c3de0ae072b2cd))
* **demo:** A2 Teil A  wire PersonalLogSyncAdapter onto the durable-log path [WIP: E2E hardening pending] ([e7aef1d](https://github.com/IT4Change/web-of-trust/commit/e7aef1db6eb9cc78ed79f46510b32bfac6686274))
* **demo:** app-wide connect FAB on mobile ([d8f4688](https://github.com/IT4Change/web-of-trust/commit/d8f4688ae0ca2c0ded1eb4aef452568f28833355))
* **demo:** Consent-Modell  Veröffentlichen im Verbunden-Dialog statt Silent-Auto-Accept ([8a56881](https://github.com/IT4Change/web-of-trust/commit/8a568819f1a748cb2490d748dd72e84409d1a9c0))
* **demo:** D2  gated in-app test/observability channel (Spur-B enabler) ([9891ca9](https://github.com/IT4Change/web-of-trust/commit/9891ca9fa2b4af689f4dad87b7f848d124b7bd5e))
* **demo:** Durable Wiring Phase 2c  activate logSync in the demo composition (gate flip) ([df0fda5](https://github.com/IT4Change/web-of-trust/commit/df0fda58585b9f8883364138ce238318f1415b3d))
* **demo:** gate password step until confirmation matches ([cf51557](https://github.com/IT4Change/web-of-trust/commit/cf51557dbd20f24217747c4ab45995630937b8e4))
* **demo:** Kontakte-Graph-Tab + Live-Graph-Bugfixes ([6861d8f](https://github.com/IT4Change/web-of-trust/commit/6861d8ffd608166e339cd2b92094c4c4c3684cb6))
* **demo:** Live-Trust-Graph  Auto-Publish von Verifikationen + Graph aus Cache + Beamer-Modus ([90b1534](https://github.com/IT4Change/web-of-trust/commit/90b15345d5770032275a972f478651d83312402e))
* **demo:** Per-App-Sprache über Android-Systemeinstellungen (localeConfig + native-aware i18n) ([#271](https://github.com/IT4Change/web-of-trust/issues/271)) ([0981113](https://github.com/IT4Change/web-of-trust/commit/0981113382a059ff7455da9b9e94ae4d3b47e4cb))
* **demo:** persistent two-checkmark attestation delivery status ([eeda1a9](https://github.com/IT4Change/web-of-trust/commit/eeda1a9f756c4602b14236a136cbdb83c68db6db))
* **demo:** Spur-B native device dry-run  staging-debug build + operator runbook ([17b2ae5](https://github.com/IT4Change/web-of-trust/commit/17b2ae53dade728ad0bfc4741e96dfdecaffc112))
* **demo:** UI-Camp-Paket  Safe-Area-Fix, Verbinden-FAB, Passwort-Gate ([beb286e](https://github.com/IT4Change/web-of-trust/commit/beb286e73f3352d37ebb8b337799d9f1e225ef8c))
* **demo:** wire discovery-dual + per-broker relay visibility (Stage A.2) ([0153bb7](https://github.com/IT4Change/web-of-trust/commit/0153bb7bc55705656a5d4936bbea95b3f1524d24))
* **demo:** Zwei-Häkchen-Zustellstatus für Attestationen (persistent) ([e4f42f4](https://github.com/IT4Change/web-of-trust/commit/e4f42f4aea0d5b5a5fbbeda41475ea1812070a2a))
* **deploy:** offline WoT demo box for Raspberry Pi ([8eecb42](https://github.com/IT4Change/web-of-trust/commit/8eecb42b41484aae1c69eb50b465b10ba0f27cca))
* **discovery:** Stage A.2  Discovery-Dual + Relay-Sichtbarkeit ([d55a51d](https://github.com/IT4Change/web-of-trust/commit/d55a51df28d69af8ff918419414a071602fbf9e8))
* **graph:** volle Breite, Kontaktlisten-Placeholder, kein Glow-Clipping ([#273](https://github.com/IT4Change/web-of-trust/issues/273)) ([665031d](https://github.com/IT4Change/web-of-trust/commit/665031d190b306b62efa80583325cd9ad1a7d762))
* **identity:** einmaliger Legacy-Identitätsbruch-Gate (Legacy ’ vnext) ([36ed7db](https://github.com/IT4Change/web-of-trust/commit/36ed7db00e31d6be18dac0b9711955872772f5b4))
* **identity:** einmaliger Legacy-Identitätsbruch-Gate (Legacy ’ vnext) ([85cb7b4](https://github.com/IT4Change/web-of-trust/commit/85cb7b461fb3b902ceda9f4482e5645b11ecf426))
* **identity:** Magic Words nummeriert kopieren ([#278](https://github.com/IT4Change/web-of-trust/issues/278)) ([0b66b39](https://github.com/IT4Change/web-of-trust/commit/0b66b398b74a20300bd087eac446dd9134097e4b))
* **inbox-wire:** demo reception host + onAttestation, wot-cli auf inbox/1.0 (K2/K3, Step 8) ([3d46fba](https://github.com/IT4Change/web-of-trust/commit/3d46fba0e365963c9984de35f7e662ace5d520cd))
* **spaces:** echte Admin-Liste im synced Doc  1.B.3-admin-management ([5ade33c](https://github.com/IT4Change/web-of-trust/commit/5ade33c77fc5c7a549d4237c99d542e92b00042a))
* **spaces:** echte Admin-Liste im synced Doc  1.B.3-admin-management ([bff37c2](https://github.com/IT4Change/web-of-trust/commit/bff37c2ce2659472a68fefdba3b34de3dee715cc))
* **sync:** dual-broker Stage A  camp handshakes work anywhere (Sync 003 Multi-Broker) ([a6fa2cc](https://github.com/IT4Change/web-of-trust/commit/a6fa2ccee39af0b42116ae307243c1ae42605b60))
* **sync:** Dual-Broker Stufe A  Camp-Handshakes funktionieren überall ([6822f0b](https://github.com/IT4Change/web-of-trust/commit/6822f0b2ff79fa7e42a23296a227462e4fa1126c))


### Bug Fixes

* **1b3:** address CodeRabbit + Copilot review (defensive copies, overflow guards, test hardening) ([edd7955](https://github.com/IT4Change/web-of-trust/commit/edd795581a6aef1a66fd8e81cf3a71851fdb6e31))
* **1b3:** demo classifies verifications by WotVerification type, not claim text (review MAJOR 2) ([f45f34f](https://github.com/IT4Change/web-of-trust/commit/f45f34fc1f3a2f9770d802372e4333549a5ff8f4))
* **1b3:** idempotency fast-path enforces rollback; cached /v keeps isVerification (Codex re-review [#198](https://github.com/IT4Change/web-of-trust/issues/198)) ([f9ea764](https://github.com/IT4Change/web-of-trust/commit/f9ea764b6132ae813d3df0ac053ebd625fa85a43))
* **1b3:** publish empty /v and /a on offline-retry; untrack tsbuildinfo (Codex review [#198](https://github.com/IT4Change/web-of-trust/issues/198)) ([6f33008](https://github.com/IT4Change/web-of-trust/commit/6f3300886bdf9f7225e928810f3278f2b6e29655))
* **1b3:** re-derive isVerification from stored vcJws on storage read (review BLOCKER) ([6f3420f](https://github.com/IT4Change/web-of-trust/commit/6f3420ff44004ca8c1a57f6825c83ef5cafb8e84))
* App als release-type node  node-workspace-Kaskade greift jetzt wirklich ([5df6ee7](https://github.com/IT4Change/web-of-trust/commit/5df6ee70916b552b9d20808578714d5038333f87))
* **attestation:** bind receipt-ack id to (jti, sender)  prevent confirmation replay-DoS ([28c39a9](https://github.com/IT4Change/web-of-trust/commit/28c39a90b0a1b00e65c2b76e9b9c408f73421292))
* **attestation:** bind receipt-ack to the original recipient + harden discriminator ([99afbaa](https://github.com/IT4Change/web-of-trust/commit/99afbaafd0ff685749a05bc039889dcc239d8de3))
* **ci:** Demo-Vite-Aliase auch fuer tiefe core-Subpfade  dist-Flake-Quelle beseitigt ([#294](https://github.com/IT4Change/web-of-trust/issues/294)) ([fd87ea2](https://github.com/IT4Change/web-of-trust/commit/fd87ea22ab664ef760fbfc190c49ead086cc78d0))
* **ci:** getrennte Web-Builds für F-Droid (OTA) und Play (kein OTA) ([74deb0c](https://github.com/IT4Change/web-of-trust/commit/74deb0cf36c775aa0356137693b2b9ba2fcb39a5))
* **ci:** testTimeout 20s für wot-core + demo  runWithTimeout-Flake-Familie ([#277](https://github.com/IT4Change/web-of-trust/issues/277)) ([593a973](https://github.com/IT4Change/web-of-trust/commit/593a97331fa38f317e6b11860eb9207965c8d120))
* **demo,cli:** M-B offline-versand + M-C senderDid”iss-Bindung ([d11f460](https://github.com/IT4Change/web-of-trust/commit/d11f4602a6dbf9b568ba6e23d4394b49dbb4d0b5))
* **demo:** address review findings on safe-area scope and recovery gate ([2acc526](https://github.com/IT4Change/web-of-trust/commit/2acc5261eec3b472489b54354c349ef0d8f02b4a))
* **demo:** calm profile-sync status on partial dual-broker publish ([e6b18aa](https://github.com/IT4Change/web-of-trust/commit/e6b18aac270aab1e3ec70a8e97a6fc64020d35d4))
* **demo:** centralize durable-store wipe so key material never survives reset/delete/fresh-start ([14dc364](https://github.com/IT4Change/web-of-trust/commit/14dc3649cc9a5005932bd4eed4ec14d7a4095475))
* **demo:** clear Android system nav bar with bottom safe-area inset ([9e4af14](https://github.com/IT4Change/web-of-trust/commit/9e4af146a3de0ebcd0b91f7ec57999168518f831))
* **demo:** clipboard copy never throws ([#235](https://github.com/IT4Change/web-of-trust/issues/235)) ([de1644a](https://github.com/IT4Change/web-of-trust/commit/de1644a746467937012f65f2cbc1f2b3cf45a43f))
* **demo:** Clipboard-Copy crasht die App nicht mehr ([#235](https://github.com/IT4Change/web-of-trust/issues/235)) ([f02586e](https://github.com/IT4Change/web-of-trust/commit/f02586ec2cfd5601f9c891247a616c2f98a85b8d))
* **demo:** complete the seed-vault wipe so logout/delete redirects (Cluster B) ([a180fdf](https://github.com/IT4Change/web-of-trust/commit/a180fdfddb92f0cb8d72f488c31470613b6cb044))
* **demo:** cross-tier teardown completeness  wipe native keystore + seed-vault ([b5e5f10](https://github.com/IT4Change/web-of-trust/commit/b5e5f102cdaae2f42bf93e690f666e9df0a2698f))
* **demo:** cross-tier teardown completeness  wipe the native keystore + seed-vault ([6bf034d](https://github.com/IT4Change/web-of-trust/commit/6bf034dde71949b7f57ca322c7252a4d8eee2816))
* **demo:** dismiss event-id-scoped statt type-scoped (Review-Blocker [#228](https://github.com/IT4Change/web-of-trust/issues/228)) ([515d540](https://github.com/IT4Change/web-of-trust/commit/515d540937652a81009ea7e7216b40b97ae60729))
* **demo:** drop stale-generation collector resolutions in D2 DOM channel ([3984063](https://github.com/IT4Change/web-of-trust/commit/398406312b33f1f14efa6d9fca9393a3e69d2341))
* **demo:** einheitlicher FAB-Abstand zu App-Bar und rechtem Rand ([b0a7f23](https://github.com/IT4Change/web-of-trust/commit/b0a7f23e234ebf4e15f750ae46ba1fbc12a3ad18))
* **demo:** even FAB gap to bottom nav and right edge ([1e05be9](https://github.com/IT4Change/web-of-trust/commit/1e05be99522a2218d26ff49f582284ad3f652ecb))
* **demo:** Firefox/Brave-iOS-Onboarding-Crash  fremde Injektions-Fehler nicht als App-Crash werten ([f5531c4](https://github.com/IT4Change/web-of-trust/commit/f5531c408cb96ebfd53ed3742bc342d418cbff24))
* **demo:** fremde Browser-Injektions-Fehler nicht als App-Crash werten ([cc9a02b](https://github.com/IT4Change/web-of-trust/commit/cc9a02bdf5f2b4effa57bfc12eb8a0ac7a6ba243))
* **demo:** Graph  kombinierter Poll+Resize-Trigger + stabiler Measure-Container ([5b3e106](https://github.com/IT4Change/web-of-trust/commit/5b3e106bf7bda03894147225e85f024c816ce667))
* **demo:** IndexedDB-Guard  freundliche Meldung statt Crash bei blockiertem Speicher ([#272](https://github.com/IT4Change/web-of-trust/issues/272)) ([b987fb8](https://github.com/IT4Change/web-of-trust/commit/b987fb840a72eaa0547b260355e449d7ee234f99))
* **demo:** Kontakte-Tabs volle Breite (50/50 statt links geklebt) ([8a996ea](https://github.com/IT4Change/web-of-trust/commit/8a996eae7b552bf171af90bdfd6c51b18c7259a5))
* **demo:** M-A attestation-listener wirft transiente Fehler durch ([e3ff26e](https://github.com/IT4Change/web-of-trust/commit/e3ff26e03f81aedfcd2fafcd6090088f17138aa6))
* **demo:** make biometric setup transactional (no lockout on cancel) ([9fb4b3c](https://github.com/IT4Change/web-of-trust/commit/9fb4b3c4709d5331c180a1bbf6811a1a848cf0a4))
* **demo:** make biometric setup transactional (no lockout on cancel) ([6729fe5](https://github.com/IT4Change/web-of-trust/commit/6729fe59799d3090c759e92d7d1b40d1b2c7f904))
* **demo:** Mutual-Dialog final  Schliessen + Profil ansehen (Antons Design) ([2f03e08](https://github.com/IT4Change/web-of-trust/commit/2f03e0802522b78ce5e50b4f7b7667142f672d2c))
* **demo:** Mutual-Dialog-Hierarchie umdrehen  Erfolgsmoment schuetzen (U1) ([4e7dc48](https://github.com/IT4Change/web-of-trust/commit/4e7dc48afedc48a79c57abdee1eb053a8db7dcf8))
* **demo:** Mutual-Dialog-Hierarchie umdrehen (U1) ([a7b1c3c](https://github.com/IT4Change/web-of-trust/commit/a7b1c3cfa3fb7fff745a8e7aff882f01a5dfd752))
* **demo:** native clipboard + visible copy fallback ([#235](https://github.com/IT4Change/web-of-trust/issues/235) review) ([dbf25cc](https://github.com/IT4Change/web-of-trust/commit/dbf25cc60fae749f14bc19b89c6ce70ae690dcc8))
* **demo:** pin side-loaded test builds to their shipped bundle ([#238](https://github.com/IT4Change/web-of-trust/issues/238)) ([c3a660e](https://github.com/IT4Change/web-of-trust/commit/c3a660ef725d8c49c7e6bbcbf2eb214a64bf21fc))
* **demo:** Polling-Overlap-Guard + Unmount-Guard für Graph-Cache-Sweeps (Codex-Review [#267](https://github.com/IT4Change/web-of-trust/issues/267)) ([595d1a1](https://github.com/IT4Change/web-of-trust/commit/595d1a1f9c30c78fe39a04fe3b34c9900b2b74e2))
* **demo:** Profil-Sync-Status ruhig bei Teil-Erfolg (Dual-Broker) ([48b2a29](https://github.com/IT4Change/web-of-trust/commit/48b2a293cf24f1f46fdc034f50d5bf9767301eb1))
* **demo:** Publish-Ziel = neueste Peer-Verifikation, beim Render berechnet (Codex-Delta-Review [#267](https://github.com/IT4Change/web-of-trust/issues/267)) ([170980e](https://github.com/IT4Change/web-of-trust/commit/170980eaafaab00489eb193279512851072f6add))
* **demo:** remove modulo bias from generateRandomPassphrase ([1dc9606](https://github.com/IT4Change/web-of-trust/commit/1dc96066d57eabd995a1c45ed0b57fcc60bb9f9e))
* **demo:** remove modulo bias from generateRandomPassphrase ([c49e0a9](https://github.com/IT4Change/web-of-trust/commit/c49e0a90eee7184cb302eee8453ab3ebde222d79))
* **demo:** roll back stored seed on partial biometric setup failure ([0b36023](https://github.com/IT4Change/web-of-trust/commit/0b36023bdd8890a9c49f521383e3495949433c84))
* **demo:** Side-loaded Test-Builds ziehen kein Produktions-OTA mehr ([#238](https://github.com/IT4Change/web-of-trust/issues/238)) ([ebeac8d](https://github.com/IT4Change/web-of-trust/commit/ebeac8d96d264e1dd5952d2ad7dcd7d0628457fe))
* **demo:** synchronously clear the data-testid DOM channel on unregister (D2 stale-identity blocker) ([aebfe58](https://github.com/IT4Change/web-of-trust/commit/aebfe5848a8b135b445118cfa852c777ddaef96b))
* **demo:** Verbindungen pro Peer-DID deduplizieren ([e26af7a](https://github.com/IT4Change/web-of-trust/commit/e26af7af9cb352d45c388903a6c9fb0782b03bd8))
* **demo:** W5 keystore tier fails closed  strict isEnrolled check (PR [#216](https://github.com/IT4Change/web-of-trust/issues/216) blocker) ([528e178](https://github.com/IT4Change/web-of-trust/commit/528e17858729333a8415f73b952a41d4e444a844))
* **discovery:** CodeRabbit-Findings  Multi-Key-Scan + flaky Test ([17826b3](https://github.com/IT4Change/web-of-trust/commit/17826b309b7e3c648a0fbaf1143eb5b279df9c55))
* **discovery:** offline keyAgreement-Key-Cache fuer ECIES-Zustellung ([31bed10](https://github.com/IT4Change/web-of-trust/commit/31bed10ca72235d5bb9b2687b4e7e7863717c67b))
* **discovery:** offline keyAgreement-Key-Cache für ECIES-Zustellung ([e11256a](https://github.com/IT4Change/web-of-trust/commit/e11256a6d7900160cf67ff8d1f8d61533848f49b))
* **e2e:** make the home-page check port-agnostic (path, not hard-coded :5173) ([5b1bc84](https://github.com/IT4Change/web-of-trust/commit/5b1bc84d374f41da5e5b753e20f14b470ea6f121))
* **e2e:** resolve tsx via workspace .bin in playwright global-setup ([8d872e5](https://github.com/IT4Change/web-of-trust/commit/8d872e5af6ab712676ecd9c925992f5fc2b8eacb))
* **e2e:** run the Playwright demo on a dedicated port (5273), not vite's 5173 ([51285e5](https://github.com/IT4Change/web-of-trust/commit/51285e5a66d1f084d0af6e53c3e364704c21bcd0))
* **identity:** Legacy-Reset-Marker erst nach verifiziertem Seed-Reset ([45fa5a0](https://github.com/IT4Change/web-of-trust/commit/45fa5a0ea98efa58f4ff7fdc908cb44437030712))
* **inbox-wire:** message-id-history erst bei konklusiver Verarbeitung (Sync 003 Z.466) ([e92ecb4](https://github.com/IT4Change/web-of-trust/commit/e92ecb4b5d399d029406dadde8ec9cce2a72022a))
* **inbox-wire:** receiveInboxMessage gated auf normative Inbox-Type-URIs ([da75228](https://github.com/IT4Change/web-of-trust/commit/da752283cc96ebcb5fb8c9011351a47c5f8b16a4))
* **inbox-wire:** review-nacharbeiten (stale kommentare, VE-6-doku, space-invite-klassifikation, outbox-typen) ([d99d794](https://github.com/IT4Change/web-of-trust/commit/d99d7940770e57d1c0f5a7442b0658de5b0413f9))
* **inbox:** konkreten Prüf-Fehler bei invalid-inner-jws-Reject durchreichen ([35ef0fb](https://github.com/IT4Change/web-of-trust/commit/35ef0fbb0ad077dfce4d5349d9954c045e2bf61c))
* **inbox:** konkreten Prüf-Fehler bei invalid-inner-jws-Reject durchreichen ([2f819c6](https://github.com/IT4Change/web-of-trust/commit/2f819c67033dba2c64b5d86c19d3c4c5abaf27ca))
* **relay:** address inbox store-and-forward review findings (GC wiring, fan-out/completeness alignment, id-less key) ([6d3d552](https://github.com/IT4Change/web-of-trust/commit/6d3d55244e5f7374d771075df16d6021508688c9))
* Review-Blocker  extra-files-Pfad, node-workspace-Kaskade, strikter versionCode ([551a5d5](https://github.com/IT4Change/web-of-trust/commit/551a5d5b24d45ec0f4f0f5812abed8fd205b82a0))
* **sync:** bot-review round  empty vaultUrl guard, per-field getDocInfo merge, carrying-broker metrics URL, monitor XSS escape ([1ff898b](https://github.com/IT4Change/web-of-trust/commit/1ff898bb91f77716fc695bc57a610ca9e728f493))
* **sync:** dual-broker review round 1  connect idempotency, hung-dial reset, receipt aggregation, vault snapshot freshness ([269c58e](https://github.com/IT4Change/web-of-trust/commit/269c58ef35034d9831d1be76cb0f3c9946e5b255))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @web_of_trust/adapter-automerge bumped to 0.3.0
    * @web_of_trust/adapter-yjs bumped to 0.3.0
    * @web_of_trust/core bumped to 0.6.0
</details>

---
This PR was generated with [Release Please](https://github.com/googleapis/release-please). See [documentation](https://github.com/googleapis/release-please#release-please).