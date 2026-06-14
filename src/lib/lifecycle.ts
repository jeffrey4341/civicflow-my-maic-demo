import type { ApprovalTask, CaseStatus, CitizenCase, PolicyCitation } from "@/lib/types";

export const MANUAL_REVIEW_NO_CITATION_REASON =
  "Manual review required because no reliable policy citation was found.";
export const MANUAL_REVIEW_LOW_CONFIDENCE_REASON =
  "Manual review required because classification confidence is low.";

const LOW_CONFIDENCE_THRESHOLD = 0.5;

export function manualReviewReasonFor(
  citations: PolicyCitation[],
  categoryConfidence: number,
): string | null {
  if (citations.length === 0) return MANUAL_REVIEW_NO_CITATION_REASON;
  if (categoryConfidence < LOW_CONFIDENCE_THRESHOLD) {
    return MANUAL_REVIEW_LOW_CONFIDENCE_REASON;
  }
  return null;
}

export function hasBlockingMissingInfo(c: CitizenCase): boolean {
  return c.missing_info.some((m) => m.required && !m.satisfied);
}

export function getStatusTransitionBlocker(
  c: CitizenCase,
  next: CaseStatus,
  approval?: ApprovalTask | null,
): string | null {
  if (next === c.status) return null;

  if (c.status === "closed") {
    return "Closed cases cannot be changed through the generic status action.";
  }

  if (c.approval_task_id && approval?.status === "pending" && (next === "in_progress" || next === "closed")) {
    return "Supervisor approval required before work can start.";
  }

  if (c.status === "awaiting_supervisor" && c.approval_task_id && !approval) {
    return "Supervisor approval required before work can start.";
  }

  if (approval?.status === "rejected" && (next === "in_progress" || next === "closed")) {
    return "Supervisor rejected this case; manual officer review is required before further action.";
  }

  if (c.status === "needs_info" && next !== "needs_info") {
    return "Missing information must be resolved before work can start or the case can be closed.";
  }

  if (c.status === "manual_review" && next !== "manual_review") {
    return c.manual_review_reason ?? MANUAL_REVIEW_NO_CITATION_REASON;
  }

  if (c.citations.length === 0 && next !== "manual_review") {
    return MANUAL_REVIEW_NO_CITATION_REASON;
  }

  if (c.category === "education_aid_welfare" && next === "closed") {
    return "Education/welfare eligibility requires officer review; the generic close action cannot approve or close it.";
  }

  return null;
}

export function statusActionBlocker(c: CitizenCase, approval?: ApprovalTask | null): string | null {
  if (c.status === "awaiting_supervisor" && c.approval_task_id && approval?.status !== "approved") {
    return "Supervisor approval required before work can start.";
  }
  if (c.status === "needs_info") {
    return "Missing information must be resolved before work can start or the case can be closed.";
  }
  if (c.status === "manual_review") {
    return c.manual_review_reason ?? MANUAL_REVIEW_NO_CITATION_REASON;
  }
  return null;
}
