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
  AuditEvent,
  CaseStatus,
  CitizenCase,
  Language,
  SourceChannel,
} from "@/lib/types";
import { citizenRef, newId, nowIso } from "@/lib/util";
import { runTriage } from "@/lib/ai/pipeline";
import { buildApprovalTask } from "@/lib/ai/approval";
import { makeAuditEvent } from "@/lib/audit";
import { getStatusTransitionBlocker } from "@/lib/lifecycle";

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
  });
  const r = triage.result;
  events.push(...triage.audit);

  let approval: ApprovalTask | null = null;
  if (triage.gate.requires_supervisor) {
    approval = buildApprovalTask({
      case_id: input.case_id,
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
        payload: { approval_id: approval.approval_id, approver_role: approval.approver_role },
      }),
    );
  }

  events.push(
    makeAuditEvent({
      case_id: input.case_id,
      actor: "system",
      event_type: "status.changed",
      summary: `Case status set to "${triage.status}".`,
      payload: { status: triage.status },
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
      created_at: s.created_at ?? nowIso(),
    });

    const { record } = built;
    state.cases.set(record.case_id, record);
    if (built.approval) state.approvals.set(built.approval.approval_id, built.approval);
    state.audit.push(...built.events);

    // Optional demo adjustments to populate a realistic officer queue.
    const demo = s.demo;
    if (demo?.approve && built.approval) {
      applyDecision(state, built.approval.approval_id, "approved", demo.officer ?? "Supervisor (demo)", "supervisor", "Approved for the demo seed.");
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
  record.status = status;
  record.updated_at = nowIso();
  state.audit.push(
    makeAuditEvent({
      case_id: caseId,
      actor,
      actor_label: actorLabel,
      event_type: "status.changed",
      summary: `Status changed to "${status}".${note ? ` ${note}` : ""}`,
      payload: { status },
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
      event_type: "status.denied",
      summary: `Denied status change to "${status}". ${reason}`,
      payload: { status, current_status: record.status, reason },
    }),
  );
}

function applyDecision(
  state: DemoState,
  approvalId: string,
  decision: ApprovalStatus,
  decidedBy: string,
  decidedRole: string,
  note: string,
): ApprovalTask {
  const trimmedNote = note.trim();
  if (!trimmedNote) throw new Error("Decision note is required.");

  const task = state.approvals.get(approvalId);
  if (!task) throw new Error("Approval task not found.");
  if (task.status !== "pending") throw new Error("Approval task already decided.");
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
      payload: { approval_id: approvalId, note: trimmedNote },
    }),
  );

  if (decision === "approved") {
    setStatusInternal(state, task.case_id, "in_progress", "supervisor", decidedBy);
  } else {
    const record = state.cases.get(task.case_id);
    if (record) {
      record.manual_review_reason = "Supervisor rejected this case; manual officer review is required before further action.";
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
  source_channel?: SourceChannel;
}

function byCreatedDesc(a: CitizenCase, b: CitizenCase): number {
  return b.created_at.localeCompare(a.created_at);
}

export async function submitCase(input: SubmitInput): Promise<CitizenCase> {
  const state = await getState();
  const built = await buildCase({
    case_id: newId("case"),
    citizen_ref: citizenRef(),
    source_channel: input.source_channel ?? "mobile_pwa",
    citizen_language: input.language,
    original_text: input.text.trim(),
    location_text: (input.location_text ?? "").trim(),
    media_refs: input.media_refs ?? [],
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
  decision: ApprovalStatus;
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

export async function releaseReply(caseId: string, officer = "Officer (demo)"): Promise<CitizenCase> {
  const state = await getState();
  const record = state.cases.get(caseId);
  if (!record || !record.reply_draft) throw new Error("Case or reply draft not found.");
  record.reply_draft.status = "sent";
  record.reply_draft.approved_by = officer;
  record.updated_at = nowIso();
  state.audit.push(
    makeAuditEvent({
      case_id: caseId,
      actor: "officer",
      actor_label: officer,
      event_type: "reply.sent",
      summary: "Officer reviewed and released the citizen reply.",
      payload: { language: record.reply_draft.language },
    }),
  );
  if (record.status === "routed" || record.status === "in_progress") {
    setStatusInternal(state, caseId, "in_progress", "officer", officer);
  }
  return record;
}

export async function setStatus(args: {
  case_id: string;
  status: CaseStatus;
  actor_label?: string;
}): Promise<CitizenCase> {
  const state = await getState();
  const record = state.cases.get(args.case_id);
  if (!record) throw new Error("Case not found.");

  const approval = record.approval_task_id ? state.approvals.get(record.approval_task_id) ?? null : null;
  const actorLabel = args.actor_label ?? "Council Officer";
  const blocker = getStatusTransitionBlocker(record, args.status, approval);
  if (blocker) {
    recordDeniedStatus(state, record, args.status, actorLabel, blocker);
    throw new Error(blocker);
  }

  return setStatusInternal(state, args.case_id, args.status, "officer", actorLabel)!;
}

export async function resetStore(): Promise<void> {
  const state = emptyState();
  globalThis.__civicflow = { state, ready: seed(state) };
  await globalThis.__civicflow.ready;
}
