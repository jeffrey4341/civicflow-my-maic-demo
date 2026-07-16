import Link from "next/link";
import { notFound } from "next/navigation";

import { ApprovalActions } from "@/components/officer/ApprovalActions";
import { OfficerReviewForm } from "@/components/officer/OfficerReviewForm";
import { ReplyActions } from "@/components/officer/ReplyActions";
import { StatusActions } from "@/components/officer/StatusActions";
import { AuditTimeline, Badge, StatusBadge, UrgencyBadge } from "@/components/ui";
import { LANGUAGE_NAMES, categoryLabel } from "@/lib/i18n";
import { getApproval, getCase, listAudit } from "@/lib/store";
import type { ApprovalTask, CitizenCase } from "@/lib/types";

export const dynamic = "force-dynamic";

function hasCurrentReview(c: CitizenCase): boolean {
  return Boolean(c.officer_review && c.officer_review.triage_revision === c.triage_revision);
}

function nextRequiredAction(c: CitizenCase, approval: ApprovalTask | null): { title: string; detail: string } {
  if (c.status === "closed") return { title: "No further action", detail: "This case is closed and its audit record is read-only." };
  if (c.status === "needs_info") return { title: "Wait for citizen details", detail: "Required information is missing. The citizen can add it with the tracking code before review continues." };
  if (!hasCurrentReview(c)) return { title: "Complete officer review", detail: "Confirm the case facts, policy evidence, routing, and citizen reply for this revision." };
  if (approval?.status === "pending") return { title: "Supervisor decision required", detail: "The current reviewed revision is high risk and cannot proceed until a supervisor decides." };
  if (approval?.status === "rejected") return { title: "Resolve rejected decision", detail: "Close without operational action, or make substantive changes and resubmit for supervisor approval." };
  if (c.reply_draft?.status !== "sent") return { title: "Send the reviewed reply", detail: "The reply is approved for this revision but remains a draft until an officer sends it." };
  if (c.status === "routed") return { title: "Start council work", detail: "The reviewed case is routed and the citizen reply is sent. Record the explicit start of work." };
  if (c.status === "in_progress") return { title: "Complete and close", detail: "When council work is complete, record a closure note and close the case." };
  if (c.officer_review?.resolution === "close_no_action") return { title: "Close with a recorded note", detail: "The reviewed reply has been sent. Record why no operational action is required." };
  return { title: "Review current case state", detail: "Check the reviewed facts and audit trail before the next action." };
}

function replyBlocker(c: CitizenCase, approval: ApprovalTask | null): string | null {
  if (!hasCurrentReview(c)) return "Save an officer review for the current revision first.";
  if (!c.reply_draft || c.reply_draft.status === "draft" || c.reply_draft.approved_revision !== c.triage_revision) {
    return "Approve the current reply by saving the officer review first.";
  }
  if (c.missing_info.some((item) => item.required && !item.satisfied) && c.officer_review?.resolution !== "close_no_action") {
    return "Required citizen information is still missing.";
  }
  if (approval && approval.triage_revision === c.triage_revision && approval.status !== "approved") {
    return "The current supervisor decision must be approved before the reply can be sent.";
  }
  return null;
}

function startBlocker(c: CitizenCase, approval: ApprovalTask | null): string | null {
  if (c.reply_draft?.status !== "sent") return "Send the reviewed citizen reply before starting work.";
  if (!hasCurrentReview(c) || !["proceed", "resubmit_approval"].includes(c.officer_review!.resolution)) {
    return "A current proceed or approved-resubmission review is required before work can start.";
  }
  if (c.citations.length === 0) return "Select at least one valid policy citation before starting work.";
  if (approval && approval.triage_revision === c.triage_revision && approval.status !== "approved") {
    return "Current supervisor approval is required before work can start.";
  }
  if (c.status !== "routed" && c.status !== "in_progress") return "The case must be routed before work can start.";
  return null;
}

function closeBlocker(c: CitizenCase): string | null {
  if (!hasCurrentReview(c)) return "A current officer review is required before closure.";
  if (c.reply_draft?.status !== "sent") return "Send the citizen reply before closure.";
  if (c.category === "education_aid_welfare" && !c.officer_review?.welfare_outcome) {
    return "Record a human welfare outcome in the officer review before closure.";
  }
  if (c.officer_review?.resolution !== "close_no_action" && c.status !== "in_progress") {
    return "Actionable cases must start council work before closure.";
  }
  return null;
}

export default async function OfficerCaseDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await getCase(id);
  if (!c) notFound();
  const [approval, audit] = await Promise.all([
    c.approval_task_id ? getApproval(c.approval_task_id) : Promise.resolve(null),
    listAudit(c.case_id),
  ]);
  const nextAction = nextRequiredAction(c, approval);
  const currentReview = hasCurrentReview(c);
  const canResubmit = approval?.status === "rejected";
  const reply = c.reply_draft;

  return (
    <div>
      <Link href="/officer" className="inline-flex min-h-11 items-center text-sm font-medium text-civic-800 underline-offset-4 hover:underline">
        ← Back to case queue
      </Link>

      <header className="mt-3 border-b border-slate-200 pb-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-mono text-sm font-semibold text-civic-800">{c.citizen_ref}</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Review and decide</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Revision {c.triage_revision} · {LANGUAGE_NAMES[c.citizen_language]} · submitted {new Date(c.created_at).toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short" })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={c.status} />
            <UrgencyBadge urgency={c.urgency} />
            {c.pii_risk !== "low" ? <Badge className="bg-red-100 text-red-800">PII review: {c.pii_risk}</Badge> : null}
          </div>
        </div>
      </header>

      <div className="space-y-8 pt-8">
        <DecisionSection id="next-required-action" title="Next required action">
          <div className="rounded-lg border border-civic-200 bg-civic-50 px-5 py-4">
            <p className="text-lg font-semibold text-civic-950">{nextAction.title}</p>
            <p className="mt-1 text-sm leading-6 text-civic-950">{nextAction.detail}</p>
          </div>
        </DecisionSection>

        <DecisionSection id="officer-review" title="Officer review">
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            The automated triage is a starting point. An officer confirms the facts, evidence, routing, and reply before anything is sent or work begins.
          </p>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.6fr)]">
            <div>
              <h3 className="font-semibold text-slate-950">Citizen request</h3>
              <blockquote className="mt-3 border-y border-slate-200 py-3 text-base leading-7 text-slate-900">{c.original_text}</blockquote>
              {c.translated_text_en !== c.original_text ? <p className="mt-3 text-sm leading-6 text-slate-600">English reference: {c.translated_text_en}</p> : null}
              <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                <Fact label="Selected language" value={LANGUAGE_NAMES[c.citizen_language]} />
                <Fact label="Detected language" value={LANGUAGE_NAMES[c.detected_language]} />
                <Fact label="Category" value={categoryLabel(c.category)} />
                <Fact label="Suggested team" value={`${c.department} / ${c.unit}`} />
                <Fact label="Location" value={c.location_text || "Not supplied"} />
                <Fact label="Attachments" value={c.media_refs.length > 0 ? c.media_refs.join(", ") : "None"} />
              </dl>
              {Object.keys(c.citizen_answers).length > 0 ? (
                <div className="mt-6">
                  <h3 className="font-semibold text-slate-950">Citizen follow-up details</h3>
                  <dl className="mt-3 divide-y divide-slate-200 border-y border-slate-200">
                    {Object.entries(c.citizen_answers).map(([field, value]) => (
                      <div key={field} className="grid gap-1 py-3 sm:grid-cols-[180px_1fr]">
                        <dt className="text-sm font-medium capitalize text-slate-600">{field.replaceAll("_", " ")}</dt>
                        <dd className="text-sm text-slate-900">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : null}
            </div>

            <aside className="border-t border-slate-200 pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
              <h3 className="font-semibold text-slate-950">Triage snapshot</h3>
              <dl className="mt-3 space-y-4">
                <Fact label="Classification confidence" value={`${Math.round(c.category_confidence * 100)}%`} />
                <Fact label="Processing mode" value={c.ai_mode === "llm" ? "Model-assisted" : "Deterministic rules"} />
                <Fact label="Service target" value={c.routing ? `${c.routing.sla_hours} hours` : "Officer to confirm"} />
                <Fact label="Current review" value={currentReview ? `Saved by ${c.officer_review?.officer}` : "Not saved for this revision"} />
                {c.category === "education_aid_welfare" ? (
                  <Fact
                    label="Human welfare outcome"
                    value={c.officer_review?.welfare_outcome === "eligible"
                      ? "Eligible after officer review"
                      : c.officer_review?.welfare_outcome === "not_eligible"
                        ? "Not eligible after officer review"
                        : "Not recorded"}
                  />
                ) : null}
              </dl>
              {c.manual_review_reason ? <p className="mt-5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">{c.manual_review_reason}</p> : null}
              {c.missing_info.some((item) => item.required && !item.satisfied) ? (
                <div className="mt-5">
                  <h3 className="text-sm font-semibold text-slate-950">Still required</h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-700">
                    {c.missing_info.filter((item) => item.required && !item.satisfied).map((item) => <li key={item.field}>{item.label}</li>)}
                  </ul>
                </div>
              ) : null}
            </aside>
          </div>

          <div className="mt-8 border-t border-slate-300 pt-7">
            <OfficerReviewForm
              key={`${c.triage_revision}-${c.officer_review?.reviewed_at ?? "new"}`}
              caseData={c}
              canResubmit={canResubmit}
              closeNoActionBlocker={approval?.status === "pending"
                ? "A supervisor must approve or reject the current high-risk review before an officer can close it without action."
                : null}
            />
          </div>
        </DecisionSection>

        <DecisionSection id="supervisor-decision" title="Supervisor decision">
          {approval ? (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.7fr)]">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <ApprovalBadge status={approval.status} />
                  <span className="text-sm text-slate-600">Revision {approval.triage_revision}</span>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-950">{approval.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-700">{approval.reason}</p>
                {approval.risk_factors.length > 0 ? (
                  <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700">
                    {approval.risk_factors.map((factor) => <li key={factor}>{factor}</li>)}
                  </ul>
                ) : null}
                {approval.decision_by ? (
                  <p className="mt-4 text-sm leading-6 text-slate-700">
                    Decision by <span className="font-medium">{approval.decision_by}</span>{approval.decision_note ? ` — ${approval.decision_note}` : ""}
                  </p>
                ) : null}
              </div>
              <div>
                {approval.status === "pending" ? (
                  <ApprovalActions
                    approvalId={approval.approval_id}
                    triageRevision={c.triage_revision}
                    disabledReason={!currentReview ? "Complete the officer review for this revision before the supervisor decides." : null}
                  />
                ) : (
                  <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                    {approval.status === "superseded" ? "This task is historical and cannot be acted on." : "This supervisor decision is complete."}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm leading-6 text-slate-700">
              {currentReview ? "No supervisor decision is required for the current reviewed facts." : "A supervisor task is created only after the officer review confirms that the current facts require one."}
            </p>
          )}
        </DecisionSection>

        <DecisionSection id="citizen-reply" title="Citizen reply">
          {reply ? (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(240px,0.6fr)]">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge className={reply.status === "sent" ? "bg-emerald-100 text-emerald-800" : reply.status === "approved" ? "bg-civic-100 text-civic-800" : "bg-slate-100 text-slate-700"}>
                    {reply.status === "sent" ? "Sent" : reply.status === "approved" ? "Officer approved" : "Draft"}
                  </Badge>
                  <span className="text-sm text-slate-600">{LANGUAGE_NAMES[reply.language]}</span>
                </div>
                <div className="mt-4 border-y border-civic-200 bg-civic-50 px-4 py-5 text-sm leading-7 text-slate-900">{reply.body}</div>
                <details className="mt-4 text-sm text-slate-600">
                  <summary className="flex min-h-11 cursor-pointer items-center rounded-md font-medium text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-civic-600 focus-visible:ring-offset-2">English reference</summary>
                  <p className="mt-2 leading-6">{reply.body_en}</p>
                </details>
              </div>
              <div>
                <h3 className="font-semibold text-slate-950">Send control</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">Saving a review approves the draft. Sending it is a separate human action.</p>
                <div className="mt-4">
                  <ReplyActions caseId={c.case_id} triageRevision={c.triage_revision} sent={reply.status === "sent"} blocker={replyBlocker(c, approval)} />
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-700">No citizen reply draft is available.</p>
          )}
        </DecisionSection>

        <DecisionSection id="start-or-close" title="Start or close">
          <StatusActions
            caseId={c.case_id}
            triageRevision={c.triage_revision}
            status={c.status}
            startBlocker={startBlocker(c, approval)}
            closeBlocker={closeBlocker(c)}
          />
        </DecisionSection>

        <DecisionSection id="audit-trail" title="Audit trail">
          <p className="mb-5 text-sm leading-6 text-slate-600">Append-only evidence for every automated step and human action on this case.</p>
          <AuditTimeline events={audit.slice().reverse()} />
        </DecisionSection>
      </div>
    </div>
  );
}

function DecisionSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`${id}-heading`} className="border-b border-slate-200 bg-white pb-8">
      <h2 id={`${id}-heading`} className="mb-5 text-xl font-semibold tracking-tight text-slate-950">{title}</h2>
      {children}
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-medium leading-6 text-slate-900">{value}</dd>
    </div>
  );
}

function ApprovalBadge({ status }: { status: ApprovalTask["status"] }) {
  const style = {
    pending: "bg-amber-100 text-amber-900",
    approved: "bg-emerald-100 text-emerald-800",
    rejected: "bg-red-100 text-red-800",
    superseded: "bg-slate-200 text-slate-700",
  }[status];
  return <Badge className={style}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
}
