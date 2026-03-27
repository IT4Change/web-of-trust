# NLNet NGI Zero Commons Fund — Application

**Fund:** NGI Zero Commons Fund
**Deadline:** April 1, 2026, 12:00 CEST
**Note:** This application was drafted with the assistance of Claude (Anthropic, Opus 4.6). See AI Disclosure at the end.

---

## Contact Information

- **Name:** Anton Tranelis
- **Email:** mail@antontranelis.de
- **Phone:** +49 176 41556543
- **Organisation:** (none — applying as individual)
- **Country:** Germany

---

## General Project Information

### Proposal Name

**Web of Trust — Decentralized Identity and Trust Infrastructure**

### Website / Wiki

https://github.com/antontranelis/web-of-trust

### Abstract

Web of Trust is open commons infrastructure for decentralized identity, in-person verification, and end-to-end encrypted collaboration — built entirely on W3C standards (did:key, Ed25519) without reliance on centralized infrastructure.

Existing decentralized protocols (Nostr, Matrix, AT Protocol) solve messaging and social networking, but none provide a trust layer based on real-world encounters. Local-first CRDT frameworks (Yjs, Automerge, Jazz) solve data synchronization, but none include identity or trust. Web of Trust fills this gap: a JavaScript library that developers can integrate into any application to add self-sovereign identity, in-person verification, signed attestations, and encrypted group collaboration — with `npm install @real-life/wot-core`.

The architecture is CRDT-agnostic with 7 swappable adapter interfaces. This makes Web of Trust not only a library but also a testbed for local-first protocols: we have already built adapters for both Yjs and Automerge, evaluated 16 frameworks systematically, and published comparative benchmarks. Any component — storage, encryption, discovery, messaging, replication, authorization — can be replaced independently.

**What exists today (working prototype):**

- Identity system: BIP39 mnemonics → HKDF → Ed25519 signing + X25519 encryption + did:key
- In-person verification: challenge-response protocol with mutual QR-code exchange
- Attestation system: signed claims with end-to-end delivery via WebSocket relay (offline queue with ACK)
- Public profiles: JWS-signed, served via HTTP discovery service
- Encrypted group spaces: CRDT-based (Yjs default, Automerge option) with AES-256-GCM group key rotation
- Three blind infrastructure services: Relay (WebSocket), Vault (encrypted backup), Profiles (discovery) — servers see only encrypted bytes, never plaintext
- 534 passing tests across 6 packages, 17 end-to-end tests, 11 offline scenario tests
- Published npm packages: `@real-life/wot-core`, `@real-life/adapter-yjs`, `@real-life/adapter-automerge`
- Live demo tested with a small community: https://web-of-trust.de/demo/

**What this funding will enable:**

- Authorization system with UCAN-inspired capability delegation and revocation
- Identity recovery and key rotation using the trust network itself as guardian network — no secrets are shared, no server backup needed
- Developer documentation: getting-started guides, integration examples, API reference
- Community pilot with real user groups, using a reference application (Real Life Stack) built on Web of Trust
- We would also welcome NLNet's guidance on selecting an appropriate security reviewer for the cryptographic components

**Expected outcomes:**

Production-ready commons infrastructure that any developer can integrate into community applications — from cooperative platforms to local marketplaces to neighbourhood coordination tools — without depending on centralized platforms or corporate identity providers. The infrastructure belongs to the community, not to a company.

### Prior Experience

I am a full-time open-source developer based in Germany, working with Sebastian Stein (frontend developer). We have been self-funding our work on community-oriented software and will continue to work on Web of Trust full-time if funded.

- **Utopia Map** — An open-source mapping platform for local initiatives and community resources, with 860 registered users and approximately 60 map instances deployed by community groups across Germany. https://github.com/utopia-os/utopia-map

- **Web of Trust** — Over the past 3 months, I have designed and implemented the complete architecture from scratch: 7 adapter interfaces, two CRDT backends (Yjs + Automerge), 534 tests including 17 end-to-end tests and 11 offline scenario tests, 3 deployed services (Relay, Vault, Profiles), and comprehensive English documentation including a systematic evaluation of 16 frameworks, 6 DID methods, and detailed threat models. All self-funded. https://github.com/antontranelis/web-of-trust

- **Real Life Stack** — A modular UI component library for community applications, designed to work with Web of Trust as its identity and trust layer. Being developed in collaboration with Sebastian Stein as the first application built on Web of Trust. https://github.com/antontranelis/real-life-stack

**Why I build this:**

The internet was built on open protocols — but identity, trust, and collaboration have been captured by closed platforms. There is no open, decentralized standard for "I met this person and I trust them."

I want to change that. As a developer who has been building open-source community software for years, I see the same pattern everywhere: community groups that want to coordinate locally end up depending on corporate infrastructure. Their data, their relationships, their communication — all on servers they don't control.

I believe the building blocks for a better alternative exist today: local-first software, end-to-end encryption, self-sovereign identity. What's missing is someone putting them together into infrastructure that real communities can actually use. That's what I'm doing with Web of Trust.

**License:** AGPL-3.0 — ensuring that all modifications remain open, including server-side deployments. This aligns with the project's core principle: infrastructure that belongs to the community.

---

## Requested Support

### Amount

€28,000

### Budget Allocation

The project follows a phased development approach over approximately 9 months. Budget is allocated across 4 work packages:

**WP1: Authorization & Capability System (€10,000 — ~200h @ €50/h)**

- Extend existing AuthorizationAdapter (core is implemented: InMemoryAuthorizationAdapter + capabilities.ts)
- Capability delegation chains with full verification (read/write/delegate permissions)
- Space-level and item-level access control with revocation
- Persistent capability storage (currently in-memory only)
- Integration with Vault for capability backup
- Comprehensive test suite (target: 40+ additional tests)

**WP2: Identity Recovery & Key Rotation (€8,000 — ~160h @ €50/h)**

- Guardian-based recovery using the existing Web of Trust network — no secrets are shared
- User creates new DID, verified contacts confirm identity through signed attestations
- Configurable threshold (e.g., 3-of-5 guardians must confirm)
- Waiting period as protection against social engineering
- Key rotation as voluntary variant of the same mechanism
- DID migration: attestations and verifications transfer from old to new DID via equivalence proofs
- This approach is unique to Web of Trust: the guardian network exists naturally from in-person verifications — no artificial setup required

**WP3: Developer Experience & Documentation (€5,000 — ~100h @ €50/h)**

- Getting-started guide for integrating Web of Trust into existing applications
- Integration examples and tutorials
- API reference for all 7 adapter interfaces
- Package documentation for npm (`@real-life/wot-core`, `@real-life/adapter-yjs`)
- Contribution guidelines and governance model
- Accessibility considerations documented

**WP4: Community Pilot (€5,000 — ~100h @ €50/h)**

- Stabilize reference application (Real Life Stack) for pilot deployment — calendar, marketplace, map modules built on Web of Trust
- Identify and onboard pilot groups from our network of local community initiatives
- We have learned from previous deployments (Utopia Map, 860 users) that adoption requires excellent usability and low barriers to entry — Web of Trust and Real Life Stack are designed with these lessons in mind
- User onboarding materials (multilingual)
- Gather feedback, iterate, document lessons learned

**Total: €28,000**

### Timeline

| Quarter | Work Package | Milestones |
| --- | --- | --- |
| Q1 (Month 1-3) | WP1: Authorization | Capability delegation, persistent storage, revocation, 40+ tests |
| Q2 (Month 4-6) | WP2: Recovery & Rotation | Guardian recovery flow, key rotation, DID migration, equivalence proofs |
| Q3 (Month 7-9) | WP3 + WP4 | API reference, getting-started guide, npm docs; reference app stabilized, 2-3 pilot groups onboarded |

### Security

We have conducted an internal security review (threat model, crypto inventory, best practices documentation) and use established cryptographic libraries (WebCrypto API, @noble/ed25519) rather than custom implementations. We would welcome NLNet's guidance on selecting an appropriate external security reviewer for the cryptographic components.

### Sustainability

Web of Trust is designed for long-term sustainability beyond the funding period:

- **Open source (AGPL-3.0)** ensures the infrastructure remains community-owned
- **npm packages** allow any developer to integrate WoT into their applications, creating organic adoption
- **Real Life Stack** is the first application built on Web of Trust, demonstrating the integration path for others
- **Self-hostable infrastructure** — communities can run their own Relay, Vault, and Profiles services via Docker
- Future revenue through consulting, hosted infrastructure, and support for organizations deploying Web of Trust — while the core library remains free and open

### Other Funding Sources

No prior or current external funding. The project has been developed entirely through voluntary contributions and personal investment of time.

### Comparison

Web of Trust occupies a unique position in the landscape of decentralized identity and trust systems:

**vs. Solid / WebID:**
Solid focuses on data pods and linked data. Web of Trust focuses on trust relationships between people through real-world encounters. They are complementary — WoT could serve as a trust layer for Solid pods.

**vs. Keyoxide / OpenPGP Web of Trust:**
Keyoxide provides identity verification through cryptographic proofs linked to online accounts. Our Web of Trust requires in-person encounters for verification — a fundamentally different trust model that creates stronger, locality-based trust graphs.

**vs. Spritely / Object Capabilities:**
Spritely (by Christine Lemmer-Webber) uses object capabilities with OCAP patterns. We share the capability-based authorization philosophy but focus specifically on community-scale trust networks with BIP39 recovery, rather than general-purpose distributed computing.

**vs. Nostr:**
Nostr provides a lightweight relay-based messaging protocol. It lacks in-person verification and structured trust graphs. Web of Trust could use Nostr as a messaging transport — our adapter architecture makes this a drop-in replacement.

**vs. Matrix:**
Matrix provides federated messaging and E2EE (Megolm) but lacks a trust/verification layer based on real-world encounters. Like Nostr, Matrix could serve as a messaging transport within our adapter architecture.

**vs. AT Protocol (Bluesky):**
AT Protocol depends on centralized DID:PLC infrastructure and focuses on social media. It does not provide in-person verification or encrypted group collaboration.

**vs. CRDT frameworks (Automerge, Yjs, Jazz, DXOS, Loro):**
These are local-first CRDT frameworks for data synchronization. None include identity, trust, or encryption. We evaluated 16 of them systematically and built a CRDT-agnostic adapter architecture — Yjs is the default (pure JavaScript, fast on all devices), Automerge is available as a swappable option. Our contribution is the trust and identity layer that all these frameworks lack.

**What makes Web of Trust unique:**

1. Trust based on real-world encounters (not online proofs)
2. Framework-agnostic adapter architecture (swap any component)
3. Single BIP39 seed derives all keys (identity, encryption, storage)
4. No dependency on centralized infrastructure
5. Designed for community-scale, not planet-scale

### Technical Challenges

1. **Guardian-Based Identity Recovery:** Using the trust network itself for recovery — verified contacts confirm a new DID via signed attestations. The challenge is ensuring that the recovery threshold is secure against social engineering while remaining accessible when genuinely needed. Key rotation and DID migration must preserve existing attestations and verifications through equivalence proofs.

2. **CRDT Conflict Resolution with E2EE:** Our encrypt-then-sync pattern means CRDT merging happens on the client after decryption. This works across different CRDT backends (Yjs default, Automerge option — adapters are swappable), but creates challenges for concurrent edits when users are offline for extended periods — regardless of which CRDT engine is used.

3. **Capability Delegation Chains:** Implementing UCAN-like delegation where Alice grants Bob write access, and Bob can further delegate to Carol — while ensuring revocation propagates correctly in an offline-first, decentralized system without a central revocation list.

4. **Key Management Across Devices:** Deriving deterministic keys from a single BIP39 seed across different browsers and environments while maintaining security. Our HKDF-based derivation path solves this architecturally, but ensuring consistent behavior and secure seed storage across environments requires careful implementation.

### Ecosystem Engagement

**Primary audience: Developers building decentralized software**

Web of Trust is infrastructure — a JavaScript library that developers integrate into their applications. The npm packages (`@real-life/wot-core`, `@real-life/adapter-yjs`) provide self-sovereign identity, in-person verification, encrypted collaboration, and trust attestations as composable building blocks. Any developer building local-first, decentralized, or community-oriented software can add a trust layer without building their own identity system.

**Secondary audience: Local communities (via applications built on Web of Trust)**

Through applications like Real Life Stack and Utopia Map (860 users, ~60 community instances), we reach neighbourhood initiatives, cooperative gardens, repair cafés, foodsharing groups, and local exchange networks — real-world communities that meet in person, not online communities.

**Engagement Strategy:**

- **Developer outreach:** Publish integration guides, maintain npm packages, present at open-source conferences
- **Dogfooding:** Our team uses the tools we build. Real Life Stack is the first application built on Web of Trust.
- **Pilot programs:** Deploy with 2-3 real community groups, gather feedback, iterate
- **Documentation:** Comprehensive English documentation already exists (architecture, threat models, protocol specifications). Will be expanded with developer-facing guides and tutorials.
- **Standards participation:** Engage with W3C DID working group and local-first community. Our work on did:key, adapter patterns, and CRDT benchmarking has broader applicability.

---

## AI Disclosure

This application was drafted with the assistance of Claude (Anthropic, model: claude-opus-4-6) via Claude Code (CLI tool). All technical decisions, architecture choices, budget allocations, and strategic direction are the applicant's. The applicant reviewed, edited, and approved the final submission. See `docs/nlnet-prompt-provenance-log.md` for the full prompt provenance log.

---

## Checklist Before Submission

- [x] Contact information filled in
- [x] License: AGPL-3.0
- [x] LICENSE file in repository
- [x] Budget allocation reviewed (€28k, 4 WPs)
- [x] Work packages realistic and focused
- [x] Timeline with milestones
- [x] AI Disclosure with prompt provenance log
- [ ] Final review
- [ ] Transfer to NLNet submission form
