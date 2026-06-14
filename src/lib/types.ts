/**
 * CivicFlow MY Mobile — canonical data models.
 *
 * These six entities (CitizenCase, RoutingDecision, PolicyCitation, ApprovalTask,
 * AuditEvent, CitizenReplyDraft) are the contract shared by the AI pipeline, the
 * RAG layer, the API route handlers, the UI and the tests. All data is SYNTHETIC.
 */

// ---------------------------------------------------------------------------
// Enumerations
// ---------------------------------------------------------------------------

/** Citizen-facing languages supported by the demo. */
export type Language = "ms" | "en" | "zh" | "ta";

export const LANGUAGES: Language[] = ["ms", "en", "zh", "ta"];

/** How the case entered the system. */
export type SourceChannel = "mobile_pwa" | "web" | "walk_in" | "hotline";

/** Service categories handled by the demo council. */
export type CaseCategory =
  | "drainage"
  | "business_licensing"
  | "education_aid_welfare"
  | "roads_potholes"
  | "waste_management"
  | "streetlight"
  | "general_enquiry";

export const CASE_CATEGORIES: CaseCategory[] = [
  "drainage",
  "business_licensing",
  "education_aid_welfare",
  "roads_potholes",
  "waste_management",
  "streetlight",
  "general_enquiry",
];

/** Urgency tiers. `flood_risk` is the highest and always triggers a supervisor gate. */
export type Urgency = "low" | "normal" | "high" | "urgent" | "flood_risk";

/** Personally-identifiable-information risk for the case text. */
export type PiiRisk = "low" | "medium" | "high";

/**
 * Case lifecycle:
 * draft -> needs_info -> submitted -> manual_review -> routed -> awaiting_supervisor -> in_progress -> closed
 */
export type CaseStatus =
  | "draft"
  | "needs_info"
  | "submitted"
  | "manual_review"
  | "routed"
  | "awaiting_supervisor"
  | "in_progress"
  | "closed";

export const CASE_STATUS_ORDER: CaseStatus[] = [
  "draft",
  "needs_info",
  "submitted",
  "manual_review",
  "routed",
  "awaiting_supervisor",
  "in_progress",
  "closed",
];

export type ApprovalStatus = "pending" | "approved" | "rejected";

/** Who performed an audited action. */
export type AuditActor = "system" | "ai_agent" | "citizen" | "officer" | "supervisor";

/** Whether the structured AI output came from the deterministic engine or an LLM. */
export type AiMode = "deterministic" | "llm";

// ---------------------------------------------------------------------------
// Supporting structures
// ---------------------------------------------------------------------------

/** A single retrieved policy snippet with provenance and confidence. */
export interface PolicyCitation {
  source_doc: string; // policy filename, e.g. "drainage_response_sop.md"
  doc_title: string; // human title, e.g. "Drainage Response SOP"
  section: string; // heading the snippet came from
  snippet: string; // short excerpt shown to officers/citizens
  confidence: number; // 0..1 retrieval confidence
}

/** A piece of information the citizen still needs to provide. */
export interface MissingInfoItem {
  field: string; // machine key, e.g. "location"
  label: string; // short English label
  question_en: string; // clarifying question in English
  question_localized: string; // same question in the citizen's language
  required: boolean;
  satisfied: boolean;
}

/** Department-routing recommendation produced by the routing engine. */
export interface RoutingDecision {
  case_id: string;
  category: CaseCategory;
  department: string; // e.g. "Engineering"
  unit: string; // e.g. "Drainage Unit"
  rule_id: string; // which routing rule fired
  rationale: string; // why this department
  sla_hours: number; // service-charter target
  requires_supervisor: boolean; // high-risk gate
  created_at: string;
}

/** A supervisor approval task for a high-risk case. AI requests; a human decides. */
export interface ApprovalTask {
  approval_id: string;
  case_id: string;
  title: string;
  reason: string; // why approval is required
  risk_factors: string[]; // human-readable risk drivers
  approver_role: string; // role allowed to decide (e.g. "supervisor")
  requested_by: string; // "ai_agent" — never auto-approves
  status: ApprovalStatus;
  evidence: PolicyCitation[]; // citations backing the recommendation
  decision_by: string | null; // who decided (must differ from requester)
  decision_note: string | null;
  created_at: string;
  decided_at: string | null;
}

/** A multilingual citizen reply drafted by AI and gated on human review. */
export interface CitizenReplyDraft {
  case_id: string;
  language: Language;
  body: string; // reply in the citizen's language
  body_en: string; // English reference for officers
  citations: PolicyCitation[];
  status: "draft" | "approved" | "sent";
  drafted_by: "ai_agent";
  approved_by: string | null; // officer who released it
  created_at: string;
}

/** Append-only audit event. One per state change / AI decision. */
export interface AuditEvent {
  event_id: string;
  case_id: string;
  actor: AuditActor;
  actor_label: string; // e.g. "AI Triage Agent", "Supervisor (demo)"
  event_type: string; // e.g. "ai.classified", "approval.approved"
  summary: string; // one-line human description
  payload: Record<string, unknown>;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Core entity
// ---------------------------------------------------------------------------

export interface CitizenCase {
  // Required minimum fields (per spec)
  case_id: string;
  source_channel: SourceChannel;
  citizen_language: Language;
  original_text: string;
  translated_text_en: string;
  category: CaseCategory;
  location_text: string;
  media_refs: string[]; // synthetic placeholders, e.g. "photo:drain_ss2_mock.jpg"
  pii_risk: PiiRisk;
  urgency: Urgency;
  department: string;
  status: CaseStatus;
  created_at: string;

  // Demo-support fields
  updated_at: string;
  citizen_ref: string; // friendly tracking code shown to citizens, e.g. "CF-2K9F3A"
  detected_language: Language; // language the AI detected (may differ from selected)
  category_confidence: number; // 0..1
  unit: string; // sub-unit within the department
  ai_mode: AiMode; // which engine produced the triage
  missing_info: MissingInfoItem[];
  citations: PolicyCitation[];
  routing: RoutingDecision | null;
  approval_task_id: string | null;
  manual_review_reason: string | null;
  officer_review_only: boolean;
  reply_draft: CitizenReplyDraft | null;
}

// ---------------------------------------------------------------------------
// Pipeline result (returned by runTriage)
// ---------------------------------------------------------------------------

export interface TriageResult {
  detected_language: Language;
  translated_text_en: string;
  category: CaseCategory;
  category_confidence: number;
  urgency: Urgency;
  pii_risk: PiiRisk;
  department: string;
  unit: string;
  routing: RoutingDecision;
  citations: PolicyCitation[];
  missing_info: MissingInfoItem[];
  reply_draft: CitizenReplyDraft;
  requires_supervisor: boolean;
  manual_review_reason: string | null;
  officer_review_only: boolean;
  ai_mode: AiMode;
}
