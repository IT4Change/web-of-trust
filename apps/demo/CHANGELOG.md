# Changelog

## [0.4.0](https://github.com/IT4Change/web-of-trust/compare/app-v0.3.8...app-v0.4.0) (2026-09-24)


### ⚠ BREAKING CHANGES

* **ci:** WoT flavorlos — build-on-tag baut APK (F-Droid) + AAB (Play)

### Features

* **adapters:** I-READ "Key-available ⇒ replayBlockedByKey" on all key-available paths (Yjs + Automerge) ([3bae587](https://github.com/IT4Change/web-of-trust/commit/3bae587e1810bd649d793d348df9975e13fc687f))
* App-Releases über release-please (unified train) + volle Doku ([2ea1656](https://github.com/IT4Change/web-of-trust/commit/2ea1656030d559e96ea84731e2c1873c6370fe48))
* App-Releases über release-please (unified train) + volle Doku ([1286106](https://github.com/IT4Change/web-of-trust/commit/1286106bbf4603ccbf1b696ce9eea99c120695e1))
* **ci:** WoT flavorlos — build-on-tag baut APK (F-Droid) + AAB (Play) ([c744053](https://github.com/IT4Change/web-of-trust/commit/c7440534eaec8d5039bb46f935cf76772010a297))
* **core,adapters,demo:** Durable Wiring — completion gate (headline e2e + reload-decrypt + onSecurityError) ([4e5774d](https://github.com/IT4Change/web-of-trust/commit/4e5774df38a07c90fe10f6f0f208a3bc164c76b4))
* **core:** I-CAP — content-bound capability import on the duplicate key-rotation path (multi-device write after rotation) ([2d570e6](https://github.com/IT4Change/web-of-trust/commit/2d570e6c1b700c646e840f220467fea5458180ba))
* **demo,adapters:** generischer Dialog-Lifecycle multi-device (synced dismissedNotifications) ([a1ef3d8](https://github.com/IT4Change/web-of-trust/commit/a1ef3d87b2da52ee24ffde8e89c3de0ae072b2cd))
* **demo:** A2 Teil A — wire PersonalLogSyncAdapter onto the durable-log path [WIP: E2E hardening pending] ([e7aef1d](https://github.com/IT4Change/web-of-trust/commit/e7aef1db6eb9cc78ed79f46510b32bfac6686274))
* **demo:** app-wide connect FAB on mobile ([d8f4688](https://github.com/IT4Change/web-of-trust/commit/d8f4688ae0ca2c0ded1eb4aef452568f28833355))
* **demo:** Consent-Modell — Veröffentlichen im Verbunden-Dialog statt Silent-Auto-Accept ([8a56881](https://github.com/IT4Change/web-of-trust/commit/8a568819f1a748cb2490d748dd72e84409d1a9c0))
* **demo:** D2 — gated in-app test/observability channel (Spur-B enabler) ([9891ca9](https://github.com/IT4Change/web-of-trust/commit/9891ca9fa2b4af689f4dad87b7f848d124b7bd5e))
* **demo:** Durable Wiring Phase 2c — activate logSync in the demo composition (gate flip) ([df0fda5](https://github.com/IT4Change/web-of-trust/commit/df0fda58585b9f8883364138ce238318f1415b3d))
* **demo:** gate password step until confirmation matches ([cf51557](https://github.com/IT4Change/web-of-trust/commit/cf51557dbd20f24217747c4ab45995630937b8e4))
* **demo:** Kontakte-Graph-Tab + Live-Graph-Bugfixes ([6861d8f](https://github.com/IT4Change/web-of-trust/commit/6861d8ffd608166e339cd2b92094c4c4c3684cb6))
* **demo:** Live-Trust-Graph — Auto-Publish von Verifikationen + Graph aus Cache + Beamer-Modus ([90b1534](https://github.com/IT4Change/web-of-trust/commit/90b15345d5770032275a972f478651d83312402e))
* **demo:** Per-App-Sprache über Android-Systemeinstellungen (localeConfig + native-aware i18n) ([#271](https://github.com/IT4Change/web-of-trust/issues/271)) ([0981113](https://github.com/IT4Change/web-of-trust/commit/0981113382a059ff7455da9b9e94ae4d3b47e4cb))
* **demo:** persistent two-checkmark attestation delivery status ([eeda1a9](https://github.com/IT4Change/web-of-trust/commit/eeda1a9f756c4602b14236a136cbdb83c68db6db))
* **demo:** Spur-B native device dry-run — staging-debug build + operator runbook ([17b2ae5](https://github.com/IT4Change/web-of-trust/commit/17b2ae53dade728ad0bfc4741e96dfdecaffc112))
* **demo:** UI-Camp-Paket — Safe-Area-Fix, Verbinden-FAB, Passwort-Gate ([beb286e](https://github.com/IT4Change/web-of-trust/commit/beb286e73f3352d37ebb8b337799d9f1e225ef8c))
* **demo:** wire discovery-dual + per-broker relay visibility (Stage A.2) ([0153bb7](https://github.com/IT4Change/web-of-trust/commit/0153bb7bc55705656a5d4936bbea95b3f1524d24))
* **demo:** Zwei-Häkchen-Zustellstatus für Attestationen (persistent) ([e4f42f4](https://github.com/IT4Change/web-of-trust/commit/e4f42f4aea0d5b5a5fbbeda41475ea1812070a2a))
* **deploy:** offline WoT demo box for Raspberry Pi ([8eecb42](https://github.com/IT4Change/web-of-trust/commit/8eecb42b41484aae1c69eb50b465b10ba0f27cca))
* **discovery:** Stage A.2 — Discovery-Dual + Relay-Sichtbarkeit ([d55a51d](https://github.com/IT4Change/web-of-trust/commit/d55a51df28d69af8ff918419414a071602fbf9e8))
* **graph:** volle Breite, Kontaktlisten-Placeholder, kein Glow-Clipping ([#273](https://github.com/IT4Change/web-of-trust/issues/273)) ([665031d](https://github.com/IT4Change/web-of-trust/commit/665031d190b306b62efa80583325cd9ad1a7d762))
* **identity:** Magic Words nummeriert kopieren ([#278](https://github.com/IT4Change/web-of-trust/issues/278)) ([0b66b39](https://github.com/IT4Change/web-of-trust/commit/0b66b398b74a20300bd087eac446dd9134097e4b))
* **sync:** dual-broker Stage A — camp handshakes work anywhere (Sync 003 Multi-Broker) ([a6fa2cc](https://github.com/IT4Change/web-of-trust/commit/a6fa2ccee39af0b42116ae307243c1ae42605b60))
* **sync:** Dual-Broker Stufe A — Camp-Handshakes funktionieren überall ([6822f0b](https://github.com/IT4Change/web-of-trust/commit/6822f0b2ff79fa7e42a23296a227462e4fa1126c))


### Bug Fixes

* App als release-type node — node-workspace-Kaskade greift jetzt wirklich ([5df6ee7](https://github.com/IT4Change/web-of-trust/commit/5df6ee70916b552b9d20808578714d5038333f87))
* **attestation:** bind receipt-ack id to (jti, sender) — prevent confirmation replay-DoS ([28c39a9](https://github.com/IT4Change/web-of-trust/commit/28c39a90b0a1b00e65c2b76e9b9c408f73421292))
* **attestation:** bind receipt-ack to the original recipient + harden discriminator ([99afbaa](https://github.com/IT4Change/web-of-trust/commit/99afbaafd0ff685749a05bc039889dcc239d8de3))
* **ci:** Demo-Vite-Aliase auch fuer tiefe core-Subpfade — dist-Flake-Quelle beseitigt ([#294](https://github.com/IT4Change/web-of-trust/issues/294)) ([fd87ea2](https://github.com/IT4Change/web-of-trust/commit/fd87ea22ab664ef760fbfc190c49ead086cc78d0))
* **ci:** getrennte Web-Builds für F-Droid (OTA) und Play (kein OTA) ([74deb0c](https://github.com/IT4Change/web-of-trust/commit/74deb0cf36c775aa0356137693b2b9ba2fcb39a5))
* **ci:** testTimeout 20s für wot-core + demo — runWithTimeout-Flake-Familie ([#277](https://github.com/IT4Change/web-of-trust/issues/277)) ([593a973](https://github.com/IT4Change/web-of-trust/commit/593a97331fa38f317e6b11860eb9207965c8d120))
* **demo:** address review findings on safe-area scope and recovery gate ([2acc526](https://github.com/IT4Change/web-of-trust/commit/2acc5261eec3b472489b54354c349ef0d8f02b4a))
* **demo:** calm profile-sync status on partial dual-broker publish ([e6b18aa](https://github.com/IT4Change/web-of-trust/commit/e6b18aac270aab1e3ec70a8e97a6fc64020d35d4))
* **demo:** centralize durable-store wipe so key material never survives reset/delete/fresh-start ([14dc364](https://github.com/IT4Change/web-of-trust/commit/14dc3649cc9a5005932bd4eed4ec14d7a4095475))
* **demo:** clear Android system nav bar with bottom safe-area inset ([9e4af14](https://github.com/IT4Change/web-of-trust/commit/9e4af146a3de0ebcd0b91f7ec57999168518f831))
* **demo:** clipboard copy never throws ([#235](https://github.com/IT4Change/web-of-trust/issues/235)) ([de1644a](https://github.com/IT4Change/web-of-trust/commit/de1644a746467937012f65f2cbc1f2b3cf45a43f))
* **demo:** Clipboard-Copy crasht die App nicht mehr ([#235](https://github.com/IT4Change/web-of-trust/issues/235)) ([f02586e](https://github.com/IT4Change/web-of-trust/commit/f02586ec2cfd5601f9c891247a616c2f98a85b8d))
* **demo:** complete the seed-vault wipe so logout/delete redirects (Cluster B) ([a180fdf](https://github.com/IT4Change/web-of-trust/commit/a180fdfddb92f0cb8d72f488c31470613b6cb044))
* **demo:** cross-tier teardown completeness — wipe native keystore + seed-vault ([b5e5f10](https://github.com/IT4Change/web-of-trust/commit/b5e5f102cdaae2f42bf93e690f666e9df0a2698f))
* **demo:** cross-tier teardown completeness — wipe the native keystore + seed-vault ([6bf034d](https://github.com/IT4Change/web-of-trust/commit/6bf034dde71949b7f57ca322c7252a4d8eee2816))
* **demo:** dismiss event-id-scoped statt type-scoped (Review-Blocker [#228](https://github.com/IT4Change/web-of-trust/issues/228)) ([515d540](https://github.com/IT4Change/web-of-trust/commit/515d540937652a81009ea7e7216b40b97ae60729))
* **demo:** drop stale-generation collector resolutions in D2 DOM channel ([3984063](https://github.com/IT4Change/web-of-trust/commit/398406312b33f1f14efa6d9fca9393a3e69d2341))
* **demo:** einheitlicher FAB-Abstand zu App-Bar und rechtem Rand ([b0a7f23](https://github.com/IT4Change/web-of-trust/commit/b0a7f23e234ebf4e15f750ae46ba1fbc12a3ad18))
* **demo:** even FAB gap to bottom nav and right edge ([1e05be9](https://github.com/IT4Change/web-of-trust/commit/1e05be99522a2218d26ff49f582284ad3f652ecb))
* **demo:** Firefox/Brave-iOS-Onboarding-Crash — fremde Injektions-Fehler nicht als App-Crash werten ([f5531c4](https://github.com/IT4Change/web-of-trust/commit/f5531c408cb96ebfd53ed3742bc342d418cbff24))
* **demo:** fremde Browser-Injektions-Fehler nicht als App-Crash werten ([cc9a02b](https://github.com/IT4Change/web-of-trust/commit/cc9a02bdf5f2b4effa57bfc12eb8a0ac7a6ba243))
* **demo:** Graph — kombinierter Poll+Resize-Trigger + stabiler Measure-Container ([5b3e106](https://github.com/IT4Change/web-of-trust/commit/5b3e106bf7bda03894147225e85f024c816ce667))
* **demo:** IndexedDB-Guard — freundliche Meldung statt Crash bei blockiertem Speicher ([#272](https://github.com/IT4Change/web-of-trust/issues/272)) ([b987fb8](https://github.com/IT4Change/web-of-trust/commit/b987fb840a72eaa0547b260355e449d7ee234f99))
* **demo:** Kontakte-Tabs volle Breite (50/50 statt links geklebt) ([8a996ea](https://github.com/IT4Change/web-of-trust/commit/8a996eae7b552bf171af90bdfd6c51b18c7259a5))
* **demo:** Mutual-Dialog final — Schliessen + Profil ansehen (Antons Design) ([2f03e08](https://github.com/IT4Change/web-of-trust/commit/2f03e0802522b78ce5e50b4f7b7667142f672d2c))
* **demo:** Mutual-Dialog-Hierarchie umdrehen — Erfolgsmoment schuetzen (U1) ([4e7dc48](https://github.com/IT4Change/web-of-trust/commit/4e7dc48afedc48a79c57abdee1eb053a8db7dcf8))
* **demo:** Mutual-Dialog-Hierarchie umdrehen (U1) ([a7b1c3c](https://github.com/IT4Change/web-of-trust/commit/a7b1c3cfa3fb7fff745a8e7aff882f01a5dfd752))
* **demo:** native clipboard + visible copy fallback ([#235](https://github.com/IT4Change/web-of-trust/issues/235) review) ([dbf25cc](https://github.com/IT4Change/web-of-trust/commit/dbf25cc60fae749f14bc19b89c6ce70ae690dcc8))
* **demo:** pin side-loaded test builds to their shipped bundle ([#238](https://github.com/IT4Change/web-of-trust/issues/238)) ([c3a660e](https://github.com/IT4Change/web-of-trust/commit/c3a660ef725d8c49c7e6bbcbf2eb214a64bf21fc))
* **demo:** Polling-Overlap-Guard + Unmount-Guard für Graph-Cache-Sweeps (Codex-Review [#267](https://github.com/IT4Change/web-of-trust/issues/267)) ([595d1a1](https://github.com/IT4Change/web-of-trust/commit/595d1a1f9c30c78fe39a04fe3b34c9900b2b74e2))
* **demo:** Profil-Sync-Status ruhig bei Teil-Erfolg (Dual-Broker) ([48b2a29](https://github.com/IT4Change/web-of-trust/commit/48b2a293cf24f1f46fdc034f50d5bf9767301eb1))
* **demo:** Publish-Ziel = neueste Peer-Verifikation, beim Render berechnet (Codex-Delta-Review [#267](https://github.com/IT4Change/web-of-trust/issues/267)) ([170980e](https://github.com/IT4Change/web-of-trust/commit/170980eaafaab00489eb193279512851072f6add))
* **demo:** Side-loaded Test-Builds ziehen kein Produktions-OTA mehr ([#238](https://github.com/IT4Change/web-of-trust/issues/238)) ([ebeac8d](https://github.com/IT4Change/web-of-trust/commit/ebeac8d96d264e1dd5952d2ad7dcd7d0628457fe))
* **demo:** synchronously clear the data-testid DOM channel on unregister (D2 stale-identity blocker) ([aebfe58](https://github.com/IT4Change/web-of-trust/commit/aebfe5848a8b135b445118cfa852c777ddaef96b))
* **demo:** Verbindungen pro Peer-DID deduplizieren ([e26af7a](https://github.com/IT4Change/web-of-trust/commit/e26af7af9cb352d45c388903a6c9fb0782b03bd8))
* **demo:** W5 keystore tier fails closed — strict isEnrolled check (PR [#216](https://github.com/IT4Change/web-of-trust/issues/216) blocker) ([528e178](https://github.com/IT4Change/web-of-trust/commit/528e17858729333a8415f73b952a41d4e444a844))
* **e2e:** make the home-page check port-agnostic (path, not hard-coded :5173) ([5b1bc84](https://github.com/IT4Change/web-of-trust/commit/5b1bc84d374f41da5e5b753e20f14b470ea6f121))
* **e2e:** resolve tsx via workspace .bin in playwright global-setup ([8d872e5](https://github.com/IT4Change/web-of-trust/commit/8d872e5af6ab712676ecd9c925992f5fc2b8eacb))
* **e2e:** run the Playwright demo on a dedicated port (5273), not vite's 5173 ([51285e5](https://github.com/IT4Change/web-of-trust/commit/51285e5a66d1f084d0af6e53c3e364704c21bcd0))
* **inbox:** konkreten Prüf-Fehler bei invalid-inner-jws-Reject durchreichen ([35ef0fb](https://github.com/IT4Change/web-of-trust/commit/35ef0fbb0ad077dfce4d5349d9954c045e2bf61c))
* **inbox:** konkreten Prüf-Fehler bei invalid-inner-jws-Reject durchreichen ([2f819c6](https://github.com/IT4Change/web-of-trust/commit/2f819c67033dba2c64b5d86c19d3c4c5abaf27ca))
* **messaging:** Connect-Timeout mit echtem Abbruch im WebSocketMessagingAdapter ([#355](https://github.com/IT4Change/web-of-trust/issues/355)) ([45004a1](https://github.com/IT4Change/web-of-trust/commit/45004a1d193f1840ba10f7975098d82e1d25fdf2))
* **relay:** address inbox store-and-forward review findings (GC wiring, fan-out/completeness alignment, id-less key) ([6d3d552](https://github.com/IT4Change/web-of-trust/commit/6d3d55244e5f7374d771075df16d6021508688c9))
* Review-Blocker — extra-files-Pfad, node-workspace-Kaskade, strikter versionCode ([551a5d5](https://github.com/IT4Change/web-of-trust/commit/551a5d5b24d45ec0f4f0f5812abed8fd205b82a0))
* **sync:** bot-review round — empty vaultUrl guard, per-field getDocInfo merge, carrying-broker metrics URL, monitor XSS escape ([1ff898b](https://github.com/IT4Change/web-of-trust/commit/1ff898bb91f77716fc695bc57a610ca9e728f493))
* **sync:** dual-broker review round 1 — connect idempotency, hung-dial reset, receipt aggregation, vault snapshot freshness ([269c58e](https://github.com/IT4Change/web-of-trust/commit/269c58ef35034d9831d1be76cb0f3c9946e5b255))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @web_of_trust/adapter-automerge bumped to 0.3.0
    * @web_of_trust/adapter-yjs bumped to 0.3.0
    * @web_of_trust/core bumped to 0.6.0

## [0.3.8](https://github.com/real-life-org/web-of-trust/compare/app-v0.3.7...app-v0.3.8) (2026-09-24)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @web_of_trust/adapter-automerge bumped to 0.2.10
    * @web_of_trust/adapter-yjs bumped to 0.2.10
    * @web_of_trust/core bumped to 0.5.10

## [0.3.7](https://github.com/real-life-org/web-of-trust/compare/app-v0.3.6...app-v0.3.7) (2026-09-15)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @web_of_trust/adapter-automerge bumped to 0.2.9
    * @web_of_trust/adapter-yjs bumped to 0.2.9
    * @web_of_trust/core bumped to 0.5.9

## [0.3.6](https://github.com/real-life-org/web-of-trust/compare/app-v0.3.5...app-v0.3.6) (2026-09-11)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @web_of_trust/adapter-automerge bumped to 0.2.8
    * @web_of_trust/adapter-yjs bumped to 0.2.8
    * @web_of_trust/core bumped to 0.5.8

## [0.3.5](https://github.com/real-life-org/web-of-trust/compare/app-v0.3.4...app-v0.3.5) (2026-09-11)


### Bug Fixes

* **messaging:** Connect-Timeout mit echtem Abbruch im WebSocketMessagingAdapter ([#355](https://github.com/real-life-org/web-of-trust/issues/355)) ([45004a1](https://github.com/real-life-org/web-of-trust/commit/45004a1d193f1840ba10f7975098d82e1d25fdf2))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @web_of_trust/adapter-automerge bumped to 0.2.7
    * @web_of_trust/adapter-yjs bumped to 0.2.7
    * @web_of_trust/core bumped to 0.5.7

## [0.3.4](https://github.com/real-life-org/web-of-trust/compare/app-v0.3.3...app-v0.3.4) (2026-08-17)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @web_of_trust/adapter-automerge bumped to 0.2.6
    * @web_of_trust/adapter-yjs bumped to 0.2.6
    * @web_of_trust/core bumped to 0.5.6

## [0.3.3](https://github.com/real-life-org/web-of-trust/compare/app-v0.3.2...app-v0.3.3) (2026-08-05)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @web_of_trust/adapter-automerge bumped to 0.2.5
    * @web_of_trust/adapter-yjs bumped to 0.2.5
    * @web_of_trust/core bumped to 0.5.5

## [0.3.2](https://github.com/real-life-org/web-of-trust/compare/app-v0.3.1...app-v0.3.2) (2026-08-05)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @web_of_trust/adapter-automerge bumped to 0.2.4
    * @web_of_trust/adapter-yjs bumped to 0.2.4
    * @web_of_trust/core bumped to 0.5.4

## [0.3.1](https://github.com/real-life-org/web-of-trust/compare/app-v0.3.0...app-v0.3.1) (2026-08-04)


### Bug Fixes

* **inbox:** konkreten Prüf-Fehler bei invalid-inner-jws-Reject durchreichen ([35ef0fb](https://github.com/real-life-org/web-of-trust/commit/35ef0fbb0ad077dfce4d5349d9954c045e2bf61c))
* **inbox:** konkreten Prüf-Fehler bei invalid-inner-jws-Reject durchreichen ([2f819c6](https://github.com/real-life-org/web-of-trust/commit/2f819c67033dba2c64b5d86c19d3c4c5abaf27ca))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @web_of_trust/adapter-automerge bumped to 0.2.3
    * @web_of_trust/adapter-yjs bumped to 0.2.3
    * @web_of_trust/core bumped to 0.5.3

## [0.3.0](https://github.com/real-life-org/web-of-trust/compare/app-v0.2.7...app-v0.3.0) (2026-08-03)


### ⚠ BREAKING CHANGES

* **ci:** WoT flavorlos — build-on-tag baut APK (F-Droid) + AAB (Play)

### Features

* App-Releases über release-please (unified train) + volle Doku ([2ea1656](https://github.com/real-life-org/web-of-trust/commit/2ea1656030d559e96ea84731e2c1873c6370fe48))
* App-Releases über release-please (unified train) + volle Doku ([1286106](https://github.com/real-life-org/web-of-trust/commit/1286106bbf4603ccbf1b696ce9eea99c120695e1))
* **ci:** WoT flavorlos — build-on-tag baut APK (F-Droid) + AAB (Play) ([c744053](https://github.com/real-life-org/web-of-trust/commit/c7440534eaec8d5039bb46f935cf76772010a297))
* **identity:** Magic Words nummeriert kopieren ([#278](https://github.com/real-life-org/web-of-trust/issues/278)) ([0b66b39](https://github.com/real-life-org/web-of-trust/commit/0b66b398b74a20300bd087eac446dd9134097e4b))


### Bug Fixes

* App als release-type node — node-workspace-Kaskade greift jetzt wirklich ([5df6ee7](https://github.com/real-life-org/web-of-trust/commit/5df6ee70916b552b9d20808578714d5038333f87))
* **ci:** Demo-Vite-Aliase auch fuer tiefe core-Subpfade — dist-Flake-Quelle beseitigt ([#294](https://github.com/real-life-org/web-of-trust/issues/294)) ([fd87ea2](https://github.com/real-life-org/web-of-trust/commit/fd87ea22ab664ef760fbfc190c49ead086cc78d0))
* **ci:** getrennte Web-Builds für F-Droid (OTA) und Play (kein OTA) ([74deb0c](https://github.com/real-life-org/web-of-trust/commit/74deb0cf36c775aa0356137693b2b9ba2fcb39a5))
* Review-Blocker — extra-files-Pfad, node-workspace-Kaskade, strikter versionCode ([551a5d5](https://github.com/real-life-org/web-of-trust/commit/551a5d5b24d45ec0f4f0f5812abed8fd205b82a0))
