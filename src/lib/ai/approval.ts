/**
 * Approval-gate logic — the single source of truth for "what is high-risk".
 *
 * Two distinct controls (mirrors department_routing_rules.md):
 *  - requires_supervisor: a supervisor must approve before action (e.g. flood-risk
 *    drainage dispatch, high-PII outward action).
 *  - officer_review_only: the system must not auto-act; a human officer reviews
 *    (e.g. eligibility / benefit decisions, low-confidence classification).
 *
 * AI requests approval; it never approves. No self-approval is enforced in the
 * store layer.
 */

import type {
  ApprovalTask,
  CaseCategory,
  PiiRisk,
  PolicyCitation,
  Urgency,
} from "@/lib/types";
import { newId, nowIso } from "@/lib/util";

export interface GateInput {
  category: CaseCategory;
  urgency: Urgency;
  pii_risk: PiiRisk;
  category_confidence: number;
}

export interface GateResult {
  requires_supervisor: boolean;
  officer_review_only: boolean;
  risk_factors: string[];
  reason: string;
}

const LOW_CONFIDENCE = 0.5;

/** Evaluate the approval/review gate for a classified case. */
export function evaluateApprovalGate(input: GateInput): GateResult {
  const { category, urgency, pii_risk, category_confidence } = input;
  const risk_factors: string[] = [];
  let requires_supervisor = false;
  let officer_review_only = false;

  if (category === "drainage" && urgency === "flood_risk") {
    requires_supervisor = true;
    risk_factors.push(
      "Flood-risk drainage report (rapid water rise) — field dispatch needs supervisor authorisation per Drainage Response SOP.",
    );
  }

  if (pii_risk === "high") {
    requires_supervisor = true;
    risk_factors.push(
      "High PII-risk: the request appears to contain identity or contact details; an outward action needs supervisor sign-off.",
    );
  }

  if (category === "education_aid_welfare") {
    officer_review_only = true;
    risk_factors.push(
      "Eligibility / benefit enquiry — no automatic approval; a welfare officer must decide after document review.",
    );
  }

  if (category_confidence < LOW_CONFIDENCE) {
    officer_review_only = true;
    risk_factors.push(
      "Low classification confidence — routed for manual officer triage as a fallback.",
    );
  }

  const reason = requires_supervisor
    ? "This case is high-risk and requires supervisor approval before action."
    : officer_review_only
      ? "This case requires officer review; the system will not act automatically."
      : "Standard case — routed to the responsible department.";

  return { requires_supervisor, officer_review_only, risk_factors, reason };
}

/** Build a pending supervisor ApprovalTask. The requester is the AI agent. */
export function buildApprovalTask(args: {
  case_id: string;
  title: string;
  reason: string;
  risk_factors: string[];
  evidence: PolicyCitation[];
  approver_role?: string;
}): ApprovalTask {
  return {
    approval_id: newId("appr"),
    case_id: args.case_id,
    title: args.title,
    reason: args.reason,
    risk_factors: args.risk_factors,
    approver_role: args.approver_role ?? "supervisor",
    requested_by: "ai_agent",
    status: "pending",
    evidence: args.evidence,
    decision_by: null,
    decision_note: null,
    created_at: nowIso(),
    decided_at: null,
  };
}
