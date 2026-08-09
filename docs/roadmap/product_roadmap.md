# CivicFlow MY Mobile — Outcome-Gated Interoperability Roadmap

## Purpose and truth boundary

This is the canonical delivery roadmap for CivicFlow's approved interoperability direction. It is a sequence of future outcome gates, not a claim that the future capabilities are implemented. The detailed assumptions, target contracts, legal sources, and stop rules are in the [approved detailed design](../superpowers/specs/2026-08-10-government-interoperability-roadmap-design.md).

CivicFlow remains a synthetic MAIC demonstration of multilingual public-service casework. It coordinates citizens, officers, policy evidence, approvals, and audit evidence; agency-owned systems remain the system of record. It must not become a competing national data hub, a national identity system, or a bypass around agency permissions and human decision-making.

All phase targets are hypotheses to be measured against a pre-pilot baseline. An authorised governance owner may adjust an unrealistic value target only with a recorded rationale; safety gates may not be reduced after the fact.

## Phase 0 — Current MAIC synthetic demonstration

### Objective

Prove the governance thesis without presenting the demonstration as a production or cross-department integration.

### Deliverables

- A 100% synthetic MAIC demonstration with Malay, English, Chinese, and Tamil intake; policy citations; officer-owned routing and replies; supervisor approval; and append-only audit events.
- Three domain examples — business licensing, flood/drainage, and education/welfare — that demonstrate workflow governance, citation-or-review, and human ownership. They do not prove real cross-department integrations.
- A separate MAIC-submission delivery lane in [the final submission checklist](../submission/final_submission_checklist.md). That external lane is not changed by this roadmap.

### Exit gate

The historical verification record, rather than a same-session claim here, documents repeatable governance evidence for the three synthetic journeys. The demo continues to require deterministic no-key operation, citation or manual review, and human control of every consequential decision.

### Stop / hold conditions

- Hold any statement that implies live government integration, production readiness, or completed MAIC delivery without direct evidence.
- Hold expansion until production identity, tenancy, persistent storage, approved adapters, government production hosting, adoption, and procurement have been established; all remain absent from the current repository.

## Phase 1 — 0–3 months: trusted core for one PBT

### Objective

Create a trusted, isolated shared casework core for one PBT before introducing a live departmental pilot.

### Deliverables

- Persistent storage with migration, backup, recovery, retention, `agency_id` / `pbt_id` isolation, and policy isolation.
- Server-owned identity, session handling, RBAC/ABAC, separation of duties, service catalogue, and case/event/policy/decision contracts.
- Policy versioning and owner approval; protected administration/reset; monitoring, rate limits, security logs, incident ownership, and a synthetic connector sandbox with fault injection.
- A named business, system, and data owner; an approved sandbox or interface path; and a measured existing-process baseline.

### Exit gate

- At least `200` four-language evaluation cases and at least `1,000` transition/permission tests.
- `100%` citation-or-review coverage for AI recommendations and `100%` authorised-human attribution for consequential decisions; `100%` of state changes record a human or named system actor.
- `0` unsafe or unauthorised events: no high-risk bypass, cross-tenant access, or unauthorised external write.
- Sandbox connector delivery-event success `>=99%`, with every discrepancy detectable and reconcilable; recovery exercise and critical security gates pass.

### Stop / hold conditions

- Hold at day 30 without business, system, and data owners; at day 60 without an approved sandbox or interface path; or whenever no baseline can be established.
- Pause for unresolved material identity, isolation, audit, or recovery gaps, or if the proposal requires AI to take a consequential action.

## Phase 2 — 3–6 months: controlled business-licensing pilot

### Objective

Validate one controlled business-licensing journey in the same PBT before adding service breadth.

### Deliverables

- Validate the target Licensing → Public Health → Engineering hand-off. Any step without an approved API uses an explicit, named-human hand-off rather than a simulated integration.
- Connect one approved authoritative case/licensing system and one notification channel through purpose-bound, least-privilege credentials.
- Provide idempotency, versioned events, outbox/retry, dead-letter handling, reconciliation, rollback, and dashboards for override reasons, sync failures, policy version, and language quality.
- Maintain operations, recovery, rollback, and incident-response runbooks.

### Exit gate

- Controlled operation for at least `8 weeks` and at least `300` approved cases, whichever is later.
- Median triage is `>=30%` faster than the measured baseline; first-response completeness is `>=15 percentage points` better.
- High-risk human-gate coverage is `100%` and erroneous permissive decisions are `0`.
- Connector delivery-event success and service-hours availability are each `>=99.5%`; all sync discrepancies are reconciled within one working day.
- Material high-confidence classification/routing correction is `<25%`.

### Stop / hold conditions

- Block progression if triage improvement is below `15%` after eight weeks, material routing correction is `>30%` for four consecutive weeks, or `>2%` of cases require offline repair from sync errors.
- A safety trigger — unauthorised consequential action, unsafe-gate bypass, or unexplained state change — pauses this pilot immediately.

## Phase 3 — 6–12 months: three journeys in the same PBT

### Objective

Prove that one governed core can support three distinct journeys in one PBT without duplicating the product.

### Deliverables

- Add flood/drainage first and education/welfare second after business licensing, using the same PBT core.
- Have at least three departments use common service, case, event, policy, and approval models; provide accepted/rejected hand-offs, named ownership, SLAs, a unified receipt, and only the minimum fields needed for each hand-off.
- Publish a v1 candidate contract without claiming a national standard.

### Exit gate

- End-to-end traceability across all three journeys is `100%`; high-risk and eligibility decisions are `100%` human; severe audit gaps, cross-department overreach, and automated consequential decisions are `0`.
- Material paired-language substantive inconsistency is `<5%` across synonymous four-language evaluations.
- Canonical field/event reuse is `>=70%`, and journey-specific product branches are `0`.

### Stop / hold conditions

- Hold if a new journey requires a separate product or bypasses the common contract, if the second or third journey cannot repeat the first journey's value, or if responsibility for eligibility or public safety cannot be named.
- Hold if connector mapping component reuse is `<40%` for the second and third journeys.

## Phase 4 — 12–24 months: multi-agency federated protocol

### Objective

Expand only from a proven single-PBT core to a governed, vendor-neutral protocol across agencies.

### Deliverables

- Enter only after participating institutions accept a governance charter, a coordinating authority, data responsibility, incident responsibility, and contract-change authority. Otherwise remain a Phase 3 single-PBT product.
- For an approved 2–5 agency scope, or one state plus 2–3 PBTs, deliver v1 service/case/event/policy/consent/audit contracts, connector registry, conformance and certification, reference adapters, identity federation, delegated authority, tenant isolation, and agency exit.
- Provide data-sharing agreements, field-level minimisation, retention and key responsibility, independent privacy/security/BCP-DR/audit assessment, and an implementation path independent of the CivicFlow UI or runtime.

### Exit gate

- Two independent teams or vendors implement the protocol.
- Median connector onboarding is `<=4 weeks`; common field/event definitions are `>=70%`; cross-agency hand-off and decision-audit coverage are `100%`; conformance is `>=90%`.
- There is `0` cross-tenant policy, identity, or data leakage.

### Stop / hold conditions

- Do not start multi-agency expansion without the entry governance conditions; pause if the charter, coordinating authority, or responsibility model fails and cannot be restored.
- Hold if there is no non-CivicFlow independent implementation by month 24, if `>30%` of normal cases require private extensions, or if data, incident, or standard-change responsibility remains unresolved.

## Phase 5 — 24–36 months: governed cross-level service network

### Objective

Under authorised scope, coordinate local, state, and federal services while data stays with its source agency whenever possible.

### Deliverables

- Shared service catalogue and cross-level case status; protocol-governance board, version migration, compatibility windows, certified connector ecosystem, vendor-neutral procurement, and exit options.
- Layered deployment controlled by authorised Malaysian public bodies or approved operators according to data classification, with agency-controlled key responsibility, monitoring, and BCP/DR.
- Citizen-visible unified status for participating services while agencies retain authoritative records.

### Exit gate

These are ambition gates, not promises: `10 agencies / 20 journeys`; at least two independent protocol implementations in sustained operation; median new-agency onboarding `<=4 weeks`; and onboarding cost `>=50%` lower than the first pilot.

- `>=90%` of participating-service cases expose unified status, and `>=95%` of status events arrive within five minutes.
- Human attribution, policy source, and audit coverage remain `100%`; all consequential-decision AI counts — automatic eligibility decisions, high-risk approvals, dispatches, and closures — remain `0`.

### Stop / hold conditions

- If cross-level adoption or independent implementers do not materialise, remain a specialist PBT-integration product.
- Hold if onboarding cost grows with agency count, expansion requires centralised replication of sensitive agency data, the coordination layer becomes an unisolatable security or availability single point of failure, or agencies reject loss of system-of-record control.

## Metric definitions

- **Connector delivery-event success:** confirmed successful deliveries within the measurement window divided by all due delivery events in that window. Only pre-approved planned-maintenance events may be excluded, and the excluded count is reported separately.
- **Service-hours availability:** (planned service minutes minus unplanned unavailable minutes) divided by planned service minutes. Approved planned maintenance is reported separately rather than hidden in the denominator.
- **Paired-language substantive inconsistency:** evaluated language pairs with a material difference in classification, routing, citation, missing-information result, or approval gate divided by all evaluated synonymous language pairs.
- **Canonical field/event reuse:** fields and events used by the evaluated journeys that use an approved common semantic definition divided by all fields and events defined for those journeys.
- **Connector mapping component reuse:** reused connector configuration, transformation, and reconciliation components in the second and third journeys divided by all such mapping components required by those journeys. This is distinct from canonical field/event reuse and must not be substituted for it.

## Expansion rules and accountability

1. A phase expands only after its outcome, safety, reliability, governance, and ownership gates all pass.
2. A safety trigger pauses the affected pilot immediately.
3. A missed value metric blocks the next phase; it is not labelled a security incident.
4. A department is onboarded only after identity, data purpose, policy owner, connector failure/rollback, human responsibility, and citizen tracking are accepted.
5. Target department chains remain hypotheses until the first PBT approves the relevant `ServiceDefinition`.

## National-platform and legal posture

CivicFlow follows the integration directions for Malaysia Digital 2030, RMK13, MyGovEA/DDSA, MyGDX, and MyDigital ID, through agency-approved adapters behind the trust and connector boundaries. It does not build a competing national data hub or identity system.

Act 864 applicability, including state/PBT authority, requires case-by-case legal review. Act 854 obligations apply only when a deployment falls within its scope or is designated NCII. Cloud deployment, data classification, and key controls follow agency-approved policy and deployment classification. Demo hosting is not government production hosting. See the [approved detailed design's national architecture and legal constraints](../superpowers/specs/2026-08-10-government-interoperability-roadmap-design.md#11-法律国家架构与部署约束) for official links and the full legal analysis.

## Product boundary

CivicFlow is not a generic chatbot or generic enterprise agent platform. AI may assist with language detection, classification, mapping, cited policy retrieval, summarisation, and drafting, but it never autonomously closes cases, approves high-risk escalation, dispatches field teams, decides eligibility, or bypasses agency-owned systems of record.
