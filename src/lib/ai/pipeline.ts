/**
 * Triage pipeline — orchestrates the eight AI stages into a single TriageResult
 * plus the audit events that record each AI decision.
 *
 * Stages: language detection -> (optional LLM refine) -> classification ->
 * English gloss -> policy retrieval (RAG) -> routing -> missing-info detection ->
 * approval gate -> reply draft. Deterministic by default; identical shape whether
 * or not an LLM key is present.
 */

import type {
  AiMode,
  AuditEvent,
  CaseStatus,
  Language,
  PolicyCitation,
  TriageResult,
} from "@/lib/types";
import { detectLanguage, translateToEnglish } from "@/lib/ai/language";
import { classifyCase } from "@/lib/ai/classify";
import { routeCase } from "@/lib/ai/routing";
import { detectMissingInfo, hasBlockingGaps } from "@/lib/ai/missingInfo";
import { evaluateApprovalGate, type GateResult } from "@/lib/ai/approval";
import { generateReplyDraft } from "@/lib/ai/reply";
import { retrievePolicies } from "@/lib/rag/retrieve";
import { categoryLabel } from "@/lib/i18n";
import { llmRefineClassification, isLlmConfigured } from "@/lib/llm";
import { makeAuditEvent } from "@/lib/audit";
import { manualReviewReasonFor } from "@/lib/lifecycle";

export interface TriageInput {
  case_id: string;
  citizen_ref: string;
  text: string;
  selected_language: Language;
  location_text: string;
}

export interface TriageOutput {
  result: TriageResult;
  gate: GateResult;
  status: CaseStatus;
  needsInfo: boolean;
  audit: AuditEvent[];
}

/**
 * Compute the persisted status for a freshly triaged case.
 *
 * Note on the lifecycle: `draft` (citizen still composing, held client-side) and
 * `submitted` (the instant of submission) are transient milestones — triage runs
 * synchronously on submit, so a persisted case lands directly at its post-triage
 * status. Both transient milestones are still shown as *passed* steps in the
 * citizen progress tracker (see CITIZEN_MILESTONES), so the full lifecycle is
 * visible to the citizen even though it is never the current status here.
 */
function computeStatus(needsInfo: boolean, gate: GateResult, manualReviewReason: string | null): CaseStatus {
  if (manualReviewReason) return "manual_review";
  if (needsInfo) return "needs_info";
  if (gate.requires_supervisor) return "awaiting_supervisor";
  return "routed";
}

export async function runTriage(input: TriageInput): Promise<TriageOutput> {
  const { case_id, citizen_ref, text, selected_language, location_text } = input;
  const audit: AuditEvent[] = [];

  // 1. Language detection
  let detected_language = detectLanguage(text);

  // 2. Classification (deterministic baseline)
  const baseline = classifyCase(text);
  let category = baseline.category;
  let urgency = baseline.urgency;
  let category_confidence = baseline.category_confidence;
  const pii_risk = baseline.pii_risk;
  let ai_mode: AiMode = "deterministic";

  // 2b. Optional LLM refinement (no-op offline; deterministic fallback on error)
  let llmTranslation: string | null = null;
  if (isLlmConfigured()) {
    const refined = await llmRefineClassification(text);
    if (refined) {
      detected_language = refined.detected_language;
      category = refined.category;
      urgency = refined.urgency;
      category_confidence = Math.max(category_confidence, 0.9);
      llmTranslation = refined.translated_text_en;
      ai_mode = "llm";
    }
  }

  audit.push(
    makeAuditEvent({
      case_id,
      actor: "ai_agent",
      event_type: "ai.language_detected",
      summary: `Detected language: ${detected_language} (${ai_mode}).`,
      payload: { detected_language, selected_language, ai_mode },
    }),
  );

  // 3. English gloss
  const translated_text_en =
    llmTranslation ?? translateToEnglish(text, detected_language, category);

  audit.push(
    makeAuditEvent({
      case_id,
      actor: "ai_agent",
      event_type: "ai.classified",
      summary: `Classified as "${categoryLabel(category)}" (confidence ${category_confidence}), urgency ${urgency}.`,
      payload: { category, category_confidence, urgency, pii_risk, matched_terms: baseline.matched_terms },
    }),
  );

  // 4. Policy retrieval (RAG)
  const citations: PolicyCitation[] = retrievePolicies(`${text} ${translated_text_en}`, {
    category,
    hints: baseline.matched_terms,
    topK: 3,
  });
  const primaryCitation = citations[0] ?? null;

  audit.push(
    makeAuditEvent({
      case_id,
      actor: "ai_agent",
      event_type: "rag.retrieved",
      summary: primaryCitation
        ? `Retrieved ${citations.length} citation(s); top: ${primaryCitation.doc_title} — ${primaryCitation.section} (${primaryCitation.confidence}).`
        : "No policy citation above threshold — flagged for manual review.",
      payload: { count: citations.length, citations },
    }),
  );

  // 5. Routing
  const routing = routeCase({ case_id, category, urgency, pii_risk, category_confidence });
  audit.push(
    makeAuditEvent({
      case_id,
      actor: "ai_agent",
      event_type: "ai.routed",
      summary: `Routed to ${routing.department} / ${routing.unit} (${routing.rule_id}).`,
      payload: { department: routing.department, unit: routing.unit, rule_id: routing.rule_id, sla_hours: routing.sla_hours },
    }),
  );

  // 6. Missing-info detection
  const missing_info = detectMissingInfo(category, text, location_text, detected_language);
  const needsInfo = hasBlockingGaps(missing_info);
  const blockingCount = missing_info.filter((m) => m.required && !m.satisfied).length;
  if (missing_info.length > 0) {
    audit.push(
      makeAuditEvent({
        case_id,
        actor: "ai_agent",
        event_type: "ai.missing_info",
        summary: blockingCount > 0
          ? `${blockingCount} required detail(s) still needed from the citizen.`
          : "All required details present; optional checklist surfaced.",
        payload: { fields: missing_info.map((m) => ({ field: m.field, required: m.required, satisfied: m.satisfied })) },
      }),
    );
  }

  // 7. Approval gate
  const gate = evaluateApprovalGate({ category, urgency, pii_risk, category_confidence });
  const manual_review_reason = manualReviewReasonFor(citations, category_confidence);
  if (gate.requires_supervisor) {
    audit.push(
      makeAuditEvent({
        case_id,
        actor: "ai_agent",
        event_type: "approval.requested",
        summary: "High-risk case — supervisor approval requested by AI (AI does not approve).",
        payload: { risk_factors: gate.risk_factors },
      }),
    );
  }
  if (manual_review_reason) {
    audit.push(
      makeAuditEvent({
        case_id,
        actor: "system",
        event_type: "manual_review.flagged",
        summary: manual_review_reason,
        payload: { citations: citations.length, category_confidence },
      }),
    );
  }

  // 8. Reply draft
  const reply_draft = generateReplyDraft({
    case_id,
    language: detected_language,
    category,
    citizen_ref,
    department: routing.department,
    unit: routing.unit,
    citation: primaryCitation,
    missingInfo: missing_info,
    requires_supervisor: gate.requires_supervisor,
    officer_review_only: gate.officer_review_only,
    manual_review_reason,
    sla_hours: routing.sla_hours,
  });
  audit.push(
    makeAuditEvent({
      case_id,
      actor: "ai_agent",
      event_type: "reply.drafted",
      summary: `Drafted citizen reply in ${detected_language} (awaiting officer review).`,
      payload: { language: detected_language, grounded_on: primaryCitation?.source_doc ?? "manual-review" },
    }),
  );

  const result: TriageResult = {
    detected_language,
    translated_text_en,
    category,
    category_confidence,
    urgency,
    pii_risk,
    department: routing.department,
    unit: routing.unit,
    routing,
    citations,
    missing_info,
    reply_draft,
    requires_supervisor: gate.requires_supervisor,
    manual_review_reason,
    officer_review_only: gate.officer_review_only,
    ai_mode,
  };

  return { result, gate, status: computeStatus(needsInfo, gate, manual_review_reason), needsInfo, audit };
}
