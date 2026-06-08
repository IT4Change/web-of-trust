# Phase 1: WoT Core + Demo — Sprint Plan

## Ziel

Am Ende dieser drei Wochen ist `@web_of_trust/core` eine stand-alone publizierbare TypeScript-Bibliothek, deren Verhalten jede normative Regel der WoT-Spec messbar erfüllt. Die Demo-App nutzt sie zu 100% über React-Hooks. Drittkonsumenten können das Paket installieren, ohne die Demo zu kennen.

## Endzustand (Sprint-Erfolg)

| # | Was steht am Ende |
|---|---|
| 1 | `services/*` (EncryptedSyncService, GroupKeyService, ProfileService) gelöscht; Funktionalität als Workflows in `application/*` |
| 2 | `pnpm pack` produziert installierbares Tarball, `scripts/smoke-third-party-consumer.mjs` grün in CI, `exports`-Map sauber, README dokumentiert Subpaths |
| 3 | Demo zu 100% über Hooks: ESLint-Regel verhindert direkte Core-Imports außerhalb von `hooks/wot/` und `runtime/` |
| 4 | `pnpm --filter @web_of_trust/core test/typecheck/build` + `pnpm --filter demo test/build` + `npm run validate` in `wot-spec` grün |
| 5 | `SPEC-AUDIT.md` ohne offene `blocker`-Drifts: A2-1, A2-2, B2ack-1 (5 Stellen), B2ack-2, B2ack-3 adressiert oder explizit nach Phase 2 verortet |

## Status (was schon erledigt ist)

| Sub-Phase | Status |
|---|---|
| 1.A.1, 1.A.1.1, 1.A.2 | ✅ gemerged (PR #153, #160, #163); 1.F.0 Spot-Check → A2-1, A2-2 in `SPEC-AUDIT.md` |
| 1.B.1 (`wot-identity@0.1`) | ✅ gemerged (PR #158) |
| 1.B.2-ack | ✅ gemerged (PR #166); 1.F.0 Spot-Check → B2ack-1, B2ack-2, B2ack-3 in `SPEC-AUDIT.md` |
| 1.B.2-verification (PR #173) | ❌ verworfen wegen "behavior-preserving"-Anker; neu als 1.B.2-verification-v2 |
| 1.F.0 Spot-Check | ✅ in `SPEC-AUDIT.md` (Rebuild 2026-06-08 gegen `spec-vnext` @ `1e39f4d`) |
| Master-Plan-Patch + Audit-Rebuild | 🟡 PR #176 (dieses Dokument), bereit für Merge |

## 3-Wochen-Sprint (wochengranular)

| Woche | Schwerpunkt | Spec-Anker |
|---|---|---|
| **W1** | `1.B.3-encrypted-sync` (~29 Call-Sites in Automerge + Yjs; ggf. zwei Sub-Slices parallel) | Sync 001 Z.87 + Z.103-105, Sync 002 |
| **W2** | `1.B.3-group-key` → `1.B.3-profile-service` → `1.B.2-verification-v2` (5 Demo-Stellen, B2ack-3 vorgeklärt) → `1.B.3-member-key-directory` (inkl. A2-2-Re-Aktivierung) | Sync 003/004/005 + Trust 002 |
| **W3** | `1.B.3-sync-recovery` + `1.B.3-discovery-recovery` + `1.B.3-device-keys` + Adapter-Audit → `1.D Demo-Hooks` (inkl. B2ack-2 + A2-1-Cross-Repo-Check) → `1.E Test-Migration` → `1.C Standalone-Publikation` | Sync 004 §Recovery + Identity 004 |

Parallelisierung erlaubt: file-isolierte 1.B.3-Sub-Slices können in mehreren Worktrees parallel laufen. 1.D + 1.E ebenfalls parallel.

Tag-Granularität ist bewusst weggelassen — Slice-Größen verschieben sich realistisch. Wochen-Schwerpunkte sind verbindlich.

## Slice-Liste (kompakt)

| Slice | Löscht | Schreibt neu | Spec-Anker |
|---|---|---|---|
| `1.B.3-encrypted-sync` | `services/EncryptedSyncService.ts` | `application/sync/encrypted-change-workflow.ts` mit `encryptLogEntry` (deterministisch) + `encryptOneShot` (random) | Sync 001 Z.87, Z.103-105 |
| `1.B.3-group-key` | `services/GroupKeyService.ts` | `application/sync/group-key-workflow.ts` + `ports/key-management.ts` | Sync 005 Z.243-252, §Verantwortlichkeitsgrenzen |
| `1.B.3-profile-service` | `services/ProfileService.ts` | Funktionalität verteilt auf `application/discovery/*`, `application/identity/*`, `adapters/discovery/*` | Sync 004 Z.20, Z.153 |
| `1.B.2-verification-v2` | PR-#173-Approach (5 Legacy-Envelope-Stellen mit `ref` in Demo) | `application/verification/*` aus Spec | Sync 003 §Envelope + Trust 002 |
| `1.B.3-member-key-directory` | verworfener UltraCode-Worktree `phase-1/b3-sync-workflows` | Member-Update + Re-Aktivierung von `protocol/sync/space-capability.ts` (A2-2) | Sync 005 §member-update |
| `1.B.3-sync-recovery` | — | Framework-freier State-Machine-Workflow | Sync 004 §Recovery, Z.115-120 |
| `1.B.3-discovery-recovery` | — | Profile-JWS/DID-Verification + HTTP-Adapter | Sync 004 |
| `1.B.3-device-keys` | — | Device-Key-Creation/Binding als Application-Use-Case | Identity 004 |
| Adapter-Audit | nicht-konforme Wire-Formate | spec-konforme Adapter | Sync 003/004 |
| `1.D Demo-Hooks` | direkte Core-Imports in Demo | Hook-basierte Migration (inkl. B2ack-2 `useProfileSync.ts:51`, A2-1-Cross-Repo-Check vor Aufräum-Commit) | — |
| `1.E Test-Migration` | Legacy-Test-Verzeichnisse | Tests in `protocol`/`application`/`adapter`/`react`/`e2e`-Buckets | — |
| `1.C Standalone-Publikation` | — | `exports`-Map finalisiert, Smoke-Test, README | — |

Details pro Slice (Call-Sites, Konsumenten, Akzeptanz-Kriterien): siehe `SPEC-AUDIT.md` und Slice-PR-Body.

---

## Variante B (Disziplin)

> **Variante B ist die einzige Methode für Workflow-/Service-Migration in Phase 1.** Sie ersetzt die früheren Begriffe "Refactor", "Move", "umformen". Drift wird durch Löschen + Neuschreiben aus Spec behoben, nicht durch Verhaltens-Konservierung.

### Regel

> **Spec-konform implementieren. Alter Code wird nur konsultiert, um Konsumenten zu identifizieren — nicht um Verhalten abzulesen.**

Bei Konflikt zwischen alter Implementation und Spec-Konformität gewinnt die Spec. Ohne Ausnahme. Ohne Übergangs-Periode. Ohne "wir migrieren erst mal, später korrigieren wir".

### Verbotene Anker

- "behavior-preserving" / "byte-for-byte" / "exact equivalence" als Refactor-Ziel
- "Der alte Code macht das so, also vermutlich aus gutem Grund"
- "Wir behalten das alte Verhalten erst mal um Tests grün zu halten"
- "Demo Hook macht das so" / "CLI macht das so" als Workflow-Begründung
- Optionsfragen zu Themen, die in der Spec eine MUSS/SOLL/DARF-NICHT-Regel haben

### Verfahren pro Slice

1. **Spec-Section vollständig lesen.** Spec-Zitate (Datei:Zeile + Originaltext) für jede MUSS-Regel sammeln.
2. **Konsumenten identifizieren** im alten Code via `grep`. Liste anlegen.
3. **Neuen Code aus Spec-Zitaten schreiben.** Nicht aus altem Code abschreiben. Wenn man sich versucht zu erinnern "wie war es vorher": stoppen, Spec nochmal lesen.
4. **Tests aus Spec-Test-Vektoren** (falls vorhanden) + Application-Use-Case-Tests gegen Fake-Ports.
5. **Konsumenten umhängen** auf neue API. Konsumenten-Verhalten wird gegen eigene Spec-Domäne geprüft (Demo-UX, CLI-Output), nicht gegen alte Implementation.
6. **Alte Datei löschen.** Re-Exports + `exports`-Map cleanup. Keine Bridge-Module, kein `@deprecated`-Anker, keine Shims.

### Wenn die Spec wirklich schweigt (selten)

1. Issue in `real-life-org/wot-spec` mit Label `spec-conformance`. Body: Spec-Stelle (Datei:Zeile), beobachtete Mehrdeutigkeit, 2-3 Resolution-Optionen mit Trade-offs.
2. Im Code: temporäre Wahl + `// SPEC-UNKLAR: real-life-org/wot-spec#NN`-Kommentar.
3. Im PR-Body: erzeugte Spec-Issues auflisten.

Vor Issue-Erstellung muss dokumentiert sein: "Ich habe Section X.Y vollständig gelesen, suche nach Begriff Z, finde keine Aussage" mit `grep`-Output als Beleg. Verboten: Spec-Lücke mit lokalem Workaround dauerhaft auflösen.

---

## PR-Pflichtbausteine (Checkliste)

Jeder Slice-PR ab 1.B.3 enthält:

- [ ] **Spec-Zitat-Block** im Body: pro Implementations-Entscheidung `Entscheidung / Spec-Zitat (wot-spec/datei:zeile) / Code-Anker (pfad:zeile)`. Leerer Block ist nur für reine Struktur-Slices erlaubt und muss explizit benannt werden.
- [ ] **Konsumenten-Migration-Trace**: welche alten Call-Sites wurden auf welche neue API umgehängt.
- [ ] **Doku-Sync**: für jeden umbenannten, verschobenen oder gelöschten Pfad/Symbol/Wert `grep` gegen `docs/CURRENT_IMPLEMENTATION.md`, `docs/architecture/`, `docs/reference-implementation/`, `docs/migration/`, `packages/wot-core/src/protocol/COVERAGE.md` (ab 1.C: README). Leere Liste = "gegrept, nichts gefunden", nicht "nicht gesucht".
- [ ] **Test-First-Commits markiert**: pro neuem oder verschobenem Workflow mindestens ein Application-Use-Case-Test, der zeitlich vor der Implementation liegt.
- [ ] **5-Punkte-Traceability-Block** (aus `reference-implementation/README.md`): Spec-Refs, Conformance-Profil, Implementation-Modul, Tests/Vektoren, Open Spec Questions.
- [ ] **Bestätigung**: kein "behavior-preserving"-Anker verwendet; alter Code wurde nur für Konsumenten-Identifikation konsultiert.

Loop-Review-Should-Fix wegen Spec-Drift oder Doku-Drift gilt als vermeidbar. Findings werden im Folge-Commit gefixt, nicht im Folge-PR.

---

## TDD-Reihenfolge

Verbindlich für 1.B.* und 1.D (reine Datei-Verschiebungen ausgenommen):

1. **Protocol-Vektor-Test** gegen `wot-spec/test-vectors/` (rot oder grün laden).
2. **Application-Use-Case-Test** mit Fake-Ports (rot). In-Memory-Stores, fixe Clocks, deterministische RNG.
3. **Workflow implementieren** bis (2) grün ist.
4. **Adapter-Contract-Test** gegen den neuen Port. Gleicher Contract läuft gegen In-Memory- und reale Adapter.
5. **React-Hook-Test** (State-Transitions, Error-Handling). Keine Crypto-Wiederholung im Hook.
6. **Refactor** bei grünen Tests.

Test schwer zu schreiben = Spec-Lücke oder Architektur-Frage. Sofort Issue, kein "ich denk's mir aus".

---

## Definition of Done

1. **`services/*` leer oder gelöscht** (EncryptedSyncService, GroupKeyService, ProfileService).
2. **Standalone-Publikation funktioniert**: `pnpm pack` Tarball, Smoke-Test grün in CI, `exports`-Map dokumentiert.
3. **Demo zu 100% via Hooks**: ESLint-Regel aktiv, 0 direkte Core-Imports außerhalb `hooks/wot/` + `runtime/`.
4. **Test-Suite grün**: `pnpm --filter @web_of_trust/core test/typecheck/build` + `pnpm --filter demo test/build` + `npm run validate` in `wot-spec`.
5. **TDD-Spur pro Workflow nachweisbar** in Commit-History oder PR-Body.
6. **`src/crypto/` minimal**: nur `envelope-auth.ts` + `index.ts` mit Spec-Divergenz-Doku (Verweis auf [wot-spec#96](https://github.com/real-life-org/wot-spec/issues/96) und Sync 003 Z.343/410) + Phase-2-Sterbe-Marker. Vollständige Löschung erbt Phase 2.
7. **`SPEC-AUDIT.md` ohne offene `blocker`-Drifts**: A2-1, A2-2, B2ack-1 (5 Stellen), B2ack-2, B2ack-3 adressiert oder explizit nach Phase 2 verortet.
8. **Spec-Zitat-Block in jedem Code-Slice-PR ab 1.B.3** (rückwirkend nicht erzwingbar für 1.A/1.B.1/1.B.2-ack).

---

## Nicht-Ziele

- Kein `packages/wot-react/`-Paket extrahieren (Phase 2 mit RLS).
- Kein CRDT-Adapter-Stack-Refactor (Phase 2: Legacy-MessageEnvelope-Cleanup in Automerge + Yjs).
- Kein RLS-/HMC-Extensions-Refactor (Phase 2/3).
- Kein UI-Redesign.
- Keine DIDComm-Mediator-/JWE-Erweiterung außerhalb existierender Spec.
- Keine Mobile-Release-Pipeline-Änderungen (Phase 4).

---

## Verweise

| Dokument | Wofür |
|---|---|
| `docs/migration/SPEC-AUDIT.md` | aktuelle Drift-Befunde + Slice-Verortung pro Befund |
| `wot-spec/IMPLEMENTATION-ARCHITECTURE.md` | Layer-Regeln, Import-Regeln, Migrations-DoD |
| `wot-spec/ARCHITECTURE.md` | Arbeitsprinzipien (Punkt 6: Implementierungsdetails dürfen Spec informieren, nicht ersetzen) |
| `wot-spec/CONFORMANCE.md` + `wot-spec/test-vectors/` | normative Profil-Definitionen + Test-Vektoren |
| `web-of-trust/docs/reference-implementation/README.md` | Authority Model, 5-Punkte-Traceability-Block für PRs |
| `web-of-trust/docs/reference-implementation/legacy-boundary-map.md` | 12-Punkte DoD aus Modul-Klassifikation |
| `web-of-trust/docs/reference-implementation/runtime-port-contract-map.md` | Detail-Backlog (Candidate-Liste) |
| `web-of-trust/docs/reference-implementation/demo-consumer-map.md` | Import-Debt-Inventory, Adapter-Capability-Requirements |
| `web-of-trust/docs/wot-core-test-migration.md` | Test-Bucket-Klassifikation |
