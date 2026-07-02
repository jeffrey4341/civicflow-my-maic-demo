import Link from "next/link";
import { notFound } from "next/navigation";
import { getApproval, getCase, listAudit } from "@/lib/store";
import { LANGUAGE_NAMES, categoryLabel } from "@/lib/i18n";
import { statusActionBlocker } from "@/lib/lifecycle";
import {
  AuditTimeline,
  Badge,
  CitationCard,
  ConfidenceBar,
  PiiBadge,
  StatusBadge,
  UrgencyBadge,
} from "@/components/ui";
import { ApprovalActions } from "@/components/officer/ApprovalActions";
import { ReplyActions } from "@/components/officer/ReplyActions";
import { StatusActions } from "@/components/officer/StatusActions";

export const dynamic = "force-dynamic";

export default async function OfficerCaseDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await getCase(id);
  if (!c) notFound();
  const [approval, audit] = await Promise.all([
    c.approval_task_id ? getApproval(c.approval_task_id) : Promise.resolve(null),
    listAudit(c.case_id),
  ]);
  const reply = c.reply_draft;
  const actionBlocker = statusActionBlocker(c, approval);

  return (
    <div>
      <Link href="/officer" className="text-xs text-slate-600 hover:underline">← Back to queue</Link>

      {/* Header */}
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-mono text-xl font-bold text-civic-700">{c.citizen_ref}</h1>
            <StatusBadge status={c.status} />
            <UrgencyBadge urgency={c.urgency} />
            {c.pii_risk !== "low" && <PiiBadge risk={c.pii_risk} />}
          </div>
          <p className="mt-1 text-xs text-slate-600">
            {c.case_id} · {LANGUAGE_NAMES[c.detected_language]} · via {c.source_channel} · {new Date(c.created_at).toLocaleString("en-GB")}
          </p>
        </div>
        <StatusActions
          caseId={c.case_id}
          status={c.status}
          blocker={actionBlocker}
          officerReviewOnly={c.officer_review_only}
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-5 lg:col-span-2">
          {/* Citizen request */}
          <Panel title="Citizen request">
            <p className="text-sm text-slate-800">{c.original_text}</p>
            <p className="mt-2 text-sm italic text-slate-500">EN: {c.translated_text_en}</p>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
              <span>📍 {c.location_text || "—"}</span>
              <span>📎 {c.media_refs.length > 0 ? c.media_refs.join(", ") : "no attachments"}</span>
            </div>
          </Panel>

          {/* AI triage */}
          <Panel title="AI triage" badge={<AiModeBadge mode={c.ai_mode} />}>
            {c.manual_review_reason && (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-sm font-semibold text-amber-900">Manual review required</p>
                <p className="mt-1 text-xs text-amber-800">{c.manual_review_reason}</p>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Category" value={categoryLabel(c.category)} />
              <Field
                label={c.status === "manual_review" ? "Manual triage queue" : "Department / Unit"}
                value={c.status === "manual_review" ? `${c.department} / ${c.unit} (manual triage)` : `${c.department} / ${c.unit}`}
              />
              <div className="sm:col-span-2">
                <ConfidenceBar value={c.category_confidence} label="Classification confidence" />
              </div>
              {c.routing && (
                <div className="sm:col-span-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                  <span className="font-medium text-slate-700">Routing ({c.routing.rule_id}):</span> {c.routing.rationale}
                  <span className="ml-1 text-slate-600">SLA target: {c.routing.sla_hours}h.</span>
                </div>
              )}
            </div>
            {c.missing_info.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-medium text-slate-500">Missing-info detection</p>
                <ul className="mt-1 space-y-1">
                  {c.missing_info.map((m) => (
                    <li key={m.field} className="text-xs text-slate-600">
                      {m.satisfied ? "✓" : m.required ? "✗ (required)" : "○ (optional)"} {m.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Panel>

          {/* SOP citations */}
          <Panel title="SOP / policy citations">
            {c.citations.length > 0 ? (
              <div className="space-y-3">
                {c.citations.map((cit, i) => <CitationCard key={i} citation={cit} />)}
              </div>
            ) : (
              <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                No citation above threshold — flagged for manual officer review (fallback).
              </p>
            )}
          </Panel>

          {/* Reply draft */}
          <Panel
            title="Citizen reply (AI draft)"
            badge={reply ? <Badge className="bg-slate-100 text-slate-600">{reply.status}</Badge> : undefined}
          >
            {reply ? (
              <>
                <div className="rounded-lg border border-civic-100 bg-civic-50 p-3 text-sm text-slate-800">{reply.body}</div>
                <details className="mt-2 text-xs text-slate-500">
                  <summary className="cursor-pointer">English reference</summary>
                  <p className="mt-1 text-slate-600">{reply.body_en}</p>
                </details>
                <div className="mt-3">
                  <ReplyActions caseId={c.case_id} sent={reply.status === "sent"} />
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-500">No reply drafted.</p>
            )}
          </Panel>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Approval */}
          <Panel title="Supervisor approval">
            {approval ? (
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">{approval.title}</span>
                  <Badge
                    className={
                      approval.status === "pending"
                        ? "bg-orange-100 text-orange-800"
                        : approval.status === "approved"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-red-100 text-red-800"
                    }
                  >
                    {approval.status}
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-slate-500">{approval.reason}</p>
                <ul className="mt-2 space-y-1">
                  {approval.risk_factors.map((rf, i) => (
                    <li key={i} className="text-[12px] text-slate-600">⚠️ {rf}</li>
                  ))}
                </ul>
                {approval.status === "pending" ? (
                  <div className="mt-3">
                    <ApprovalActions approvalId={approval.approval_id} />
                  </div>
                ) : (
                  <p className="mt-3 rounded-lg bg-slate-50 p-2 text-[12px] text-slate-600">
                    {approval.status === "approved" ? "Approved" : "Rejected"} by {approval.decision_by}
                    {approval.decision_note ? ` — “${approval.decision_note}”` : ""}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                No supervisor approval required.
                {c.category === "education_aid_welfare" ? " Eligibility is decided by an officer (no auto-approval)." : ""}
              </p>
            )}
          </Panel>

          {/* Audit */}
          <Panel title="Audit evidence timeline">
            <AuditTimeline events={audit} />
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Panel({ title, badge, children }: { title: string; badge?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
        {badge}
      </div>
      {children}
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-slate-600">{label}</div>
      <div className="text-sm font-medium text-slate-800">{value}</div>
    </div>
  );
}

function AiModeBadge({ mode }: { mode: string }) {
  return mode === "llm" ? (
    <Badge className="bg-indigo-100 text-indigo-700">LLM-assisted</Badge>
  ) : (
    <Badge className="bg-slate-100 text-slate-600">Deterministic engine</Badge>
  );
}
