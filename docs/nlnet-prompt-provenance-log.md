# NLNet Application — Prompt Provenance Log

As required by [NLNet's Generative AI Policy](https://nlnet.nl/foundation/policies/generativeAI/), this document logs all generative AI interactions used in preparing the NLNet NGI Zero Commons Fund application.

**Model:** Claude Opus 4.6 (Anthropic), model ID: `claude-opus-4-6`
**Tool:** Claude Code (CLI), running locally
**Applicant:** Anton Tranelis

---

## Interaction 1 — Initial Draft (2026-02-11)

### Prompt (Interaction 1)

> Write an NLNet NGI Zero Commons Fund application for the Web of Trust project. Read the project documentation (CURRENT_IMPLEMENTATION.md, adapter-architektur-v2.md, architektur.md). Budget: €50,000. 5 Work Packages:
>
> - WP1 Authorization/UCAN (€10k)
> - WP2 Social Recovery/Shamir (€6k)
> - WP3 Federated Messaging/Matrix or Nostr (€12k)
> - WP4 Security Audit (€15k)
> - WP5 Community Pilot & Docs (€7k)
>
> License: AGPL-3.0. Applying as individual from Germany.

### Unedited Output (Interaction 1)

The AI generated a complete application draft (218 lines) based on the project documentation. Committed on 2026-02-16 as part of commit `13893fb`. The full unedited output is preserved in git history:

```
git show 13893fb:docs/nlnet-application-2026.md
```

Key content of the initial draft:
- 5 Work Packages totaling €50,000
- WP2 based on Shamir Secret Sharing
- Referenced Automerge as CRDT (pre-Yjs migration)
- 182 tests, 2 deployed services
- Single npm package (`@real-life/wot-core`)
- AI Disclosure section included

### Applicant Edits After Interaction 1

Minor formatting and wording adjustments. No structural changes at this stage.

---

## Interaction 2 — Update During Documentation Consolidation (2026-03-15)

### Context (Interaction 2)

Between Interaction 1 and 2, the project underwent significant technical changes: migration from Automerge to Yjs as default CRDT, package separation (adapter-yjs, adapter-automerge), test count grew from 182 to 534, 3rd service (Profiles) deployed, 7 end-to-end tests added.

### Prompt (Interaction 2)

> Update the NLNet application to reflect the current state. We now have 534 tests, 7 E2E tests, Yjs as default CRDT, Automerge as option, 3 deployed services, and published npm packages @real-life/wot-core, @real-life/adapter-yjs, @real-life/adapter-automerge. Update test counts, CRDT references, service count, and npm packages. Also update WP1 to reflect that AuthorizationAdapter core is already implemented.

### Unedited Output (Interaction 2)

The AI updated the existing application with current numbers and technology references. Committed as part of `b69f51e` (2026-03-15). The full output is preserved in git history:

```
git show b69f51e:docs/nlnet-application-2026.md
```

Key changes in this update:
- Test count: 182 → 534, added 7 E2E tests, 3 services
- CRDT: "currently Automerge" → "Yjs default, Automerge option"
- Added CRDT-agnostic adapter architecture description
- Added in-browser benchmark suite reference
- Updated npm packages list (3 packages)
- WP1: noted that AuthorizationAdapter core is already implemented
- Updated framework evaluation count: 8 → 16

### Applicant Edits After Interaction 2

No additional edits — the update was factual (numbers, technology names).

---

## Interaction 3 — Major Rewrite (2026-03-16)

### Context (Interaction 3)

Team member Sebastian Stein provided detailed feedback on the application. The applicant discussed scope, budget, and strategy with the AI over an extended session (~50 messages). The full transcript is available on request as a JSONL file.

### Applicant Direction (Interaction 3)

> Incorporate Sebastian's feedback. Specifically:
>
> 1. Rewrite "Why I build this" — more personal, less manifesto
> 2. Remove WP3 (Federation) — too risky, our Relay works fine
> 3. Remove WP4 (Security Audit) — €15k is not enough for a real audit, ask NLNet for guidance instead
> 4. Replace Shamir Secret Sharing with guardian-based recovery using the trust network itself
> 5. Primary audience is developers building decentralized software, not communities directly
> 6. Add timeline with Q1/Q2/Q3 milestones
> 7. Reduce budget from €50k to ~€28k
> 8. Add sustainability section
> 9. Shorten AI disclosure
> 10. "Commons infrastructure" as a thread throughout
> 11. Mention Sebastian Stein as team member
> 12. Add Utopia Map metrics (860 users, ~60 instances)
> 13. Define "community" clearly: local real-world communities, not online
> 14. Mention Real Life Stack as first application built on WoT

### Unedited Output (Interaction 3)

The AI generated a complete rewrite incorporating all of the above direction. The full output is preserved in this commit's version of `docs/nlnet-application-2026.md`.

Key changes in this rewrite:
- Budget: €50,000 → €28,000
- 4 Work Packages (down from 5): Authorization €10k, Recovery €8k, DX €5k, Community €5k
- WP2: Shamir → Guardian-based recovery using the trust network
- "Why I build this": personal motivation, concrete problem
- Developer-first framing: primary audience is developers
- Added: sustainability, security section, accessibility mention
- Added: timeline with quarterly milestones
- AI Disclosure shortened + reference to this log file

### Applicant Edits After Interaction 3

None — the rewrite was committed as-is.

---

## Summary

| Interaction | Date | Purpose | Scope |
| --- | --- | --- | --- |
| 1 | 2026-02-11 | Initial draft | Full application, 5 WPs, €50k |
| 2 | 2026-03-15 | Factual update | Numbers, technology names |
| 3 | 2026-03-16 | Major rewrite | New scope, 4 WPs, €28k, complete restructuring |

All outputs are preserved in git history. Full conversation logs are available on request.

**What was AI-generated:** Structure, prose, and formatting of the application text.

**What was human-directed:** Fund selection, all architecture decisions, technology choices, budget amounts, work package definitions, scope decisions, team composition, community strategy, and the decision to reduce scope based on team feedback.
