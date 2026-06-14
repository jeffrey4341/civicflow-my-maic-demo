# Department Routing Rules

**Document type:** Routing Reference (SYNTHETIC — demo only)
**Owner:** Operations / Case Management
**Reference:** RUL-RTE-005 (fictional)

> Invented routing matrix for the CivicFlow MY Mobile demo. It maps a case
> category to the responsible department, unit, and service-charter target.

## Routing Matrix

| Rule ID | Category | Department | Unit | SLA (hours) |
| --- | --- | --- | --- | --- |
| RTE-DRN | drainage | Engineering | Drainage Unit | 4 |
| RTE-LIC | business_licensing | Licensing | Licensing Unit | 336 |
| RTE-WEL | education_aid_welfare | Community & Welfare | Education Support Unit | 240 |
| RTE-ROD | roads_potholes | Engineering | Roads & Maintenance Unit | 168 |
| RTE-WST | waste_management | Public Health | Cleansing Unit | 168 |
| RTE-LMP | streetlight | Engineering | Street Lighting Unit | 168 |
| RTE-GEN | general_enquiry | Customer Service | Front Desk | 72 |

## High-Risk Gate

A case requires **supervisor approval** before action when **any** of these hold:

- The drainage case is classified **flood-risk** (rapid water rise, water entering
  premises). See the Drainage Response SOP.
- The case carries **high PII-risk** (appears to contain identity or contact
  numbers) and proposes an outward action.
- The category involves an **eligibility or benefit decision** (education aid /
  welfare) — these never auto-approve and always go to officer review.

## Officer-Review-Only Categories

Education-aid and welfare cases are **officer-review-only**: the system
pre-screens and builds a checklist but does not decide eligibility.

## Fallback Routing

If the classifier confidence is low or the category is unknown, the case is routed
to **Customer Service / Front Desk** with a flag for manual triage, so that no
case is left unrouted and every recommendation has either a citation or a
manual-review fallback.
