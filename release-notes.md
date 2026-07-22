:robot: I have created a release *beep* *boop*
---


<details><summary>core: 0.5.0</summary>

## [0.5.0](https://github.com/IT4Change/web-of-trust/compare/core-v0.4.1...core-v0.5.0) (2026-07-22)


###   BREAKING CHANGES

* **wot-core:** delete ProfileService + ./services subpath (breaking removal)
* **wot-core:** delete GroupKeyService, drop re-exports
* **wot-core:** delete EncryptedSyncService, drop re-exports

### Features

* **1.B.3-key-rotation:** produktive Capability-JWS-Schicht + ECIES-Wire-Migration ([477a083](https://github.com/IT4Change/web-of-trust/commit/477a0835a48d067d45ca5d967c151f4897492ead))
* **1b3:** [#102](https://github.com/IT4Change/web-of-trust/issues/102)-Vektoren in wot-core ziehen + ProtocolInterop-Stil-Tests (Step 1) ([fc7d906](https://github.com/IT4Change/web-of-trust/commit/fc7d906cf5a4be4eab9f787b4bfd681d27f4eb96))
* **1b3:** demo publish-split + recovery-workflow wiring (Step 6) ([1d342b9](https://github.com/IT4Change/web-of-trust/commit/1d342b9e0823eb1f7c60298f93210bcd529f2564))
* **1b3:** discovery-recovery + discovery-attestations  /a+/v Compact-JWS ListResource, Rollback, Server-Monotonie, Recovery-Workflow ([c9fa7d3](https://github.com/IT4Change/web-of-trust/commit/c9fa7d34ba6a375c288f16d439e0ae7642d482b8))
* **1b3:** HttpDiscoveryAdapter compact-JWS ListResource wire + 409-retry (Step 3) ([119c4dc](https://github.com/IT4Change/web-of-trust/commit/119c4dc4534450eb937435270baf46d18b73092b))
* **1b3:** MembershipEvent-Set + resolveActiveMembers + Resolution-Workflow (Step 1) ([f867c00](https://github.com/IT4Change/web-of-trust/commit/f867c007e298f4a8c3379556fc9c6d786ae43c5d))
* **1b3:** OfflineFirst verifications-dirty + wot-profiles server-monotonicity (Step 4) ([72d1f3c](https://github.com/IT4Change/web-of-trust/commit/72d1f3cf86ddc612348cdfc5ea059cb7ff632969))
* **1b3:** ports + version-cache + graph-cache + type-marker (Step 2) ([921f9dd](https://github.com/IT4Change/web-of-trust/commit/921f9ddafb0dff6fa52ae0363bc74c5ffb78c10a))
* **1b3:** profile-recovery-workflow consumes classify-guard (Step 5) ([c3b3ac5](https://github.com/IT4Change/web-of-trust/commit/c3b3ac5017b65eeb04ba308711a0d5be0394e877))
* **1b3:** Yjs _members-Event-Set + createdBy, Backfill tot (Step 2) ([969456c](https://github.com/IT4Change/web-of-trust/commit/969456c46d120ccb5a52cc955f72acc6d08b46c0))
* **adapter-yjs:** Inbox-Wire-Migration  DIDComm + Inner-JWS + ECIES + ack/1.0 (Referenz) ([ebacf5d](https://github.com/IT4Change/web-of-trust/commit/ebacf5d5ee0e3e3bd1bcc0a013df6715820d684e))
* **adapters:** productive key-rotation + invite wire migration (ECIES container) ([1e262a1](https://github.com/IT4Change/web-of-trust/commit/1e262a196d864576337b77f33afb915adf13a13d))
* add yjs membership activity capability ([7609e82](https://github.com/IT4Change/web-of-trust/commit/7609e8250674197d66a40fd5a6c136065a9f9494))
* **application:** add processMemberUpdate member-update workflow ([11a730d](https://github.com/IT4Change/web-of-trust/commit/11a730dbec5b8cbab2354be90e980af81cc0b40e))
* **application:** add profile-document + profile-publication-workflow ([5322596](https://github.com/IT4Change/web-of-trust/commit/53225962682ae3bd970d7d3a8d75b39acde39fe1))
* **application:** deliverInboxMessage + receiveInboxMessage (Sync 003 Z.446-470) ([7e9cba9](https://github.com/IT4Change/web-of-trust/commit/7e9cba9d860053c3d497b60f4779fdc84909014f))
* **application:** key-rotation-workflow + invite-workflow (productive capability-JWS) ([22428f0](https://github.com/IT4Change/web-of-trust/commit/22428f0b55d0b3a047c822eb6937bc52b13284d2))
* **automerge+core:** convert Automerge adapter onto the shared log path + VE-9 UUID-docId (Slice A Phase 4) ([ae6803b](https://github.com/IT4Change/web-of-trust/commit/ae6803bd8c7e8746251a2efc3be2aadd294f8e91))
* **core,adapters,demo:** Durable Wiring  completion gate (headline e2e + reload-decrypt + onSecurityError) ([4e5774d](https://github.com/IT4Change/web-of-trust/commit/4e5774df38a07c90fe10f6f0f208a3bc164c76b4))
* **core,adapters:** catch-up completeness  pagination loop + seq-gap handling (Slice B) ([d022e57](https://github.com/IT4Change/web-of-trust/commit/d022e57537f8c1d455253357604da3a33800cdaa))
* **core,adapters:** Durable Wiring Phase 1  N2 partial-store guards + E1 propagation + sendControlFrame passthrough ([da4e2b4](https://github.com/IT4Change/web-of-trust/commit/da4e2b42d90841c2808ae2b05dd60cb50af47aa6))
* **core,adapters:** Durable Wiring Phase 2b  VE-11 restore-clone rebind + Trigger-1/2 split ([7c5e719](https://github.com/IT4Change/web-of-trust/commit/7c5e719a75bea7f7f7fc1f05cc0e1d2d63e9ac6e))
* **core,adapters:** two-phase broker-enforced secure removal (Slice SR VE-C1/VE-C3) ([6a2c4cd](https://github.com/IT4Change/web-of-trust/commit/6a2c4cdf02275a1831529bfbf45e02aa0294a4c8))
* **core,relay,adapters:** KEY_GENERATION_STALE re-emit for the legitimate lagger (Slice SR VE-C2) ([2e9c150](https://github.com/IT4Change/web-of-trust/commit/2e9c15041109f52d232dbc71d9f09223dabe9099))
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
* **group-key-workflow:** mint capability key pair + self-capability ([3d4f9b8](https://github.com/IT4Change/web-of-trust/commit/3d4f9b88dbfdf45d86007b63e36047e4476577a4))
* **inbox-wire:** messaging port union + WS auto-ACK guard fuer DIDComm (K1, Step 7a) ([e09ce36](https://github.com/IT4Change/web-of-trust/commit/e09ce36a12823746676d243cf343e3234da472fa))
* **ports:** MessageIdHistoryPort + InMemory-Default (Sync 003 Z.466) ([918c086](https://github.com/IT4Change/web-of-trust/commit/918c0868c498e0b77b3f3bd6204bfde2d17dcefd))
* **protocol:** add verifyJwsByDidResolver generic EdDSA-JWS verifier ([690cb06](https://github.com/IT4Change/web-of-trust/commit/690cb06159fa3939b4dd6c06b2a9829671e4c6c6))
* **protocol:** inbox-message encrypted-outer family + inner-JWS builder/verifier ([4423b40](https://github.com/IT4Change/web-of-trust/commit/4423b401d71cfff3e656e5927346bb6ad6110f05))
* **relay:** capability-gate + full-rotation + author-binding (Slice CG, WIP) ([f463e5b](https://github.com/IT4Change/web-of-trust/commit/f463e5bb402902d3bf926a05e745f5c266dc2fdf))
* **relay:** ingest generation-gate + relay whitelist for secure removal (Slice SR VE-R1/VE-R2) ([55c280f](https://github.com/IT4Change/web-of-trust/commit/55c280f55e18138d0436db80996c520525adb5cc))
* **relay:** space-register control-frame + durable space registry (Slice CG Phase 3, VE-3) ([166fcf6](https://github.com/IT4Change/web-of-trust/commit/166fcf6c901b05d0b0e3d85a6937802907e10b10))
* **spaces:** echte Admin-Liste im synced Doc  1.B.3-admin-management ([5ade33c](https://github.com/IT4Change/web-of-trust/commit/5ade33c77fc5c7a549d4237c99d542e92b00042a))
* **spaces:** echte Admin-Liste im synced Doc  1.B.3-admin-management ([bff37c2](https://github.com/IT4Change/web-of-trust/commit/bff37c2ce2659472a68fefdba3b34de3dee715cc))
* **sync:** dual-broker Stage A  camp handshakes work anywhere (Sync 003 Multi-Broker) ([a6fa2cc](https://github.com/IT4Change/web-of-trust/commit/a6fa2ccee39af0b42116ae307243c1ae42605b60))
* **sync:** Dual-Broker Stufe A  Camp-Handshakes funktionieren überall ([6822f0b](https://github.com/IT4Change/web-of-trust/commit/6822f0b2ff79fa7e42a23296a227462e4fa1126c))
* **sync:** GENERATION_GAP + Historical-Retry nach Spec R5/R6 ([0bb62d6](https://github.com/IT4Change/web-of-trust/commit/0bb62d632dbcbfab151ad59cc547a2cf0806000b))
* **sync:** P0b  MembershipActivityCapable + membershipRemovals (Membership-Schnitt) ([c161b7c](https://github.com/IT4Change/web-of-trust/commit/c161b7cd7e6882f35d72b9cbda4b3794c76f4647))
* **transport:** WireMessage-Union, K1-Auto-ACK-Guard, Relay to[0]-Routing + ack/1.0-Mapping ([6ba89b5](https://github.com/IT4Change/web-of-trust/commit/6ba89b540488f21387f63c0894133f021cbfcebd))
* **wot-core:** add encryptOneShot/decryptOneShot OneShot primitives (green) ([435c50c](https://github.com/IT4Change/web-of-trust/commit/435c50cd198a0e3d32c265b61911ecdc6e89613e))
* **wot-core:** add group-key-workflow (green) ([9e34aa8](https://github.com/IT4Change/web-of-trust/commit/9e34aa81c9eeb1c398747a363f3dd32fb3ddbb49))
* **wot-core:** add KeyManagementPort + InMemoryKeyManagementAdapter (green) ([a121ebf](https://github.com/IT4Change/web-of-trust/commit/a121ebfa27ac5bcdda631655a1f2ec7f2f9929b4))
* **wot-core:** add MemberUpdatePendingStore port + in-memory default ([6e91605](https://github.com/IT4Change/web-of-trust/commit/6e916054d477d1e36b1c6afd45f20ca3a163ca49))
* **wot-core:** add ProtocolCryptoAdapter.randomBytes (green) ([2586977](https://github.com/IT4Change/web-of-trust/commit/2586977b89ebee5afca573727b8c00558f2bb9cd))
* **wot-core:** KeyManagementPort capability material + ed25519PublicKeyFromSeed ([4a4ef2b](https://github.com/IT4Change/web-of-trust/commit/4a4ef2be518a4d87e364a3bc6e9940ff8cb0acae))
* **yjs+core:** blocked-by-key replay, restore-clone, personal-doc log sync, content-off, space-rotate (Slice A VE-5/6/7/10) ([556037d](https://github.com/IT4Change/web-of-trust/commit/556037dfea2de734893dcbbdf9f5737b8885699c))
* **yjs+core:** rewire Yjs content sync onto Sync-002 log-entry path (Slice A VE-2/3/4/8/9) ([9bd7ae0](https://github.com/IT4Change/web-of-trust/commit/9bd7ae0e5b203e82e82f1dd35613c33f86ee9c71))


### Bug Fixes

* **1b3:** address CodeRabbit + Copilot review (defensive copies, overflow guards, test hardening) ([edd7955](https://github.com/IT4Change/web-of-trust/commit/edd795581a6aef1a66fd8e81cf3a71851fdb6e31))
* **1b3:** address PR [#178](https://github.com/IT4Change/web-of-trust/issues/178) review findings (DI wiring + polish) ([ea7600e](https://github.com/IT4Change/web-of-trust/commit/ea7600e862538fe66e19f5a83f571098f2de4b48))
* **1b3:** createdBy in wot-core AutomergeSpaceMetadataStorage persistieren (VE-2-Nachzug) ([3f41cd0](https://github.com/IT4Change/web-of-trust/commit/3f41cd02a96880691491ed1f6a7f685393746480))
* **1b3:** demo classifies verifications by WotVerification type, not claim text (review MAJOR 2) ([f45f34f](https://github.com/IT4Change/web-of-trust/commit/f45f34fc1f3a2f9770d802372e4333549a5ff8f4))
* **1b3:** idempotency fast-path enforces rollback; cached /v keeps isVerification (Codex re-review [#198](https://github.com/IT4Change/web-of-trust/issues/198)) ([f9ea764](https://github.com/IT4Change/web-of-trust/commit/f9ea764b6132ae813d3df0ac053ebd625fa85a43))
* **1b3:** membership-event generation auf safe integers begrenzt (Codex-Re-Review) ([77f1683](https://github.com/IT4Change/web-of-trust/commit/77f1683559fc66d91c20544c952a2810b69c1b4d))
* **1b3:** re-derive isVerification from stored vcJws on storage read (review BLOCKER) ([6f3420f](https://github.com/IT4Change/web-of-trust/commit/6f3420ff44004ca8c1a57f6825c83ef5cafb8e84))
* **1b3:** resolution auch nach savePending + restore (Sync 005 Z.194, Review-M1) ([ccd8354](https://github.com/IT4Change/web-of-trust/commit/ccd83549a2562005295490ef2aafd737008082cc))
* **1b3:** review-nacharbeiten (Befund-Pin-Header, Drop-Logzeile, members[0]-Kommentare, Test-Flake-Härtung) ([54142e4](https://github.com/IT4Change/web-of-trust/commit/54142e48502ad24bfa0ce1f1027d2609c0409449))
* **adapters:** guard member-removal under enableLogSync as unsupported; remove half-built VE-10 broker-enforcement (Slice A) ([45771f1](https://github.com/IT4Change/web-of-trust/commit/45771f1928d851b005436480d858fba96df8f674))
* address agent review findings ([591abef](https://github.com/IT4Change/web-of-trust/commit/591abef106bde0e8287a3161a154f2762b34e73e))
* address agent review findings ([e54ee72](https://github.com/IT4Change/web-of-trust/commit/e54ee72b5d2bf91fa8d176c283e37faa512244c3))
* address agent review findings ([7aeffde](https://github.com/IT4Change/web-of-trust/commit/7aeffdeb209d2c3bdbdd649b664818323094e2f3))
* address agent review findings ([573ec9e](https://github.com/IT4Change/web-of-trust/commit/573ec9ea6cdb3cd91cd82ae69b91fee48c52b51d))
* **attestation:** bind receipt-ack to the original recipient + harden discriminator ([99afbaa](https://github.com/IT4Change/web-of-trust/commit/99afbaafd0ff685749a05bc039889dcc239d8de3))
* chain capability catch-up after coalescing ([14e93cb](https://github.com/IT4Change/web-of-trust/commit/14e93cb262ff8f68ab144b7a9bc063d1073d3831))
* **ci:** testTimeout 20s für wot-core + demo  runWithTimeout-Flake-Familie ([#277](https://github.com/IT4Change/web-of-trust/issues/277)) ([593a973](https://github.com/IT4Change/web-of-trust/commit/593a97331fa38f317e6b11860eb9207965c8d120))
* complete protocol-adapters consolidation  vite entry, inner imports, in-repo docs ([9758db3](https://github.com/IT4Change/web-of-trust/commit/9758db32a89bf098901b5b115a3c416e68d89278))
* converge secure removal recovery ([0d13b4d](https://github.com/IT4Change/web-of-trust/commit/0d13b4d9df626962b6d6d0561de30191cfbb1673))
* **core,adapters,test:** address loop-review (codex-gpt-5 + CodeRabbit) on PR [#214](https://github.com/IT4Change/web-of-trust/issues/214) ([50b4fd5](https://github.com/IT4Change/web-of-trust/commit/50b4fd5d341614d97767aa616ee66b5aed4380e7))
* **core,adapters:** Slice B v3  close the multi-page-tail data-loss + 2 majors (3rd dual-review) ([0d64607](https://github.com/IT4Change/web-of-trust/commit/0d646072013ad44f75f72b24195de13538a2898f))
* **core,relay,adapters:** close 3 safety blockers + broker-url check from loop-review (Slice SR-3) ([0f25188](https://github.com/IT4Change/web-of-trust/commit/0f2518863f21dbbf924cb42aec497feabee80df7))
* **core,relay,adapters:** close the 3 CodeRabbit Non-Security findings + minors (Slice SR-4) ([91bce7f](https://github.com/IT4Change/web-of-trust/commit/91bce7f1391990b68cd32a247cc7e948bf7d4223))
* **core+adapters:** close AES-GCM nonce-reuse blocker + churn/liveness concerns from dual review (Slice A) ([f71d2bd](https://github.com/IT4Change/web-of-trust/commit/f71d2bd306a04d27cd09a54902d5f0ab28877696))
* **core+adapters:** enforce member-removal at the broker via durable retriable space-rotate (Slice A VE-10 blocker) ([3cf4ee9](https://github.com/IT4Change/web-of-trust/commit/3cf4ee920df721b044ec612bd005cc7e126f5b1c))
* **core:** Durable Wiring Phase 2b  VE-11 review fixes (write-pause race, rebind rollback, security surface) ([8abe92f](https://github.com/IT4Change/web-of-trust/commit/8abe92faaa9ce0e8ca1a3bb8b5c3f3f11a7447fe))
* **core:** move PERSONAL_DOC_OWNER_MISMATCH into the client broker-error catalog (A2 Teil B) ([5577056](https://github.com/IT4Change/web-of-trust/commit/5577056f791a7ea297b7010c24ac2ba20bceb697))
* **core:** propagate in-flight catch-up failure into a coalescing ensurePublished (loop-review [#2](https://github.com/IT4Change/web-of-trust/issues/2) blocker) ([5a2773c](https://github.com/IT4Change/web-of-trust/commit/5a2773c159661f3b8bbe992e56a9e5569503fc12))
* **core:** retain unverified removal pending provenance ([5c3757e](https://github.com/IT4Change/web-of-trust/commit/5c3757ee368ca75af2d7a7b37e461cd6b6f8d3ab))
* **core:** route write-path error frames to the coordinator over real WS (Slice SR P5.5) ([c1d8520](https://github.com/IT4Change/web-of-trust/commit/c1d852055b34f6daefdb645b48721426e166ab60))
* **core:** single-flight ensureDb so concurrent first ops can't orphan a vault connection ([5e179ff](https://github.com/IT4Change/web-of-trust/commit/5e179ff0636c2b6713a97768582b615ff0ca6371))
* **core:** Slice B v3  close STACKED permanent-gaps + the unsolicited page-boundary false-positive (3rd dual-review) ([e1edb99](https://github.com/IT4Change/web-of-trust/commit/e1edb99620ee76379ad77e2cc45d56d636cc09cb))
* **core:** Space-Metadata-Storage spreadet info.members defensiv (undefined blockiert Unlock/Restore nicht mehr) ([bbf9040](https://github.com/IT4Change/web-of-trust/commit/bbf904097e9216019b2e3a1b64b05b8cefb96a77))
* **debug:** anchor metrics/trace singletons on globalThis ([#237](https://github.com/IT4Change/web-of-trust/issues/237)) ([f4cb02b](https://github.com/IT4Change/web-of-trust/commit/f4cb02be28a81342267c80b9102f564494553556))
* **debug:** Panel zeigt echten Relay-Status  Singleton überlebt Chunk-Duplikation ([#237](https://github.com/IT4Change/web-of-trust/issues/237)) ([696b64a](https://github.com/IT4Change/web-of-trust/commit/696b64afc7bb9fdfbe273fccc75d40fe6db228f4))
* defer reseed capability generation ([a9db57d](https://github.com/IT4Change/web-of-trust/commit/a9db57d2a53fb02efbc25f6a432d0314ed825269))
* **demo:** complete the seed-vault wipe so logout/delete redirects (Cluster B) ([a180fdf](https://github.com/IT4Change/web-of-trust/commit/a180fdfddb92f0cb8d72f488c31470613b6cb044))
* **discovery,protocol:** address [#186](https://github.com/IT4Change/web-of-trust/issues/186) re-review bot findings ([af8e818](https://github.com/IT4Change/web-of-trust/commit/af8e818a90454abd6094bff414278363b461e440))
* **discovery:** CodeRabbit-Findings  Multi-Key-Scan + flaky Test ([17826b3](https://github.com/IT4Change/web-of-trust/commit/17826b309b7e3c648a0fbaf1143eb5b279df9c55))
* **discovery:** offline keyAgreement-Key-Cache fuer ECIES-Zustellung ([31bed10](https://github.com/IT4Change/web-of-trust/commit/31bed10ca72235d5bb9b2687b4e7e7863717c67b))
* **discovery:** offline keyAgreement-Key-Cache für ECIES-Zustellung ([e11256a](https://github.com/IT4Change/web-of-trust/commit/e11256a6d7900160cf67ff8d1f8d61533848f49b))
* **discovery:** rollback error is security-final  never masked by fallback ([3202a00](https://github.com/IT4Change/web-of-trust/commit/3202a00afce02f0a0e1d9d1a55861744ccfad8fa))
* enforce durable self-leave removal flow ([79045c1](https://github.com/IT4Change/web-of-trust/commit/79045c1123db857199e7bc044abcbfea51c62ae9))
* gate secure self-leave by durable capabilities ([f5a67c8](https://github.com/IT4Change/web-of-trust/commit/f5a67c8f16aa10979e888158edef881716cf6793))
* **group-key-workflow:** address [#184](https://github.com/IT4Change/web-of-trust/issues/184) Copilot findings (key-history + wire validation) ([7455513](https://github.com/IT4Change/web-of-trust/commit/7455513f29f609378c9f503d3c6ddd60b9f2f06c))
* **inbox-wire:** M-D future-bound auf created_time (Pflichtprüfung 4) ([d4f1ff2](https://github.com/IT4Change/web-of-trust/commit/d4f1ff2b59aa8748157830d66e349a5e812ac9a7))
* **inbox-wire:** message-id-history erst bei konklusiver Verarbeitung (Sync 003 Z.466) ([e92ecb4](https://github.com/IT4Change/web-of-trust/commit/e92ecb4b5d399d029406dadde8ec9cce2a72022a))
* **inbox-wire:** receiveInboxMessage gated auf normative Inbox-Type-URIs ([da75228](https://github.com/IT4Change/web-of-trust/commit/da752283cc96ebcb5fb8c9011351a47c5f8b16a4))
* **inbox-wire:** review-nacharbeiten (stale kommentare, VE-6-doku, space-invite-klassifikation, outbox-typen) ([d99d794](https://github.com/IT4Change/web-of-trust/commit/d99d7940770e57d1c0f5a7442b0658de5b0413f9))
* **key-rotation:** address [#189](https://github.com/IT4Change/web-of-trust/issues/189) re-review (2 should-fix) ([c8b1ea4](https://github.com/IT4Change/web-of-trust/commit/c8b1ea4941858660cfe6ce878189cafcfa5ade55))
* **key-rotation:** address [#189](https://github.com/IT4Change/web-of-trust/issues/189) review round 1 ([6f6a1ac](https://github.com/IT4Change/web-of-trust/commit/6f6a1ac02a59a9d444d8d7ac1aef48971233c1de))
* **member-update:** address [#188](https://github.com/IT4Change/web-of-trust/issues/188) re-review findings (store + adapters) ([aca1bca](https://github.com/IT4Change/web-of-trust/commit/aca1bca5d7c5938969cddedcb97b60e198cb01e4))
* **sync:** bind space rotation retries to key material ([a35748d](https://github.com/IT4Change/web-of-trust/commit/a35748dae1797eeee201b7b44ccd8a302573b1ac))
* **sync:** bot-review round  empty vaultUrl guard, per-field getDocInfo merge, carrying-broker metrics URL, monitor XSS escape ([1ff898b](https://github.com/IT4Change/web-of-trust/commit/1ff898bb91f77716fc695bc57a610ca9e728f493))
* **sync:** dual-broker review round 1  connect idempotency, hung-dial reset, receipt aggregation, vault snapshot freshness ([269c58e](https://github.com/IT4Change/web-of-trust/commit/269c58ef35034d9831d1be76cb0f3c9946e5b255))
* **sync:** Eine Retry-Autorität für Log-Sync-Envelopes  Outbox-Orphans + Hard-Stop-Loop ([#236](https://github.com/IT4Change/web-of-trust/issues/236)) ([5396261](https://github.com/IT4Change/web-of-trust/commit/53962619f67e6165f4d3cf4140841fb49b5987c0))
* **sync:** late-registered guard after teardown + model-reference comment (review round 2) ([87c1ac0](https://github.com/IT4Change/web-of-trust/commit/87c1ac0fde1481db2dcd2fef04dbadd8bed688fd))
* **sync:** make generation gap recovery broker-authoritative ([1db6150](https://github.com/IT4Change/web-of-trust/commit/1db6150f49ec6e774393a8333668aad08d09c9ce))
* **sync:** persist+restore capability signing seed so a recovered device can write ([#234](https://github.com/IT4Change/web-of-trust/issues/234)) ([239bbd0](https://github.com/IT4Change/web-of-trust/commit/239bbd0a2b39fbf645c4cc50c59738f4b54c8d84))
* **sync:** recover generation gaps and revoke self admin ([25a4dac](https://github.com/IT4Change/web-of-trust/commit/25a4dac66e27a98e08256c7bad7b254597be91ac))
* **sync:** recovered device can write to existing spaces  persist+restore capability signing seed ([#234](https://github.com/IT4Change/web-of-trust/issues/234)) ([2abc70c](https://github.com/IT4Change/web-of-trust/commit/2abc70c40451fc5ea160d0267aaa6069af903e46))
* **sync:** Reseed  Capability-Praesentation deferrt bei fehlenden Keys statt zu crashen ([21a8223](https://github.com/IT4Change/web-of-trust/commit/21a8223d42eae3baf92c3390434069cbfd6cc07f))
* **sync:** resolve multi-device self-leave ([0e29e41](https://github.com/IT4Change/web-of-trust/commit/0e29e413637900d40527ebbd77cd7467122374e8))
* **sync:** restore verify-first ordering and dedupe AES-GCM framing constants ([c90d2a6](https://github.com/IT4Change/web-of-trust/commit/c90d2a629dc3532da7ba15f519e3f52dee0163d2))
* **sync:** Self-Leave-Preflight im Core-Workflow vor jeder Staging-/Broker-Wirkung ([6b6caea](https://github.com/IT4Change/web-of-trust/commit/6b6caea56463dbde31d9bd6e5775b3db877e2f8e))
* **sync:** single retry authority for log-sync envelopes ([#236](https://github.com/IT4Change/web-of-trust/issues/236)) ([ee69f2a](https://github.com/IT4Change/web-of-trust/commit/ee69f2a5197209d9a299292b179c47f5cf9d8e90))
* **sync:** socket-instance-safe WebSocket handlers (re-review blocker) ([c8a4607](https://github.com/IT4Change/web-of-trust/commit/c8a46074c0d6302f817e967bccdd87564a8e084f))
* **sync:** support non-admin self leave ([63dd3ed](https://github.com/IT4Change/web-of-trust/commit/63dd3eddb28802ce9c7b4bd5341bbd62cddc5bb8))
* **sync:** trace a failed write-path receipt as failure ([#236](https://github.com/IT4Change/web-of-trust/issues/236) review NIT) ([c08fea9](https://github.com/IT4Change/web-of-trust/commit/c08fea923e159a5341e11f4d35c3fec80ac33c56))
* **sync:** vault seq-space consistency (loop-review blocker) ([e2a3afc](https://github.com/IT4Change/web-of-trust/commit/e2a3afcce3063a4be2b31689fb54a87e709ebd01))
* **sync:** wire broker-admin-messages through protocol public entry ([14d582b](https://github.com/IT4Change/web-of-trust/commit/14d582bcf60ccbb4f67b8fa0ae7b4becf2af16e8))
* **trust:** Clock-Skew-Toleranz für den Attestation-VC-Zeitgate (Camp-Blocker) ([b028493](https://github.com/IT4Change/web-of-trust/commit/b0284939bc13c874744fcfcbf5516086d7596948))
* **trust:** fail closed on invalid maxClockSkewMs and pin the exp boundary ([cb69d13](https://github.com/IT4Change/web-of-trust/commit/cb69d137c0133ea88eddc22e290b2fc9842d9501))
* **trust:** give attestation VC nbf/exp gate 5min clock-skew tolerance ([108aac8](https://github.com/IT4Change/web-of-trust/commit/108aac840e01c10edc70f7d6435552627566594e))
* **vault:** bound every VaultClient fetch with an AbortController timeout ([46b2f4e](https://github.com/IT4Change/web-of-trust/commit/46b2f4e9c45032e319aef06dfd79d1c0af3d3e5c))
* **vault:** VaultClient-fetch-Timeout  kappt den 5G-Startup-Hang (ohne Init-Umbau) ([29ca509](https://github.com/IT4Change/web-of-trust/commit/29ca5095b682c45a2ee4e34bbf9e58d0d00bfdb5))
* **wot-core:** de-flake VE-B2 convergence tests  widen per-page wait under CI load ([39408e7](https://github.com/IT4Change/web-of-trust/commit/39408e74e8600f008c9c039885d1adeaa45fc5f9))
* **wot-core:** de-flake VE-B2 convergence tests under CI load ([08481c1](https://github.com/IT4Change/web-of-trust/commit/08481c107b65262ff3509758506d47723a7fa3f1))
* **wot-core:** toten Half-open-Socket im Heartbeat erkennen (B1) ([2ef8c45](https://github.com/IT4Change/web-of-trust/commit/2ef8c458623332e6efd50adc9fdc82d219e5bb36))
* **wot-core:** toten Half-open-Socket im Heartbeat erkennen (B1) ([adfb6cc](https://github.com/IT4Change/web-of-trust/commit/adfb6cc70412ea3c9571e06301939bdc3fd09d62))


### Code Refactoring

* **wot-core:** delete EncryptedSyncService, drop re-exports ([08fafd8](https://github.com/IT4Change/web-of-trust/commit/08fafd8d0cef502ac7fd2706947bc343b18926ef))
* **wot-core:** delete GroupKeyService, drop re-exports ([0dae67e](https://github.com/IT4Change/web-of-trust/commit/0dae67ebcffef9d0e4a9b45e589906a419ea8998))
* **wot-core:** delete ProfileService + ./services subpath (breaking removal) ([f88d913](https://github.com/IT4Change/web-of-trust/commit/f88d913607e14a0561f605ce31c349d1aea87730))
</details>

<details><summary>adapter-yjs: 0.1.9</summary>

## [0.1.9](https://github.com/IT4Change/web-of-trust/compare/adapter-yjs-v0.1.8...adapter-yjs-v0.1.9) (2026-07-22)


### Features

* **1.B.3-key-rotation:** produktive Capability-JWS-Schicht + ECIES-Wire-Migration ([477a083](https://github.com/IT4Change/web-of-trust/commit/477a0835a48d067d45ca5d967c151f4897492ead))
* **1b3:** Yjs _members-Event-Set + createdBy, Backfill tot (Step 2) ([969456c](https://github.com/IT4Change/web-of-trust/commit/969456c46d120ccb5a52cc955f72acc6d08b46c0))
* **1b3:** Yjs Resolution/Cleanup + Generation-Gap (Steps 3+4) ([83475ec](https://github.com/IT4Change/web-of-trust/commit/83475ec9c28f32bc0930c8b6c3a0503e93e288b2))
* **adapter-yjs:** additives notificationState im PersonalDoc (P0 Notification-Center) ([5cc611b](https://github.com/IT4Change/web-of-trust/commit/5cc611b7b4cc093a340d6dddeb3a3703c980a51a))
* **adapter-yjs:** Inbox-Wire-Migration  DIDComm + Inner-JWS + ECIES + ack/1.0 (Referenz) ([ebacf5d](https://github.com/IT4Change/web-of-trust/commit/ebacf5d5ee0e3e3bd1bcc0a013df6715820d684e))
* **adapter-yjs:** persist personal notification state ([28e84b4](https://github.com/IT4Change/web-of-trust/commit/28e84b4b2302d2732839ff5ade85dc9488216220))
* **adapters:** I-READ "Key-available Ò replayBlockedByKey" on all key-available paths (Yjs + Automerge) ([3bae587](https://github.com/IT4Change/web-of-trust/commit/3bae587e1810bd649d793d348df9975e13fc687f))
* **adapters:** productive key-rotation + invite wire migration (ECIES container) ([1e262a1](https://github.com/IT4Change/web-of-trust/commit/1e262a196d864576337b77f33afb915adf13a13d))
* add yjs membership activity capability ([7609e82](https://github.com/IT4Change/web-of-trust/commit/7609e8250674197d66a40fd5a6c136065a9f9494))
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
* **group-key-workflow:** mint capability key pair + self-capability ([3d4f9b8](https://github.com/IT4Change/web-of-trust/commit/3d4f9b88dbfdf45d86007b63e36047e4476577a4))
* persist confirmed membership removals ([d46903d](https://github.com/IT4Change/web-of-trust/commit/d46903d76291246498670484b394128406facb53))
* **spaces:** echte Admin-Liste im synced Doc  1.B.3-admin-management ([5ade33c](https://github.com/IT4Change/web-of-trust/commit/5ade33c77fc5c7a549d4237c99d542e92b00042a))
* **spaces:** echte Admin-Liste im synced Doc  1.B.3-admin-management ([bff37c2](https://github.com/IT4Change/web-of-trust/commit/bff37c2ce2659472a68fefdba3b34de3dee715cc))
* **sync:** dual-broker Stage A  camp handshakes work anywhere (Sync 003 Multi-Broker) ([a6fa2cc](https://github.com/IT4Change/web-of-trust/commit/a6fa2ccee39af0b42116ae307243c1ae42605b60))
* **sync:** Dual-Broker Stufe A  Camp-Handshakes funktionieren überall ([6822f0b](https://github.com/IT4Change/web-of-trust/commit/6822f0b2ff79fa7e42a23296a227462e4fa1126c))
* **sync:** P0b  MembershipActivityCapable + membershipRemovals (Membership-Schnitt) ([c161b7c](https://github.com/IT4Change/web-of-trust/commit/c161b7cd7e6882f35d72b9cbda4b3794c76f4647))
* **yjs+core:** blocked-by-key replay, restore-clone, personal-doc log sync, content-off, space-rotate (Slice A VE-5/6/7/10) ([556037d](https://github.com/IT4Change/web-of-trust/commit/556037dfea2de734893dcbbdf9f5737b8885699c))
* **yjs+core:** rewire Yjs content sync onto Sync-002 log-entry path (Slice A VE-2/3/4/8/9) ([9bd7ae0](https://github.com/IT4Change/web-of-trust/commit/9bd7ae0e5b203e82e82f1dd35613c33f86ee9c71))


### Bug Fixes

* **1b3:** address PR [#178](https://github.com/IT4Change/web-of-trust/issues/178) review findings (DI wiring + polish) ([ea7600e](https://github.com/IT4Change/web-of-trust/commit/ea7600e862538fe66e19f5a83f571098f2de4b48))
* **1b3:** publish empty /v and /a on offline-retry; untrack tsbuildinfo (Codex review [#198](https://github.com/IT4Change/web-of-trust/issues/198)) ([6f33008](https://github.com/IT4Change/web-of-trust/commit/6f3300886bdf9f7225e928810f3278f2b6e29655))
* **1b3:** re-derive isVerification from stored vcJws on storage read (review BLOCKER) ([6f3420f](https://github.com/IT4Change/web-of-trust/commit/6f3420ff44004ca8c1a57f6825c83ef5cafb8e84))
* **1b3:** resolution auch nach savePending + restore (Sync 005 Z.194, Review-M1) ([ccd8354](https://github.com/IT4Change/web-of-trust/commit/ccd83549a2562005295490ef2aafd737008082cc))
* **1b3:** review-nacharbeiten (Befund-Pin-Header, Drop-Logzeile, members[0]-Kommentare, Test-Flake-Härtung) ([54142e4](https://github.com/IT4Change/web-of-trust/commit/54142e48502ad24bfa0ce1f1027d2609c0409449))
* **1b3:** Yjs cleanup schliesst offene SpaceHandles (Codex-Re-Review M1) ([f9f8126](https://github.com/IT4Change/web-of-trust/commit/f9f81268f2bd71f0aec8ec2af39af265d390fa61))
* **1b3:** Yjs resolution-chain verkettet + members re-gelesen, enc-key-pruning (M1, MINOR-1) ([0e58690](https://github.com/IT4Change/web-of-trust/commit/0e5869049c77809be18da9b0a124f7013f48a79c))
* **adapter-yjs:** deleteProperty für Top-Level-Felder + echte Konvergenz-Fixtures im CRDT-Test ([2d28e0a](https://github.com/IT4Change/web-of-trust/commit/2d28e0aabe37a4e5d5687a10fd1dd8888baba1d6))
* **adapter-yjs:** Ghost-Space-Grace läuft auf lokaler Uhr  Reseed zerstört keine Spaces mehr ([72f0767](https://github.com/IT4Change/web-of-trust/commit/72f0767f54335ad418d74163c1256bd73bba4dd5))
* **adapter-yjs:** has-Trap für notificationState-Felder ('field' in state) ([a8e263a](https://github.com/IT4Change/web-of-trust/commit/a8e263a9cd29704666c0c51fd098da322e8e875a))
* **adapter-yjs:** notificationState lazy-initialisierbar + symbol-sichere Proxy-Traps ([d927ce1](https://github.com/IT4Change/web-of-trust/commit/d927ce1676af1b9368db8313593630d48363dc31))
* **adapter-yjs:** Reseed-Datenverlust  Ghost-Space-Grace auf lokaler Uhr ([3cce51f](https://github.com/IT4Change/web-of-trust/commit/3cce51f40914c850749cf1accd0f800963700b9a))
* **adapter-yjs:** Review-Runde  Key-Reimport vor Ghost-Urteil, Grace-Reset bei stop(), tgz raus ([6fa757f](https://github.com/IT4Change/web-of-trust/commit/6fa757f3f59fd2cccca43b7ddc5e63207281e34f))
* **adapters:** close B3 retry/idempotency hole  never treat local presence as durable proof (loop-review re-review) ([14babe0](https://github.com/IT4Change/web-of-trust/commit/14babe0c075257c810e58fc3cf70f80b906a92e5))
* **adapters:** drop the coordinator + replay-guard state on cleanupSpaceLocally (stale-coordinator, Yjs”Automerge parity) ([a81c95c](https://github.com/IT4Change/web-of-trust/commit/a81c95cf06b5cf6360a87ce897e1761f36da824c))
* **adapters:** guard member-removal under enableLogSync as unsupported; remove half-built VE-10 broker-enforcement (Slice A) ([45771f1](https://github.com/IT4Change/web-of-trust/commit/45771f1928d851b005436480d858fba96df8f674))
* chain capability catch-up after coalescing ([14e93cb](https://github.com/IT4Change/web-of-trust/commit/14e93cb262ff8f68ab144b7a9bc063d1073d3831))
* converge secure removal recovery ([0d13b4d](https://github.com/IT4Change/web-of-trust/commit/0d13b4d9df626962b6d6d0561de30191cfbb1673))
* **core,adapters,test:** address loop-review (codex-gpt-5 + CodeRabbit) on PR [#214](https://github.com/IT4Change/web-of-trust/issues/214) ([50b4fd5](https://github.com/IT4Change/web-of-trust/commit/50b4fd5d341614d97767aa616ee66b5aed4380e7))
* **core,adapters:** Slice B v3  close the multi-page-tail data-loss + 2 majors (3rd dual-review) ([0d64607](https://github.com/IT4Change/web-of-trust/commit/0d646072013ad44f75f72b24195de13538a2898f))
* **core,relay,adapters:** close 3 safety blockers + broker-url check from loop-review (Slice SR-3) ([0f25188](https://github.com/IT4Change/web-of-trust/commit/0f2518863f21dbbf924cb42aec497feabee80df7))
* **core,relay:** converge the legitimate lagger over real WS + route all write-path rejects (Slice SR-2, [#213](https://github.com/IT4Change/web-of-trust/issues/213)) ([4101225](https://github.com/IT4Change/web-of-trust/commit/41012259a8d73e373e969d1501d27d9385fb844d))
* **core+adapters:** close AES-GCM nonce-reuse blocker + churn/liveness concerns from dual review (Slice A) ([f71d2bd](https://github.com/IT4Change/web-of-trust/commit/f71d2bd306a04d27cd09a54902d5f0ab28877696))
* **core+adapters:** enforce member-removal at the broker via durable retriable space-rotate (Slice A VE-10 blocker) ([3cf4ee9](https://github.com/IT4Change/web-of-trust/commit/3cf4ee920df721b044ec612bd005cc7e126f5b1c))
* defer reseed capability generation ([a9db57d](https://github.com/IT4Change/web-of-trust/commit/a9db57d2a53fb02efbc25f6a432d0314ed825269))
* enforce durable self-leave removal flow ([79045c1](https://github.com/IT4Change/web-of-trust/commit/79045c1123db857199e7bc044abcbfea51c62ae9))
* gate secure self-leave by durable capabilities ([f5a67c8](https://github.com/IT4Change/web-of-trust/commit/f5a67c8f16aa10979e888158edef881716cf6793))
* **inbox-wire:** message-id-history erst bei konklusiver Verarbeitung (Sync 003 Z.466) ([e92ecb4](https://github.com/IT4Change/web-of-trust/commit/e92ecb4b5d399d029406dadde8ec9cce2a72022a))
* **inbox-wire:** review-nacharbeiten (stale kommentare, VE-6-doku, space-invite-klassifikation, outbox-typen) ([d99d794](https://github.com/IT4Change/web-of-trust/commit/d99d7940770e57d1c0f5a7442b0658de5b0413f9))
* **key-rotation:** address [#189](https://github.com/IT4Change/web-of-trust/issues/189) review round 1 ([6f6a1ac](https://github.com/IT4Change/web-of-trust/commit/6f6a1ac02a59a9d444d8d7ac1aef48971233c1de))
* **member-update:** address [#188](https://github.com/IT4Change/web-of-trust/issues/188) re-review findings (store + adapters) ([aca1bca](https://github.com/IT4Change/web-of-trust/commit/aca1bca5d7c5938969cddedcb97b60e198cb01e4))
* retry capability catchup after reseed ([0ef7f73](https://github.com/IT4Change/web-of-trust/commit/0ef7f7310602ec2710d17e17ddbc1b1358338a04))
* **sync:** address PR-review blockers ([#234](https://github.com/IT4Change/web-of-trust/issues/234)) ([59c2ee1](https://github.com/IT4Change/web-of-trust/commit/59c2ee1da3094abceef9fe7724ab15ea18bd864d))
* **sync:** bot-review round  empty vaultUrl guard, per-field getDocInfo merge, carrying-broker metrics URL, monitor XSS escape ([1ff898b](https://github.com/IT4Change/web-of-trust/commit/1ff898bb91f77716fc695bc57a610ca9e728f493))
* **sync:** Eine Retry-Autorität für Log-Sync-Envelopes  Outbox-Orphans + Hard-Stop-Loop ([#236](https://github.com/IT4Change/web-of-trust/issues/236)) ([5396261](https://github.com/IT4Change/web-of-trust/commit/53962619f67e6165f4d3cf4140841fb49b5987c0))
* **sync:** Lifecycle-Altbug-Fixes aus [#291](https://github.com/IT4Change/web-of-trust/issues/291) ins Release-Artefakt (0.1.6-Trigger) ([#295](https://github.com/IT4Change/web-of-trust/issues/295)) ([2089773](https://github.com/IT4Change/web-of-trust/commit/2089773c49e7db6e1bebd81dbf997cb6005aa92b))
* **sync:** make generation gap recovery broker-authoritative ([1db6150](https://github.com/IT4Change/web-of-trust/commit/1db6150f49ec6e774393a8333668aad08d09c9ce))
* **sync:** P0a Gates 2+3  Membership-Catch-up-Routing + Initial-Catch-up bei stehender Verbindung ([#288](https://github.com/IT4Change/web-of-trust/issues/288)) ([c63c86d](https://github.com/IT4Change/web-of-trust/commit/c63c86d0ee1ee2fde976a6e9ca83d0ff072994fb))
* **sync:** persist+restore capability signing seed so a recovered device can write ([#234](https://github.com/IT4Change/web-of-trust/issues/234)) ([239bbd0](https://github.com/IT4Change/web-of-trust/commit/239bbd0a2b39fbf645c4cc50c59738f4b54c8d84))
* **sync:** recover generation gaps and revoke self admin ([25a4dac](https://github.com/IT4Change/web-of-trust/commit/25a4dac66e27a98e08256c7bad7b254597be91ac))
* **sync:** recovered device can write to existing spaces  persist+restore capability signing seed ([#234](https://github.com/IT4Change/web-of-trust/issues/234)) ([2abc70c](https://github.com/IT4Change/web-of-trust/commit/2abc70c40451fc5ea160d0267aaa6069af903e46))
* **sync:** Removal-Persistenz  explizite Init-Sonde statt String-Match, Wiring-Fehler laut ([08f005c](https://github.com/IT4Change/web-of-trust/commit/08f005cbc8b38b1d8abb9604f5dcc58c0d6f824a))
* **sync:** Reseed  Capability-Praesentation deferrt bei fehlenden Keys statt zu crashen ([21a8223](https://github.com/IT4Change/web-of-trust/commit/21a8223d42eae3baf92c3390434069cbfd6cc07f))
* **sync:** resolve multi-device self-leave ([0e29e41](https://github.com/IT4Change/web-of-trust/commit/0e29e413637900d40527ebbd77cd7467122374e8))
* **sync:** Self-Removal-Echo  Own-DID-Zustellung wird beim Sender nicht verarbeitet (sentMessageIds-Guard) ([d635351](https://github.com/IT4Change/web-of-trust/commit/d635351cd6958e1232b7261e86f65dae5ea58f3d))
* **sync:** single retry authority for log-sync envelopes ([#236](https://github.com/IT4Change/web-of-trust/issues/236)) ([ee69f2a](https://github.com/IT4Change/web-of-trust/commit/ee69f2a5197209d9a299292b179c47f5cf9d8e90))
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
</details>

<details><summary>adapter-automerge: 0.1.6</summary>

## [0.1.6](https://github.com/IT4Change/web-of-trust/compare/adapter-automerge-v0.1.5...adapter-automerge-v0.1.6) (2026-07-22)


### Features

* **1.B.3-key-rotation:** produktive Capability-JWS-Schicht + ECIES-Wire-Migration ([477a083](https://github.com/IT4Change/web-of-trust/commit/477a0835a48d067d45ca5d967c151f4897492ead))
* **1b3:** Automerge-Mirror  Members-Set, Resolution/Cleanup, future-rotation durabel (Step 5) ([ce74e3d](https://github.com/IT4Change/web-of-trust/commit/ce74e3d899ca1778fea1be78d3aea01e983d00e6))
* **adapters:** I-READ "Key-available Ò replayBlockedByKey" on all key-available paths (Yjs + Automerge) ([3bae587](https://github.com/IT4Change/web-of-trust/commit/3bae587e1810bd649d793d348df9975e13fc687f))
* **adapters:** productive key-rotation + invite wire migration (ECIES container) ([1e262a1](https://github.com/IT4Change/web-of-trust/commit/1e262a196d864576337b77f33afb915adf13a13d))
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
* **group-key-workflow:** mint capability key pair + self-capability ([3d4f9b8](https://github.com/IT4Change/web-of-trust/commit/3d4f9b88dbfdf45d86007b63e36047e4476577a4))
* **inbox-wire:** Automerge-Mirror der DIDComm-Migration (Step 6) ([aa4814a](https://github.com/IT4Change/web-of-trust/commit/aa4814a518f25f67960baf729bcfddd571011d7c))
* **spaces:** echte Admin-Liste im synced Doc  1.B.3-admin-management ([5ade33c](https://github.com/IT4Change/web-of-trust/commit/5ade33c77fc5c7a549d4237c99d542e92b00042a))
* **spaces:** echte Admin-Liste im synced Doc  1.B.3-admin-management ([bff37c2](https://github.com/IT4Change/web-of-trust/commit/bff37c2ce2659472a68fefdba3b34de3dee715cc))
* **sync:** P0b  MembershipActivityCapable + membershipRemovals (Membership-Schnitt) ([c161b7c](https://github.com/IT4Change/web-of-trust/commit/c161b7cd7e6882f35d72b9cbda4b3794c76f4647))


### Bug Fixes

* **1b3:** address PR [#178](https://github.com/IT4Change/web-of-trust/issues/178) review findings (DI wiring + polish) ([ea7600e](https://github.com/IT4Change/web-of-trust/commit/ea7600e862538fe66e19f5a83f571098f2de4b48))
* **1b3:** AM content-pending-buffer blocked-by-key + atomares Key/Gen-Lesen (Sync 002 Z.173, B1/F4) ([396bee3](https://github.com/IT4Change/web-of-trust/commit/396bee3997d056b78928c57d0927306aa89695c5))
* **1b3:** AM event-set auf reservierten root-key (Kollisionsschutz, F-6) ([fcd8abb](https://github.com/IT4Change/web-of-trust/commit/fcd8abbf804ba58eefa561aa38509ca3d3d74e12))
* **1b3:** AM members-container-seed im invite-apply (Review-Minor) ([ce42849](https://github.com/IT4Change/web-of-trust/commit/ce42849959128527b806b29dbb880dca8541e181))
* **1b3:** AM resolution-chain + enc-key-pruning (M1-Spiegel, MINOR-1) ([227947b](https://github.com/IT4Change/web-of-trust/commit/227947b309775b3ba2b48c8e7209b61dca22de31))
* **1b3:** deterministischer members-container-seed auch in createSpace (M2) ([1ffb67d](https://github.com/IT4Change/web-of-trust/commit/1ffb67d51b3b18ab7eff5d6c0c4a4714f2ce3918))
* **1b3:** publish empty /v and /a on offline-retry; untrack tsbuildinfo (Codex review [#198](https://github.com/IT4Change/web-of-trust/issues/198)) ([6f33008](https://github.com/IT4Change/web-of-trust/commit/6f3300886bdf9f7225e928810f3278f2b6e29655))
* **1b3:** re-derive isVerification from stored vcJws on storage read (review BLOCKER) ([6f3420f](https://github.com/IT4Change/web-of-trust/commit/6f3420ff44004ca8c1a57f6825c83ef5cafb8e84))
* **1b3:** resolution auch nach savePending + restore (Sync 005 Z.194, Review-M1) ([ccd8354](https://github.com/IT4Change/web-of-trust/commit/ccd83549a2562005295490ef2aafd737008082cc))
* **1b3:** review-nacharbeiten (Befund-Pin-Header, Drop-Logzeile, members[0]-Kommentare, Test-Flake-Härtung) ([54142e4](https://github.com/IT4Change/web-of-trust/commit/54142e48502ad24bfa0ce1f1027d2609c0409449))
* **adapter-automerge:** PersonalDocManager importiert Core via /storage statt Root (CI [#201](https://github.com/IT4Change/web-of-trust/issues/201)) ([f975bad](https://github.com/IT4Change/web-of-trust/commit/f975badfa44b02f8916bf17d0d5056f611e0da05))
* **adapters:** close B3 retry/idempotency hole  never treat local presence as durable proof (loop-review re-review) ([14babe0](https://github.com/IT4Change/web-of-trust/commit/14babe0c075257c810e58fc3cf70f80b906a92e5))
* **adapters:** drop the coordinator + replay-guard state on cleanupSpaceLocally (stale-coordinator, Yjs”Automerge parity) ([a81c95c](https://github.com/IT4Change/web-of-trust/commit/a81c95cf06b5cf6360a87ce897e1761f36da824c))
* **adapters:** guard member-removal under enableLogSync as unsupported; remove half-built VE-10 broker-enforcement (Slice A) ([45771f1](https://github.com/IT4Change/web-of-trust/commit/45771f1928d851b005436480d858fba96df8f674))
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
* **key-rotation:** address [#189](https://github.com/IT4Change/web-of-trust/issues/189) re-review (2 should-fix) ([c8b1ea4](https://github.com/IT4Change/web-of-trust/commit/c8b1ea4941858660cfe6ce878189cafcfa5ade55))
* **key-rotation:** address [#189](https://github.com/IT4Change/web-of-trust/issues/189) review round 1 ([6f6a1ac](https://github.com/IT4Change/web-of-trust/commit/6f6a1ac02a59a9d444d8d7ac1aef48971233c1de))
* **member-update:** address [#188](https://github.com/IT4Change/web-of-trust/issues/188) re-review findings (store + adapters) ([aca1bca](https://github.com/IT4Change/web-of-trust/commit/aca1bca5d7c5938969cddedcb97b60e198cb01e4))
* retry capability catchup after reseed ([0ef7f73](https://github.com/IT4Change/web-of-trust/commit/0ef7f7310602ec2710d17e17ddbc1b1358338a04))
* **sync:** address PR-review blockers ([#234](https://github.com/IT4Change/web-of-trust/issues/234)) ([59c2ee1](https://github.com/IT4Change/web-of-trust/commit/59c2ee1da3094abceef9fe7724ab15ea18bd864d))
* **sync:** Automerge catchUpGeneration an echten Coordinator statt Stub  Fremd-Removal konvergiert nach GENERATION_GAP ([49996d2](https://github.com/IT4Change/web-of-trust/commit/49996d277a5ab2f800fbf598c504c9f7649df08d))
* **sync:** guard generation&gt;=0 in _persistSpaceMetadata seed lookup ([#234](https://github.com/IT4Change/web-of-trust/issues/234) PR-review) ([fbad51c](https://github.com/IT4Change/web-of-trust/commit/fbad51c923c9de61256767d3b29e67b017763b02))
* **sync:** persist+restore capability signing seed so a recovered device can write ([#234](https://github.com/IT4Change/web-of-trust/issues/234)) ([239bbd0](https://github.com/IT4Change/web-of-trust/commit/239bbd0a2b39fbf645c4cc50c59738f4b54c8d84))
* **sync:** recovered device can write to existing spaces  persist+restore capability signing seed ([#234](https://github.com/IT4Change/web-of-trust/issues/234)) ([2abc70c](https://github.com/IT4Change/web-of-trust/commit/2abc70c40451fc5ea160d0267aaa6069af903e46))
* **sync:** Reseed  Capability-Praesentation deferrt bei fehlenden Keys statt zu crashen ([21a8223](https://github.com/IT4Change/web-of-trust/commit/21a8223d42eae3baf92c3390434069cbfd6cc07f))
* **vault:** bound every VaultClient fetch with an AbortController timeout ([46b2f4e](https://github.com/IT4Change/web-of-trust/commit/46b2f4e9c45032e319aef06dfd79d1c0af3d3e5c))
* **vault:** VaultClient-fetch-Timeout  kappt den 5G-Startup-Hang (ohne Init-Umbau) ([29ca509](https://github.com/IT4Change/web-of-trust/commit/29ca5095b682c45a2ee4e34bbf9e58d0d00bfdb5))
</details>

<details><summary>relay: 0.1.5</summary>

## [0.1.5](https://github.com/IT4Change/web-of-trust/compare/relay-v0.1.4...relay-v0.1.5) (2026-07-22)


### Features

* **1.B.3-key-rotation:** produktive Capability-JWS-Schicht + ECIES-Wire-Migration ([477a083](https://github.com/IT4Change/web-of-trust/commit/477a0835a48d067d45ca5d967c151f4897492ead))
* **core,relay,adapters:** KEY_GENERATION_STALE re-emit for the legitimate lagger (Slice SR VE-C2) ([2e9c150](https://github.com/IT4Change/web-of-trust/commit/2e9c15041109f52d232dbc71d9f09223dabe9099))
* **e2e:** Spur-C remote-relay enablement + read-only relay stats (D1) ([12c9757](https://github.com/IT4Change/web-of-trust/commit/12c975781836800c4f2964039df5b3ef261d75ab))
* **inbox-wire:** relay to[0]-routing + ack/1.0-mapping (Step 7b) ([7c326bd](https://github.com/IT4Change/web-of-trust/commit/7c326bd638a18fac649e727b10da547d16db4e2a))
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
* **transport:** WireMessage-Union, K1-Auto-ACK-Guard, Relay to[0]-Routing + ack/1.0-Mapping ([6ba89b5](https://github.com/IT4Change/web-of-trust/commit/6ba89b540488f21387f63c0894133f021cbfcebd))


### Bug Fixes

* **1b3:** publish empty /v and /a on offline-retry; untrack tsbuildinfo (Codex review [#198](https://github.com/IT4Change/web-of-trust/issues/198)) ([6f33008](https://github.com/IT4Change/web-of-trust/commit/6f3300886bdf9f7225e928810f3278f2b6e29655))
* **1b3:** re-derive isVerification from stored vcJws on storage read (review BLOCKER) ([6f3420f](https://github.com/IT4Change/web-of-trust/commit/6f3420ff44004ca8c1a57f6825c83ef5cafb8e84))
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
* **sync:** bind space rotation retries to key material ([a35748d](https://github.com/IT4Change/web-of-trust/commit/a35748dae1797eeee201b7b44ccd8a302573b1ac))
* **sync:** make generation gap recovery broker-authoritative ([1db6150](https://github.com/IT4Change/web-of-trust/commit/1db6150f49ec6e774393a8333668aad08d09c9ce))
* **sync:** recover generation gaps and revoke self admin ([25a4dac](https://github.com/IT4Change/web-of-trust/commit/25a4dac66e27a98e08256c7bad7b254597be91ac))
* **test:** bind port:0 + read bound port to remove free-port TOCTOU flake ([f512e10](https://github.com/IT4Change/web-of-trust/commit/f512e10534728d691ccef308ef5b7f06c83feb99))
</details>

<details><summary>vault: 0.1.4</summary>

## [0.1.4](https://github.com/IT4Change/web-of-trust/compare/vault-v0.1.3...vault-v0.1.4) (2026-07-22)


### Bug Fixes

* **1b3:** publish empty /v and /a on offline-retry; untrack tsbuildinfo (Codex review [#198](https://github.com/IT4Change/web-of-trust/issues/198)) ([6f33008](https://github.com/IT4Change/web-of-trust/commit/6f3300886bdf9f7225e928810f3278f2b6e29655))
* **1b3:** re-derive isVerification from stored vcJws on storage read (review BLOCKER) ([6f3420f](https://github.com/IT4Change/web-of-trust/commit/6f3420ff44004ca8c1a57f6825c83ef5cafb8e84))
</details>

<details><summary>profiles: 0.3.0</summary>

## [0.3.0](https://github.com/IT4Change/web-of-trust/compare/profiles-v0.2.0...profiles-v0.3.0) (2026-07-22)


###   BREAKING CHANGES

* **wot-core:** delete ProfileService + ./services subpath (breaking removal)

### Features

* **1b3:** discovery-recovery + discovery-attestations  /a+/v Compact-JWS ListResource, Rollback, Server-Monotonie, Recovery-Workflow ([c9fa7d3](https://github.com/IT4Change/web-of-trust/commit/c9fa7d34ba6a375c288f16d439e0ae7642d482b8))
* **1b3:** OfflineFirst verifications-dirty + wot-profiles server-monotonicity (Step 4) ([72d1f3c](https://github.com/IT4Change/web-of-trust/commit/72d1f3cf86ddc612348cdfc5ea059cb7ff632969))


### Bug Fixes

* **1b3:** address CodeRabbit + Copilot review (defensive copies, overflow guards, test hardening) ([edd7955](https://github.com/IT4Change/web-of-trust/commit/edd795581a6aef1a66fd8e81cf3a71851fdb6e31))
* **1b3:** wot-profiles enforces mandatory integer version + always-on monotonicity (review MAJOR 1) ([7ae10c7](https://github.com/IT4Change/web-of-trust/commit/7ae10c74d6d3e0fc2a6db7bbcb10d9f0d0c9aea4))
* **discovery,protocol:** address [#186](https://github.com/IT4Change/web-of-trust/issues/186) re-review bot findings ([af8e818](https://github.com/IT4Change/web-of-trust/commit/af8e818a90454abd6094bff414278363b461e440))
* **docker:** relay+profiles bauen [@web](https://github.com/web)_of_trust/core aus dem Workspace ([76adf02](https://github.com/IT4Change/web-of-trust/commit/76adf0252078e8fcdacb92136e02c99751d05ac1))


### Code Refactoring

* **wot-core:** delete ProfileService + ./services subpath (breaking removal) ([f88d913](https://github.com/IT4Change/web-of-trust/commit/f88d913607e14a0561f605ce31c349d1aea87730))
</details>

---
This PR was generated with [Release Please](https://github.com/googleapis/release-please). See [documentation](https://github.com/googleapis/release-please#release-please).