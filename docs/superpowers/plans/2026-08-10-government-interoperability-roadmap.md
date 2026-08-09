# Government Interoperability Roadmap Documentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update CivicFlow's main project documentation so the approved single-PBT-to-federated-government roadmap, product core, measurable gates, and future architecture are canonical without presenting future capability as implemented.

**Architecture:** Treat `docs/superpowers/specs/2026-08-10-government-interoperability-roadmap-design.md` as the approved source of truth. `PRODUCT.md` carries the durable product thesis, `docs/roadmap/product_roadmap.md` carries delivery phases and measurable gates, `docs/architecture/architecture.md` distinguishes current and future architectures, and `README.md` provides a short truthful entry point without duplicating the full design.

**Tech Stack:** Markdown, Git, PowerShell 5.1-compatible verification commands, existing Next.js 15 / React 18 / TypeScript repository gates; no runtime code or dependency changes.

## Global Constraints

- The repository remains a public MAIC T5 demonstration using 100% synthetic data; no production-government claim may be added.
- The current product remains multilingual civic casework, not a generic chatbot or generic enterprise agent platform.
- AI may detect language, classify, map fields, retrieve cited policy, summarise, and draft; authorised humans retain eligibility, approval, enforcement, payment, dispatch, formal sending, and closure decisions.
- Every actionable recommendation must have an approved policy citation or enter manual review; ambiguity remains default-deny.
- Start with one PBT and one shared governed core, then validate business licensing, flood/drainage, and education/welfare in that order.
- Agency systems remain systems of record. CivicFlow must not become a national data lake, citizen identity provider, or bypass around agency permissions.
- The three department chains are target hypotheses pending approval by the first PBT's business, policy, data, and system owners.
- Phase metrics are future entry/exit targets, not achieved values. Safety triggers pause a pilot immediately; missed value metrics block progression to the next phase.
- Do not modify `docs/submission/**`, application code, schemas, APIs, tests, dependencies, package metadata, or deployment configuration.
- Before modifying any approved specification, product context, roadmap, architecture, or README file, create its exact `*.bak-20260810` backup and verify that the backup did not already exist.
- Stage only files named in the current task. Do not stage `.superpowers/` visual-session state.
- Do not push, deploy, publish, merge, or delete branches.

---

### Task 1: Record approval and make the product thesis canonical

**Files:**
- Create: `docs/superpowers/specs/2026-08-10-government-interoperability-roadmap-design.md.bak-20260810`
- Create: `PRODUCT.md.bak-20260810`
- Modify: `docs/superpowers/specs/2026-08-10-government-interoperability-roadmap-design.md:3-8`
- Modify: `PRODUCT.md:1-30`

**Interfaces:**
- Consumes: the approved decisions and hard boundaries in `docs/superpowers/specs/2026-08-10-government-interoperability-roadmap-design.md`.
- Produces: the canonical short product definition and an auditable approved-spec status used by the roadmap, architecture, and README tasks.

- [ ] **Step 1: Verify targets and reserve non-overwriting backup names**

Run:

```powershell
$targets = @(
  'docs\superpowers\specs\2026-08-10-government-interoperability-roadmap-design.md',
  'PRODUCT.md'
)
$backups = @(
  'docs\superpowers\specs\2026-08-10-government-interoperability-roadmap-design.md.bak-20260810',
  'PRODUCT.md.bak-20260810'
)
$targets | ForEach-Object { if (-not (Test-Path -LiteralPath $_)) { throw "Missing target: $_" } }
$backups | ForEach-Object { if (Test-Path -LiteralPath $_) { throw "Backup already exists: $_" } }
```

Expected: exit `0`, with both targets present and neither backup present.

- [ ] **Step 2: Create dated pre-edit backups**

Run:

```powershell
Copy-Item -LiteralPath 'docs\superpowers\specs\2026-08-10-government-interoperability-roadmap-design.md' -Destination 'docs\superpowers\specs\2026-08-10-government-interoperability-roadmap-design.md.bak-20260810'
Copy-Item -LiteralPath 'PRODUCT.md' -Destination 'PRODUCT.md.bak-20260810'
```

Expected: exit `0`; `Get-FileHash` shows each backup equals its pre-edit source.

- [ ] **Step 3: Mark the design approved**

Change the specification status block to state exactly that the product owner approved the written specification on `2026-08-10`, that implementation planning is active, and that approval still does not mean any future capability is implemented.

Expected content assertions:

```text
书面规格已由产品负责人于 2026-08-10 批准
不代表未来功能已经实现
```

- [ ] **Step 4: Add the long-term product direction to `PRODUCT.md`**

Keep every current hard boundary and add four concise sections:

```markdown
## Long-term direction

One service experience, many systems of record.

CivicFlow's long-term direction is an AI-assisted, human-governed interoperability and casework layer for Malaysia's federated public services. It unifies citizen experience, service and case semantics, cross-department hand-offs, policy evidence and audit contracts while each agency retains its authoritative systems and statutory decisions.

## Unification means / does not mean

- Means: one submission, one tracking receipt, a shared service catalogue and case envelope, governed hand-offs, cited policy, named human responsibility, and certified connectors.
- Does not mean: replacing every agency application, centralising all government data, creating a national identity system, or transferring consequential decisions to AI.

## Core differentiators

- Policy-grounded rather than chatbot-style answers.
- Human-owned consequential decisions.
- Cross-department coordination without taking system-of-record ownership.
- Multilingual substantive-outcome equity, not interface translation alone.
- Auditable, portable and replaceable integration boundaries.

## Adoption sequence

One PBT → shared governed core → business licensing → flood/drainage → education/welfare → multi-agency federation only after measured gates pass.
```

Add a relative link to the approved detailed design and keep the current Stack section unchanged.

- [ ] **Step 5: Verify product-boundary wording**

Run:

```powershell
rg -n 'Long-term direction|One service experience|Unification means|Core differentiators|Adoption sequence|synthetic|AI never|not a generic' PRODUCT.md
rg -n '书面规格已由产品负责人于 2026-08-10 批准|不代表未来功能已经实现' docs\superpowers\specs\2026-08-10-government-interoperability-roadmap-design.md
git diff --check
```

Expected: every named section and both status assertions are found; `git diff --check` exits `0`.

- [ ] **Step 6: Commit the approved product definition**

Run:

```powershell
git add -- PRODUCT.md PRODUCT.md.bak-20260810 docs/superpowers/specs/2026-08-10-government-interoperability-roadmap-design.md docs/superpowers/specs/2026-08-10-government-interoperability-roadmap-design.md.bak-20260810
git diff --cached --check
git commit -m "docs: establish CivicFlow interoperability thesis"
```

Expected: one commit containing exactly the four named files.

---

### Task 2: Replace the product roadmap with measurable 0–36 month gates

**Files:**
- Create: `docs/roadmap/product_roadmap.md.bak-20260810`
- Modify: `docs/roadmap/product_roadmap.md:1-135`

**Interfaces:**
- Consumes: the approved Phase 0–5 sequence, target processes, metric definitions, legal caveats, and stop rules from the approved design.
- Produces: the canonical delivery roadmap referenced by `PRODUCT.md`, the future-architecture section, and `README.md`.

- [ ] **Step 1: Back up the current roadmap without overwriting history**

Run:

```powershell
$backup = 'docs\roadmap\product_roadmap.md.bak-20260810'
if (Test-Path -LiteralPath $backup) { throw "Backup already exists: $backup" }
Copy-Item -LiteralPath 'docs\roadmap\product_roadmap.md' -Destination $backup
```

Expected: exit `0`; the backup hash equals the pre-edit roadmap hash.

- [ ] **Step 2: Preserve the Phase 0 and MAIC truth lane**

The new roadmap must retain these current facts without converting older verification into a same-session claim:

- current repository is a synthetic MAIC demonstration;
- the three current domain examples prove workflow governance, not real cross-department integrations;
- production identity, tenancy, persistent storage, approved adapters, government production hosting, adoption and procurement remain absent;
- MAIC submission delivery remains a separate external lane tracked in `docs/submission/final_submission_checklist.md` and is not changed here.

- [ ] **Step 3: Write the canonical phase structure**

Use these exact phase headings and scope:

```markdown
## Phase 0 — Current MAIC synthetic demonstration
## Phase 1 — 0–3 months: trusted core for one PBT
## Phase 2 — 3–6 months: controlled business-licensing pilot
## Phase 3 — 6–12 months: three journeys in the same PBT
## Phase 4 — 12–24 months: multi-agency federated protocol
## Phase 5 — 24–36 months: governed cross-level service network
```

For every phase, include `Objective`, `Deliverables`, `Exit gate`, and `Stop / hold conditions`. Carry over all approved figures:

- Phase 1: at least `200` four-language evaluation cases, at least `1,000` transition/permission tests, `100%` citation-or-review, `100%` human attribution for consequential decisions, `0` unsafe/unauthorised events, sandbox connector event success `>=99%`.
- Phase 2: at least `8 weeks` and `300` approved cases, median triage `>=30%` faster, first-response completeness `>=15 percentage points` better, connector event success and service-hours availability `>=99.5%`, material high-confidence correction `<25%`.
- Phase 3: the order is flood/drainage then education/welfare after business licensing; high-risk and eligibility decisions are `100%` human, material paired-language inconsistency `<5%`, canonical field/event reuse `>=70%`, journey-specific product branches `0`.
- Phase 4: governance charter, coordinating authority, data responsibility and incident responsibility are entry conditions; two independent implementations, connector onboarding `<=4 weeks`, common definitions `>=70%`, conformance `>=90%`.
- Phase 5: label `10 agencies / 20 journeys`, `>=90%` unified status, `>=95%` events within five minutes, and `>=50%` lower onboarding cost as ambition gates rather than promises; all consequential-decision AI counts remain `0`.

- [ ] **Step 4: Define metrics and expansion rules**

Add explicit denominator definitions for connector delivery success, service-hours availability, paired-language substantive inconsistency, canonical field/event reuse, and connector mapping component reuse. Add these expansion rules:

1. Each phase must pass its outcome, safety, reliability, governance, and ownership gates before expansion.
2. A safety trigger pauses the affected pilot immediately.
3. A missed value metric blocks the next phase but is not labelled a security incident.
4. A department counts as onboarded only after identity, data purpose, policy owner, connector failure/rollback, human responsibility, and citizen tracking are accepted.
5. Target department chains remain hypotheses until the first PBT approves the `ServiceDefinition`.

- [ ] **Step 5: Keep the national-platform and legal posture bounded**

Summarise, with links to the approved design instead of duplicating legal analysis:

- align to Malaysia Digital 2030, RMK13, MyGovEA/DDSA, MyGDX and MyDigital ID integration directions;
- do not build a competing national data hub or identity system;
- Act 864 applicability and state/PBT authority require case-by-case legal review;
- Act 854 obligations apply only when the deployment falls within its scope or is designated NCII;
- cloud, data-classification and key controls follow agency-approved policy and deployment classification;
- demo hosting is not government production hosting.

- [ ] **Step 6: Verify and commit the roadmap**

Run:

```powershell
rg -n '^## Phase [0-5]|200|1,000|99%|99.5%|30%|15 percentage|<5%|70%|90%|10 agencies|20 journeys|system.?of.?record|not.*production|safety trigger' docs\roadmap\product_roadmap.md
rg -n 'production identity|persistent|tenan|adapter|government.*production|procurement' docs\roadmap\product_roadmap.md
git diff --check
git add -- docs/roadmap/product_roadmap.md docs/roadmap/product_roadmap.md.bak-20260810
git diff --cached --check
git commit -m "docs: add outcome-gated interoperability roadmap"
```

Expected: six phase headings and all approved gates are present; one commit contains exactly the roadmap and its backup.

---

### Task 3: Add a clearly future-only federated target architecture

**Files:**
- Create: `docs/architecture/architecture.md.bak-20260810`
- Modify: `docs/architecture/architecture.md:321-343`

**Interfaces:**
- Consumes: the approved responsibility layers and eight canonical contract families.
- Produces: a target-architecture reference for roadmap implementation that does not alter the current demo architecture in sections 1–13.

- [ ] **Step 1: Back up the current architecture document**

Run:

```powershell
$backup = 'docs\architecture\architecture.md.bak-20260810'
if (Test-Path -LiteralPath $backup) { throw "Backup already exists: $backup" }
Copy-Item -LiteralPath 'docs\architecture\architecture.md' -Destination $backup
```

Expected: exit `0`; the backup hash equals the pre-edit architecture hash.

- [ ] **Step 2: Append `Future target architecture — approved direction, not implemented`**

Preserve the current architecture verbatim above the new section. The new section must include this layer order:

```text
Citizen channels + officer/supervisor workspace
                  ↓
Shared governed casework core
                  ↓
Bounded AI assistance
                  ↓
Governed connector boundary
                  ↓
Agency-owned systems of record
```

Add a cross-cutting trust plane for identity federation, tenant isolation, purpose-bound access, data classification, key control, monitoring, incident response and BCP/DR.

- [ ] **Step 3: Define future responsibilities and canonical contracts**

Add compact tables that define:

- experience, casework, AI, connector, data and identity responsibilities;
- `ServiceDefinition`, `CaseEnvelope`, `CaseEvent`, `PolicyCitation`, `DecisionRecord`, `ConnectorManifest`, `DataUseContract`, and `IdentityContext`;
- one authoritative source per field, decision and status dimension, while CivicFlow is authoritative only for coordination state and its own audit;
- connector controls: scoped authority, idempotency, versioned events, outbox/retry, dead-letter, reconciliation, rollback and conformance testing.

- [ ] **Step 4: Record target journey and national integration boundaries**

State that these are PBT-approved target hypotheses, not current integrations:

```text
Licensing → Public Health → Engineering
Engineering → Public Health → Community & Welfare
Community & Welfare → Finance → Education
```

State that future MyGDX, MyDigital ID, MyGOV and agency-approved identity-protocol integration is adapter work behind the trust and connector boundaries. It must not replace agency systems of record, centralise all data, or weaken existing human gates.

- [ ] **Step 5: Verify and commit the future architecture**

Run:

```powershell
rg -n 'Future target architecture|not implemented|Shared governed casework core|Bounded AI|Governed connector|systems of record|ServiceDefinition|CaseEnvelope|CaseEvent|DecisionRecord|ConnectorManifest|DataUseContract|IdentityContext|MyGDX|MyDigital ID|target hypotheses' docs\architecture\architecture.md
rg -n 'IN-MEMORY STORE|DETERMINISTIC AI|100% synthetic|not a production' docs\architecture\architecture.md
git diff --check
git add -- docs/architecture/architecture.md docs/architecture/architecture.md.bak-20260810
git diff --cached --check
git commit -m "docs: document future federated architecture"
```

Expected: current-demo markers and future-only markers both remain; one commit contains exactly the architecture document and its backup.

---

### Task 4: Add the README entry point and run the final repository gates

**Files:**
- Create: `README.md.bak-20260810`
- Modify: `README.md:9-17`
- Verify only: `PRODUCT.md`
- Verify only: `docs/roadmap/product_roadmap.md`
- Verify only: `docs/architecture/architecture.md`
- Verify only: `docs/superpowers/specs/2026-08-10-government-interoperability-roadmap-design.md`

**Interfaces:**
- Consumes: the canonical product statement, roadmap and architecture produced by Tasks 1–3.
- Produces: a short public navigation surface and an end-to-end evidence record for the completed documentation update.

- [ ] **Step 1: Back up README without overwriting an existing backup**

Run:

```powershell
$backup = 'README.md.bak-20260810'
if (Test-Path -LiteralPath $backup) { throw "Backup already exists: $backup" }
Copy-Item -LiteralPath 'README.md' -Destination $backup
```

Expected: exit `0`; the backup hash equals the pre-edit README hash.

- [ ] **Step 2: Add a short `Long-term direction` section after `Why we built it`**

Use this bounded message:

```markdown
## Long-term direction

CivicFlow's approved direction is **one service experience, many systems of record**: a governed interoperability and casework layer that coordinates existing public-service systems instead of replacing them. The current repository remains a synthetic MAIC demonstration; persistent tenancy, production identity, live agency adapters and government deployment are future gates, not current features.
```

Link the words `approved direction` to the approved design, and add short links to `PRODUCT.md`, `docs/roadmap/product_roadmap.md`, and the future target section in `docs/architecture/architecture.md`. Do not expand the README into a second roadmap.

- [ ] **Step 3: Verify cross-document truth and scope**

Run:

```powershell
rg -n 'one service experience, many systems of record|synthetic MAIC|future gates' README.md
rg -n 'AI never|synthetic|not a generic' PRODUCT.md README.md
rg -n 'not implemented|not current|future' PRODUCT.md README.md docs\roadmap\product_roadmap.md docs\architecture\architecture.md
$changed = git diff '0a73ecf6b598cd55912dff92ac8b84e4fa55618a' --name-only
$forbidden = $changed | Select-String -Pattern '^docs/submission/|^src/|^package(-lock)?\.json$'
if ($forbidden) { $forbidden; exit 9 }
```

Expected: current/future boundaries appear in all main docs; no submission, source or package file is changed.

- [ ] **Step 4: Run formatting and secret-shape gates before staging**

Run:

```powershell
git diff --check
$diffText = git diff --no-color '0a73ecf6b598cd55912dff92ac8b84e4fa55618a'
$secretHits = $diffText | Select-String -Pattern '(?i)(api[_-]?key|client[_-]?secret|access[_-]?token|private[_-]?key|authorization:\s*bearer|BEGIN [A-Z ]*PRIVATE KEY)\s*[:=]\s*["'']?[A-Za-z0-9_\-\/+=]{12,}'
if ($secretHits) { Write-Output 'secret-shape-hit=true'; exit 7 }
Write-Output 'secret-shape-hit=false'
```

Expected: `git diff --check` exits `0`; secret-shape scan prints `false`.

- [ ] **Step 5: Run repository gates**

Run each command separately and record the exact exit code and test counts from this session:

```powershell
npm run typecheck
npm test
npm run build
npm run smoke:e2e
```

Expected: every command exits `0`. One isolated retry is allowed only for documented Windows environment noise; a repeated hard-gate failure stops the task without weakening the gate.

- [ ] **Step 6: Commit the README entry point**

Run:

```powershell
git add -- README.md README.md.bak-20260810
git diff --cached --check
git commit -m "docs: link approved government roadmap"
```

Expected: one commit containing exactly README and its backup.

- [ ] **Step 7: Verify final history and leave publishing pending**

Run:

```powershell
git status --short --branch
git log -5 --oneline
git diff --stat '0a73ecf6b598cd55912dff92ac8b84e4fa55618a..HEAD'
git diff --name-only '0a73ecf6b598cd55912dff92ac8b84e4fa55618a..HEAD'
```

Expected: only the approved plan, four main documents, approved-spec status and their dated backups are committed after the design commit. `.superpowers/` may remain untracked only until the visual companion is stopped and its generated session is cleaned. Push remains pending explicit owner approval.
