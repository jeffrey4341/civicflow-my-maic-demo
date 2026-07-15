/**
 * In-memory demo store (single source of truth at runtime).
 *
 * Seeded from data/seed/cases.json on first use and re-seedable via reset().
 * Uses a globalThis singleton so route handlers and hot-reloads share one state.
 * This is intentionally NOT a system of record — it is a demo data layer.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import type {
  ApprovalStatus,
  ApprovalTask,
  CaseCategory,
  AuditEvent,
  CaseStatus,
  CitizenCase,
  Language,
  OfficerReviewResolution,
  PolicyCitation,
  SourceChannel,
  WelfareOutcome,
} from "@/lib/types";
import { citizenRef, newId, nowIso } from "@/lib/util";
import { runTriage } from "@/lib/ai/pipeline";
import { buildApprovalTask } from "@/lib/ai/approval";
import { evaluateApprovalGate } from "@/lib/ai/approval";
import { assertSyntheticDataOnly } from "@/lib/ai/classify";
import { detectMissingInfo, hasBlockingGaps } from "@/lib/ai/missingInfo";
import { makeAuditEvent } from "@/lib/audit";
import { loadPolicyChunks } from "@/lib/rag/policies";

interface DemoState {
  cases: Map<string, CitizenCase>;
  approvals: Map<string, ApprovalTask>;
  audit: AuditEvent[];
}

interface SeedInput {
  case_id?: string;
  citizen_ref?: string;
  source_channel: SourceChannel;
  citizen_language: Language;
  original_text: string;
  location_text: string;
  media_refs?: string[];
  created_at?: string;
  demo?: {
    override_status?: CaseStatus;
    approve?: boolean; // auto-approve a supervisor task
    reply_sent?: boolean;
    officer?: string;
  };
}

interface CivicflowGlobal {
  state: DemoState;
  ready: Promise<void>;
}

declare global {
  // eslint-disable-next-line no-var
  var __civicflow: CivicflowGlobal | undefined;
}

function emptyState(): DemoState {
  return { cases: new Map(), approvals: new Map(), audit: [] };
}

function loadSeedInputs(): SeedInput[] {
  try {
    const raw = readFileSync(join(process.cwd(), "data", "seed", "cases.json"), "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SeedInput[]) : [];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Case construction (shared by live submission and seeding)
// ---------------------------------------------------------------------------

interface BuildResult {
  record: CitizenCase;
  approval: ApprovalTask | null;
  events: AuditEvent[];
}

async function buildCase(input: {
  case_id: string;
  citizen_ref: string;
  source_channel: SourceChannel;
  citizen_language: Language;
  original_text: string;
  location_text: string;
  media_refs: string[];
  answers: Record<string, string>;
  created_at: string;
}): Promise<BuildResult> {
  // case.created is generated first so it is the earliest event on the timeline.
  const events: AuditEvent[] = [
    makeAuditEvent({
      case_id: input.case_id,
      actor: "citizen",
      event_type: "case.created",
      summary: `Citizen submitted a case via ${input.source_channel} (UI language: ${input.citizen_language}).`,
      payload: { source_channel: input.source_channel, citizen_ref: input.citizen_ref },
    }),
  ];

  const triage = await runTriage({
    case_id: input.case_id,
    citizen_ref: input.citizen_ref,
    text: input.original_text,
    selected_language: input.citizen_language,
    location_text: input.location_text,
    answers: input.answers,
  });
  const r = triage.result;
  events.push(...triage.audit);

  let approval: ApprovalTask | null = null;
  if (triage.status === "awaiting_supervisor") {
    approval = buildApprovalTask({
      case_id: input.case_id,
      triage_revision: 1,
      title: `Supervisor approval — ${r.department} / ${r.unit}`,
      reason: triage.gate.reason,
      risk_factors: triage.gate.risk_factors,
      evidence: r.citations,
    });
    events.push(
      makeAuditEvent({
        case_id: input.case_id,
        actor: "system",
        event_type: "approval.created",
        summary: "Supervisor approval task created and queued.",
        payload: {
          approval_id: approval.approval_id,
          approver_role: approval.approver_role,
          triage_revision: 1,
        },
      }),
    );
  }

  events.push(
    makeAuditEvent({
      case_id: input.case_id,
      actor: "system",
      event_type: "status.changed",
      summary: `Case status set to "${triage.status}".`,
      payload: { from_status: "submitted", to_status: triage.status },
    }),
  );

  const record: CitizenCase = {
    case_id: input.case_id,
    source_channel: input.source_channel,
    citizen_language: input.citizen_language,
    original_text: input.original_text,
    translated_text_en: r.translated_text_en,
    category: r.category,
    location_text: input.location_text,
    media_refs: input.media_refs,
    citizen_answers: input.answers,
    triage_revision: 1,
    officer_review: null,
    pii_risk: r.pii_risk,
    urgency: r.urgency,
    department: r.department,
    status: triage.status,
    created_at: input.created_at,
    updated_at: input.created_at,
    citizen_ref: input.citizen_ref,
    detected_language: r.detected_language,
    category_confidence: r.category_confidence,
    unit: r.unit,
    ai_mode: r.ai_mode,
    missing_info: r.missing_info,
    citations: r.citations,
    routing: r.routing,
    approval_task_id: approval?.approval_id ?? null,
    manual_review_reason: r.manual_review_reason,
    officer_review_only: r.officer_review_only,
    reply_draft: r.reply_draft,
  };

  return { record, approval, events };
}

// ---------------------------------------------------------------------------
// Seeding
// ---------------------------------------------------------------------------

async function seed(state: DemoState): Promise<void> {
  for (const s of loadSeedInputs()) {
    const built = await buildCase({
      case_id: s.case_id ?? newId("case"),
      citizen_ref: s.citizen_ref ?? citizenRef(),
      source_channel: s.source_channel,
      citizen_language: s.citizen_language,
      original_text: s.original_text,
      location_text: s.location_text,
      media_refs: s.media_refs ?? [],
      answers: {},
      created_at: s.created_at ?? nowIso(),
    });

    const { record } = built;
    state.cases.set(record.case_id, record);
    if (built.approval) state.approvals.set(built.approval.approval_id, built.approval);
    state.audit.push(...built.events);

    // Optional demo adjustments to populate a realistic officer queue.
    const demo = s.demo;
    const needsSeedReview = Boolean(
      demo?.approve
      || demo?.reply_sent
      || demo?.override_status === "in_progress"
      || demo?.override_status === "closed",
    );
    if (needsSeedReview) {
      const officer = demo?.officer ?? "Officer (demo)";
      record.officer_review = {
        triage_revision: record.triage_revision,
        officer,
        reviewed_at: nowIso(),
        note: "Synthetic seed review for the public demo.",
        resolution: "proceed",
        welfare_outcome: record.category === "education_aid_welfare" ? "eligible" : null,
      };
      if (record.reply_draft) {
        record.reply_draft.status = "approved";
        record.reply_draft.approved_by = officer;
        record.reply_draft.approved_revision = record.triage_revision;
      }
    }
    if (demo?.approve && built.approval) {
      applyDecision(
        state,
        built.approval.approval_id,
        record.triage_revision,
        "approved",
        demo.officer ?? "Supervisor (demo)",
        "supervisor",
        "Approved for the demo seed.",
      );
    }
    if (demo?.reply_sent && record.reply_draft) {
      record.reply_draft.status = "sent";
      record.reply_draft.approved_by = demo.officer ?? "Officer (demo)";
      state.audit.push(
        makeAuditEvent({
          case_id: record.case_id,
          actor: "officer",
          event_type: "reply.sent",
          summary: "Officer reviewed and released the citizen reply.",
          payload: { language: record.reply_draft.language },
        }),
      );
    }
    if (demo?.override_status) {
      setStatusInternal(state, record.case_id, demo.override_status, "officer", "Council Officer", "Demo seed state.");
    }
  }
}

// ---------------------------------------------------------------------------
// Internal mutators (operate on an explicit state for seed reuse)
// ---------------------------------------------------------------------------

function setStatusInternal(
  state: DemoState,
  caseId: string,
  status: CaseStatus,
  actor: "officer" | "supervisor" | "system",
  actorLabel: string,
  note?: string,
): CitizenCase | null {
  const record = state.cases.get(caseId);
  if (!record) return null;
  const fromStatus = record.status;
  record.status = status;
  record.updated_at = nowIso();
  state.audit.push(
    makeAuditEvent({
      case_id: caseId,
      actor,
      actor_label: actorLabel,
      event_type: "status.changed",
      summary: `Status changed to "${status}".${note ? ` ${note}` : ""}`,
      payload: { from_status: fromStatus, to_status: status, triage_revision: record.triage_revision },
    }),
  );
  return record;
}

function recordDeniedStatus(
  state: DemoState,
  record: CitizenCase,
  status: CaseStatus,
  actorLabel: string,
  reason: string,
): void {
  state.audit.push(
    makeAuditEvent({
      case_id: record.case_id,
      actor: "officer",
      actor_label: actorLabel,
      event_type: "status.held",
      summary: `Held status change to "${status}". ${reason}`,
      payload: { status, current_status: record.status, reason, triage_revision: record.triage_revision },
    }),
  );
}

function applyDecision(
  state: DemoState,
  approvalId: string,
  triageRevision: number,
  decision: "approved" | "rejected",
  decidedBy: string,
  decidedRole: string,
  note: string,
): ApprovalTask {
  const trimmedNote = note.trim();
  if (!trimmedNote) throw new Error("Decision note is required.");

  const task = state.approvals.get(approvalId);
  if (!task) throw new Error("Approval task not found.");
  const record = state.cases.get(task.case_id);
  if (!record) throw new Error("Case not found.");
  if (record.status === "closed") throw new Error("Closed cases are immutable.");
  if (record.triage_revision !== triageRevision || task.triage_revision !== triageRevision) {
    throw new Error("stale_triage_revision");
  }
  if (record.approval_task_id !== task.approval_id) throw new Error("Approval task is not current.");
  if (task.status !== "pending") throw new Error("Approval task already decided.");
  if (
    !record.officer_review
    || record.officer_review.triage_revision !== triageRevision
    || !["proceed", "resubmit_approval"].includes(record.officer_review.resolution)
  ) {
    throw new Error("Current officer review is required before supervisor decision.");
  }
  if (hasBlockingGaps(record.missing_info) || record.status === "needs_info") {
    throw new Error("Missing information must be resolved before supervisor decision.");
  }
  // Governance: AI requested this; a human must decide. No self-approval.
  if (decidedBy === task.requested_by) throw new Error("Self-approval is not allowed.");
  if (decidedRole !== task.approver_role) {
    throw new Error(`Only a ${task.approver_role} may decide this task.`);
  }

  task.status = decision;
  task.decision_by = decidedBy;
  task.decision_note = trimmedNote;
  task.decided_at = nowIso();

  state.audit.push(
    makeAuditEvent({
      case_id: task.case_id,
      actor: "supervisor",
      actor_label: decidedBy,
      event_type: decision === "approved" ? "approval.approved" : "approval.rejected",
      summary: decision === "approved"
        ? "Supervisor approved the high-risk action."
        : "Supervisor rejected the high-risk action.",
      payload: { approval_id: approvalId, note: trimmedNote, triage_revision: triageRevision },
    }),
  );

  if (decision === "approved") {
    record.manual_review_reason = null;
    setStatusInternal(state, task.case_id, "routed", "supervisor", decidedBy);
  } else {
    record.manual_review_reason = "Supervisor rejected this case; a new officer resolution is required before further action.";
    record.officer_review = null;
    if (record.reply_draft) {
      record.reply_draft.status = "draft";
      record.reply_draft.approved_by = null;
      record.reply_draft.approved_revision = null;
    }
    setStatusInternal(state, task.case_id, "manual_review", "supervisor", decidedBy);
  }
  return task;
}

// ---------------------------------------------------------------------------
// Lazy singleton accessor
// ---------------------------------------------------------------------------

async function getState(): Promise<DemoState> {
  if (!globalThis.__civicflow) {
    const state = emptyState();
    // Store the readiness promise on globalThis so every module instance shares
    // the same seeding (race-safe across route bundles and hot reloads).
    globalThis.__civicflow = { state, ready: seed(state) };
  }
  await globalThis.__civicflow.ready;
  return globalThis.__civicflow.state;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface SubmitInput {
  text: string;
  language: Language;
  location_text?: string;
  media_refs?: string[];
  answers?: Record<string, string>;
  source_channel?: SourceChannel;
}

function byCreatedDesc(a: CitizenCase, b: CitizenCase): number {
  return b.created_at.localeCompare(a.created_at);
}

export async function submitCase(input: SubmitInput): Promise<CitizenCase> {
  const state = await getState();
  const answers = Object.fromEntries(
    Object.entries(input.answers ?? {})
      .map(([field, value]) => [field, String(value).trim()])
      .filter(([, value]) => value),
  ) as Record<string, string>;
  const locationText = (input.location_text?.trim() || answers.location || "").trim();
  const mediaRefs = (input.media_refs ?? []).map((value) => String(value).trim()).filter(Boolean);
  assertSyntheticDataOnly(input.text, locationText, ...mediaRefs, ...Object.values(answers));
  const built = await buildCase({
    case_id: newId("case"),
    citizen_ref: citizenRef(),
    source_channel: input.source_channel ?? "mobile_pwa",
    citizen_language: input.language,
    original_text: input.text.trim(),
    location_text: locationText,
    media_refs: mediaRefs,
    answers,
    created_at: nowIso(),
  });
  state.cases.set(built.record.case_id, built.record);
  if (built.approval) state.approvals.set(built.approval.approval_id, built.approval);
  state.audit.push(...built.events);
  return built.record;
}

export async function listCases(): Promise<CitizenCase[]> {
  const state = await getState();
  return [...state.cases.values()].sort(byCreatedDesc);
}

export async function getCase(idOrRef: string): Promise<CitizenCase | null> {
  const state = await getState();
  if (state.cases.has(idOrRef)) return state.cases.get(idOrRef) ?? null;
  const upper = idOrRef.toUpperCase();
  for (const c of state.cases.values()) {
    if (c.citizen_ref.toUpperCase() === upper) return c;
  }
  return null;
}

function findCase(state: DemoState, idOrRef: string): CitizenCase | null {
  if (state.cases.has(idOrRef)) return state.cases.get(idOrRef) ?? null;
  const upper = idOrRef.toUpperCase();
  for (const record of state.cases.values()) {
    if (record.citizen_ref.toUpperCase() === upper) return record;
  }
  return null;
}

export interface CitationKey {
  source_doc: string;
  section: string;
}

export interface ReviewCaseInput {
  case_id: string;
  triage_revision: number;
  officer: string;
  note: string;
  citizen_language: Language;
  category: CaseCategory;
  routing: { department: string; unit: string };
  citation_keys: CitationKey[];
  reply_body: string;
  reply_body_en: string;
  resolution: OfficerReviewResolution;
  welfare_outcome?: WelfareOutcome | null;
}

function citationId(citation: CitationKey): string {
  return `${citation.source_doc}\u0000${citation.section}`;
}

function sameCitationKeys(left: CitationKey[], right: CitationKey[]): boolean {
  const a = [...new Set(left.map(citationId))].sort();
  const b = [...new Set(right.map(citationId))].sort();
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function resolvePolicyCitations(record: CitizenCase, keys: CitationKey[]): PolicyCitation[] {
  const chunks = loadPolicyChunks();
  const unique = [...new Map(keys.map((key) => [citationId(key), key])).values()];
  return unique.map((key) => {
    const chunk = chunks.find(
      (candidate) => candidate.source_doc === key.source_doc && candidate.section === key.section,
    );
    if (!chunk) throw new Error("invalid_citation_key");
    const existing = record.citations.find(
      (citation) => citation.source_doc === key.source_doc && citation.section === key.section,
    );
    return {
      source_doc: chunk.source_doc,
      doc_title: chunk.doc_title,
      section: chunk.section,
      snippet: existing?.snippet ?? chunk.text.slice(0, 360),
      confidence: existing?.confidence ?? 1,
    };
  });
}

function currentGate(record: CitizenCase) {
  return evaluateApprovalGate({
    category: record.category,
    urgency: record.urgency,
    pii_risk: record.pii_risk,
    category_confidence: record.category_confidence,
  });
}

export async function reviewCase(input: ReviewCaseInput): Promise<CitizenCase> {
  const state = await getState();
  const record = state.cases.get(input.case_id);
  if (!record) throw new Error("case_not_found");
  if (record.status === "closed") throw new Error("Closed cases are immutable.");
  if (record.triage_revision !== input.triage_revision) throw new Error("stale_triage_revision");
  if (!record.reply_draft) throw new Error("Reply draft not found.");

  const officer = input.officer.trim();
  const note = input.note.trim();
  const department = input.routing.department.trim();
  const unit = input.routing.unit.trim();
  const replyBody = input.reply_body.trim();
  const replyBodyEn = input.reply_body_en.trim();
  if (!officer || !note || !department || !unit || !replyBody || !replyBodyEn) {
    throw new Error("Officer, note, routing and reply fields are required.");
  }
  assertSyntheticDataOnly(officer, note, department, unit, replyBody, replyBodyEn);

  const citations = resolvePolicyCitations(record, input.citation_keys);
  if (input.resolution !== "close_no_action" && citations.length === 0) {
    throw new Error("At least one valid policy citation is required to proceed.");
  }

  const substantive = record.citizen_language !== input.citizen_language
    || record.category !== input.category
    || record.department !== department
    || record.unit !== unit
    || !sameCitationKeys(record.citations, citations);
  const routingChanged = record.citizen_language !== input.citizen_language
    || record.category !== input.category
    || record.department !== department
    || record.unit !== unit;
  const replyEdited = record.reply_draft.language !== input.citizen_language
    || record.reply_draft.body !== replyBody
    || record.reply_draft.body_en !== replyBodyEn;
  const preserveSentReply = record.reply_draft.status === "sent" && !substantive && !replyEdited;
  const nextRevision = record.triage_revision + (substantive ? 1 : 0);
  const proposedMissing = detectMissingInfo(
    input.category,
    record.original_text,
    record.location_text,
    input.citizen_language,
    record.citizen_answers,
  );
  if (input.resolution !== "close_no_action" && hasBlockingGaps(proposedMissing)) {
    throw new Error("Missing information must be resolved before officer review can proceed.");
  }

  const proposedGate = evaluateApprovalGate({
    category: input.category,
    urgency: record.urgency,
    pii_risk: record.pii_risk,
    category_confidence: record.category_confidence,
  });
  const rejectedTask = [...state.approvals.values()].find(
    (task) => task.case_id === record.case_id && task.status === "rejected",
  );
  if (rejectedTask && proposedGate.requires_supervisor && input.resolution === "proceed") {
    throw new Error("Choose close without action or resubmit the rejected high-risk approval.");
  }
  if (
    input.resolution === "resubmit_approval"
    && (!rejectedTask || !substantive || !proposedGate.requires_supervisor)
  ) {
    throw new Error("Rejected high-risk approval requires substantive edits before resubmission.");
  }

  const fromStatus = record.status;
  const preserveInProgress = fromStatus === "in_progress"
    && !substantive
    && input.resolution === "proceed";
  const superseded: ApprovalTask[] = [];
  if (substantive) {
    for (const task of state.approvals.values()) {
      if (task.case_id !== record.case_id || !["pending", "approved"].includes(task.status)) continue;
      task.status = "superseded";
      if (!task.decided_at) {
        task.decided_at = nowIso();
        task.decision_by = officer;
        task.decision_note = `Superseded by triage revision ${nextRevision}.`;
      }
      superseded.push(task);
    }
  }

  Object.assign(record, {
    citizen_language: input.citizen_language,
    category: input.category,
    department,
    unit,
    citations,
    missing_info: proposedMissing,
    triage_revision: nextRevision,
    manual_review_reason: null,
    officer_review_only: proposedGate.officer_review_only,
    updated_at: nowIso(),
  });
  if (record.routing) {
    Object.assign(record.routing, {
      category: input.category,
      department,
      unit,
      requires_supervisor: proposedGate.requires_supervisor,
      rule_id: routingChanged ? "officer-confirmed" : record.routing.rule_id,
      rationale: routingChanged
        ? "Routing facts confirmed by a council officer during case review."
        : record.routing.rationale,
    });
  }

  let approval = record.approval_task_id ? state.approvals.get(record.approval_task_id) ?? null : null;
  let createdApproval: ApprovalTask | null = null;
  if (input.resolution !== "close_no_action" && proposedGate.requires_supervisor) {
    const reusable = !substantive
      && approval?.triage_revision === nextRevision
      && ["pending", "approved"].includes(approval.status);
    if (!reusable) {
      approval = buildApprovalTask({
        case_id: record.case_id,
        triage_revision: nextRevision,
        title: `Supervisor approval - ${department} / ${unit}`,
        reason: proposedGate.reason,
        risk_factors: proposedGate.risk_factors,
        evidence: citations,
      });
      state.approvals.set(approval.approval_id, approval);
      createdApproval = approval;
    }
    record.approval_task_id = approval!.approval_id;
    record.status = preserveInProgress
      ? "in_progress"
      : approval!.status === "approved"
        ? "routed"
        : "awaiting_supervisor";
  } else if (input.resolution === "close_no_action") {
    record.status = "manual_review";
    record.manual_review_reason = "Officer resolved this case for closure without operational action.";
  } else {
    record.approval_task_id = null;
    record.status = preserveInProgress ? "in_progress" : "routed";
  }

  Object.assign(record.reply_draft, {
    language: input.citizen_language,
    body: replyBody,
    body_en: replyBodyEn,
    citations,
    status: preserveSentReply ? "sent" : "approved",
    approved_by: officer,
    approved_revision: nextRevision,
  });
  record.officer_review = {
    triage_revision: nextRevision,
    officer,
    reviewed_at: nowIso(),
    note,
    resolution: input.resolution,
    welfare_outcome: input.welfare_outcome ?? null,
  };

  for (const task of superseded) {
    state.audit.push(
      makeAuditEvent({
        case_id: record.case_id,
        actor: "officer",
        actor_label: officer,
        event_type: "approval.superseded",
        summary: "A prior supervisor approval was superseded by revised triage facts.",
        payload: { approval_id: task.approval_id, triage_revision: nextRevision },
      }),
    );
  }
  if (createdApproval) {
    state.audit.push(
      makeAuditEvent({
        case_id: record.case_id,
        actor: "system",
        event_type: "approval.created",
        summary: "Supervisor approval task created for the reviewed triage revision.",
        payload: { approval_id: createdApproval.approval_id, triage_revision: nextRevision },
      }),
    );
  }
  state.audit.push(
    makeAuditEvent({
      case_id: record.case_id,
      actor: "officer",
      actor_label: officer,
      event_type: "officer.reviewed",
      summary: "Officer confirmed the case triage and citizen reply.",
      payload: { triage_revision: nextRevision, resolution: input.resolution, substantive },
    }),
  );
  if (!preserveSentReply) {
    state.audit.push(
      makeAuditEvent({
        case_id: record.case_id,
        actor: "officer",
        actor_label: officer,
        event_type: "reply.approved",
        summary: "Officer approved the citizen reply for the current triage revision.",
        payload: { triage_revision: nextRevision, language: input.citizen_language },
      }),
    );
  }
  if (fromStatus !== record.status) {
    state.audit.push(
      makeAuditEvent({
        case_id: record.case_id,
        actor: "officer",
        actor_label: officer,
        event_type: "status.changed",
        summary: `Status changed to "${record.status}" after officer review.`,
        payload: { from_status: fromStatus, to_status: record.status, triage_revision: nextRevision },
      }),
    );
  }
  return record;
}

export async function updateCitizenDetails(args: {
  id_or_ref: string;
  triage_revision: number;
  answers: Record<string, string>;
}): Promise<CitizenCase> {
  const state = await getState();
  const record = findCase(state, args.id_or_ref);
  if (!record) throw new Error("case_not_found");
  if (record.triage_revision !== args.triage_revision) throw new Error("stale_triage_revision");
  if (record.status !== "needs_info") throw new Error("case_not_waiting_for_details");

  const allowed = new Set(
    record.missing_info
      .filter((item) => item.required && !item.satisfied)
      .map((item) => item.field),
  );
  const answers = Object.fromEntries(
    Object.entries(args.answers)
      .map(([field, value]) => [field, String(value).trim()])
      .filter(([, value]) => value),
  ) as Record<string, string>;
  if (Object.keys(answers).length === 0 || Object.keys(answers).some((field) => !allowed.has(field))) {
    throw new Error("invalid_detail_fields");
  }
  for (const [field, value] of Object.entries(answers)) {
    if (value.length > (field === "location" ? 200 : 500)) throw new Error("detail_too_long");
  }
  assertSyntheticDataOnly(...Object.values(answers));

  const mergedAnswers = { ...record.citizen_answers, ...answers };
  const nextRevision = record.triage_revision + 1;
  const fromStatus = record.status;
  const detailsEvent = makeAuditEvent({
    case_id: record.case_id,
    actor: "citizen",
    event_type: "citizen.details_submitted",
    summary: "Citizen supplied requested case details.",
    payload: { fields: Object.keys(answers), triage_revision: nextRevision },
  });
  const triage = await runTriage({
    case_id: record.case_id,
    citizen_ref: record.citizen_ref,
    text: record.original_text,
    selected_language: record.citizen_language,
    location_text: mergedAnswers.location ?? record.location_text,
    answers: mergedAnswers,
  });
  if (record.triage_revision !== args.triage_revision) throw new Error("stale_triage_revision");
  const result = triage.result;

  let approval: ApprovalTask | null = null;
  if (triage.status === "awaiting_supervisor") {
    approval = buildApprovalTask({
      case_id: record.case_id,
      triage_revision: nextRevision,
      title: `Supervisor approval — ${result.department} / ${result.unit}`,
      reason: triage.gate.reason,
      risk_factors: triage.gate.risk_factors,
      evidence: result.citations,
    });
    state.approvals.set(approval.approval_id, approval);
  }

  Object.assign(record, {
    citizen_answers: mergedAnswers,
    triage_revision: nextRevision,
    location_text: mergedAnswers.location ?? record.location_text,
    translated_text_en: result.translated_text_en,
    category: result.category,
    pii_risk: result.pii_risk,
    urgency: result.urgency,
    department: result.department,
    status: triage.status,
    updated_at: nowIso(),
    detected_language: result.detected_language,
    category_confidence: result.category_confidence,
    unit: result.unit,
    ai_mode: result.ai_mode,
    missing_info: result.missing_info,
    citations: result.citations,
    routing: result.routing,
    approval_task_id: approval?.approval_id ?? null,
    manual_review_reason: result.manual_review_reason,
    officer_review_only: result.officer_review_only,
    reply_draft: result.reply_draft,
  });

  state.audit.push(detailsEvent, ...triage.audit);
  if (approval) {
    state.audit.push(
      makeAuditEvent({
        case_id: record.case_id,
        actor: "system",
        event_type: "approval.created",
        summary: "Supervisor approval task created and queued.",
        payload: { approval_id: approval.approval_id, triage_revision: nextRevision },
      }),
    );
  }
  state.audit.push(
    makeAuditEvent({
      case_id: record.case_id,
      actor: "system",
      event_type: "status.changed",
      summary: `Status changed to "${triage.status}" after citizen follow-up.`,
      payload: { from_status: fromStatus, to_status: triage.status, triage_revision: nextRevision },
    }),
  );
  return record;
}

export async function listApprovals(status?: ApprovalStatus): Promise<ApprovalTask[]> {
  const state = await getState();
  const all = [...state.approvals.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));
  return status ? all.filter((t) => t.status === status) : all;
}

export async function getApproval(id: string): Promise<ApprovalTask | null> {
  const state = await getState();
  return state.approvals.get(id) ?? null;
}

export async function decideApproval(args: {
  approval_id: string;
  triage_revision: number;
  decision: "approved" | "rejected";
  decided_by?: string;
  decided_role?: string;
  note?: string;
}): Promise<ApprovalTask> {
  const state = await getState();
  const note = (args.note ?? "").trim();
  if (!note) throw new Error("Decision note is required.");
  return applyDecision(
    state,
    args.approval_id,
    args.triage_revision,
    args.decision,
    args.decided_by ?? "Supervisor (demo)",
    args.decided_role ?? "supervisor",
    note,
  );
}

export async function listAudit(caseId?: string): Promise<AuditEvent[]> {
  const state = await getState();
  const all = [...state.audit].sort((a, b) => a.created_at.localeCompare(b.created_at));
  return caseId ? all.filter((e) => e.case_id === caseId) : all;
}

export async function releaseReply(args: {
  case_id: string;
  triage_revision: number;
  officer?: string;
}): Promise<CitizenCase> {
  const state = await getState();
  const record = state.cases.get(args.case_id);
  if (!record || !record.reply_draft) throw new Error("Case or reply draft not found.");
  if (record.status === "closed") throw new Error("Closed cases are immutable.");
  if (record.triage_revision !== args.triage_revision) throw new Error("stale_triage_revision");
  const review = record.officer_review;
  if (!review || review.triage_revision !== record.triage_revision) {
    throw new Error("Current officer review is required before reply release.");
  }
  if (
    record.reply_draft.status !== "approved"
    || record.reply_draft.approved_revision !== record.triage_revision
  ) {
    throw new Error("The current citizen reply must be approved before release.");
  }
  if (hasBlockingGaps(record.missing_info) && review.resolution !== "close_no_action") {
    throw new Error("Missing information must be resolved before reply release.");
  }
  if (review.resolution !== "close_no_action" && currentGate(record).requires_supervisor) {
    const approval = record.approval_task_id
      ? state.approvals.get(record.approval_task_id) ?? null
      : null;
    if (
      !approval
      || approval.triage_revision !== record.triage_revision
      || approval.status !== "approved"
    ) {
      throw new Error("Current supervisor approval is required before reply release.");
    }
  }
  const officer = (args.officer ?? "Officer (demo)").trim();
  if (!officer) throw new Error("Officer is required.");
  record.reply_draft.status = "sent";
  record.reply_draft.approved_by = officer;
  record.updated_at = nowIso();
  state.audit.push(
    makeAuditEvent({
      case_id: record.case_id,
      actor: "officer",
      actor_label: officer,
      event_type: "reply.sent",
      summary: "Officer reviewed and released the citizen reply.",
      payload: { language: record.reply_draft.language, triage_revision: record.triage_revision },
    }),
  );
  return record;
}

export async function setStatus(args: {
  case_id: string;
  triage_revision: number;
  status: CaseStatus;
  actor_label?: string;
  note?: string;
}): Promise<CitizenCase> {
  const state = await getState();
  const record = state.cases.get(args.case_id);
  if (!record) throw new Error("Case not found.");
  const actorLabel = args.actor_label ?? "Council Officer";
  const hold = (reason: string): never => {
    recordDeniedStatus(state, record, args.status, actorLabel, reason);
    throw new Error(reason);
  };

  if (record.status === "closed") hold("Closed cases are immutable.");
  if (record.triage_revision !== args.triage_revision) throw new Error("stale_triage_revision");
  if (args.status !== "in_progress" && args.status !== "closed") {
    hold("Only start-work and close actions are available through this endpoint.");
  }
  if (hasBlockingGaps(record.missing_info)) {
    hold("Missing information must be resolved before work can start or the case can be closed.");
  }
  if (record.status === "manual_review" && !record.officer_review) {
    hold(record.manual_review_reason ?? "Manual review is required before changing case status.");
  }
  const review = record.officer_review;
  if (!review) {
    const reason = "Current officer review is required before changing case status.";
    recordDeniedStatus(state, record, args.status, actorLabel, reason);
    throw new Error(reason);
  }
  if (review.triage_revision !== record.triage_revision) {
    hold("Current officer review is required before changing case status.");
  }

  if (args.status === "in_progress") {
    if (review.resolution !== "proceed") hold("Only a proceed resolution may start operational work.");
    if (record.citations.length === 0) hold("A valid policy citation is required before work can start.");
    if (currentGate(record).requires_supervisor) {
      const approval = record.approval_task_id
        ? state.approvals.get(record.approval_task_id) ?? null
        : null;
      if (
        !approval
        || approval.triage_revision !== record.triage_revision
        || approval.status !== "approved"
      ) {
        hold("Current supervisor approval is required before work can start.");
      }
    }
    if (record.status !== "routed") hold("The case must be routed before work can start.");
  } else {
    if (record.reply_draft?.status !== "sent") hold("Citizen reply must be sent before closure.");
    if (!(args.note ?? "").trim()) hold("A non-empty closure note is required.");
    if (record.category === "education_aid_welfare" && !review.welfare_outcome) {
      hold("A human welfare outcome is required before closure.");
    }
    if (review.resolution === "proceed" && record.status !== "in_progress") {
      hold("Proceed cases must start work before closure.");
    }
  }

  return setStatusInternal(
    state,
    args.case_id,
    args.status,
    "officer",
    actorLabel,
    args.note?.trim(),
  )!;
}

export async function resetStore(): Promise<void> {
  const state = emptyState();
  globalThis.__civicflow = { state, ready: seed(state) };
  await globalThis.__civicflow.ready;
}
