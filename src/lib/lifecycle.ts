import type { PolicyCitation } from "@/lib/types";

const MANUAL_REVIEW_NO_CITATION_REASON =
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
