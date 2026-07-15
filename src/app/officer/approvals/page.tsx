import Link from "next/link";

import { ApprovalActions } from "@/components/officer/ApprovalActions";
import { Badge } from "@/components/ui";
import { getCase, listApprovals } from "@/lib/store";
import type { ApprovalStatus, CitizenCase } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<ApprovalStatus, string> = {
  pending: "bg-amber-100 text-amber-900",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
  superseded: "bg-slate-200 text-slate-700",
};

export default async function ApprovalsPage() {
  const approvals = (await listApprovals()).slice().reverse();
  const relatedCases = await Promise.all(approvals.map((approval) => getCase(approval.case_id)));
  const caseById = new Map<string, CitizenCase>();
  relatedCases.forEach((c) => c && caseById.set(c.case_id, c));
  const pending = approvals.filter((approval) => approval.status === "pending");
  const history = approvals.filter((approval) => approval.status !== "pending");

  return (
    <div>
      <header className="border-b border-slate-200 pb-7">
        <p className="text-sm font-semibold text-civic-800">Human checkpoint</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Supervisor approvals</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          High-risk recommendations stay blocked until the current officer-reviewed revision receives a documented supervisor decision.
        </p>
      </header>

      <section className="mt-8" aria-labelledby="pending-approvals-heading">
        <div className="flex items-baseline justify-between gap-4 border-b border-slate-300 pb-3">
          <h2 id="pending-approvals-heading" className="text-xl font-semibold text-slate-950">Pending decisions</h2>
          <span className="text-sm text-slate-600">{pending.length}</span>
        </div>
        {pending.length > 0 ? (
          <div className="divide-y divide-slate-200 border-b border-slate-200 bg-white">
            {pending.map((approval) => {
              const c = caseById.get(approval.case_id);
              const current = Boolean(
                c
                && c.approval_task_id === approval.approval_id
                && c.triage_revision === approval.triage_revision
                && c.officer_review?.triage_revision === c.triage_revision,
              );
              return (
                <article key={approval.approval_id} className="grid gap-6 py-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge className={STATUS_STYLE.pending}>Pending</Badge>
                      <span className="text-sm text-slate-600">Revision {approval.triage_revision}</span>
                      {c ? (
                        <Link href={`/officer/cases/${c.case_id}`} className="font-mono text-sm font-semibold text-civic-800 underline-offset-4 hover:underline">
                          {c.citizen_ref}
                        </Link>
                      ) : null}
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-slate-950">{approval.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{approval.reason}</p>
                    {c ? <blockquote className="mt-4 border-l-2 border-slate-300 pl-4 text-sm leading-6 text-slate-600">{c.translated_text_en}</blockquote> : null}
                    {approval.risk_factors.length > 0 ? (
                      <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700">
                        {approval.risk_factors.map((factor) => <li key={factor}>{factor}</li>)}
                      </ul>
                    ) : null}
                  </div>
                  <ApprovalActions
                    approvalId={approval.approval_id}
                    triageRevision={approval.triage_revision}
                    disabledReason={current ? null : "Waiting for an officer review on the current triage revision."}
                  />
                </article>
              );
            })}
          </div>
        ) : (
          <p className="border-b border-slate-200 bg-white px-4 py-8 text-sm text-slate-600">No supervisor decisions are waiting.</p>
        )}
      </section>

      <section className="mt-10" aria-labelledby="approval-history-heading">
        <div className="flex items-baseline justify-between gap-4 border-b border-slate-300 pb-3">
          <h2 id="approval-history-heading" className="text-xl font-semibold text-slate-950">Decision history</h2>
          <span className="text-sm text-slate-600">{history.length}</span>
        </div>
        {history.length > 0 ? (
          <ul className="divide-y divide-slate-200 border-b border-slate-200 bg-white">
            {history.map((approval) => {
              const c = caseById.get(approval.case_id);
              return (
                <li key={approval.approval_id} className="grid gap-3 px-3 py-5 sm:grid-cols-[140px_120px_minmax(0,1fr)_minmax(160px,auto)] sm:items-start">
                  <div>
                    <Badge className={STATUS_STYLE[approval.status]}>{approval.status.charAt(0).toUpperCase() + approval.status.slice(1)}</Badge>
                    <span className="mt-2 block text-xs text-slate-500">Revision {approval.triage_revision}</span>
                  </div>
                  {c ? (
                    <Link href={`/officer/cases/${c.case_id}`} className="font-mono text-sm font-semibold text-civic-800 underline-offset-4 hover:underline">{c.citizen_ref}</Link>
                  ) : <span className="text-sm text-slate-500">Case unavailable</span>}
                  <div>
                    <p className="text-sm font-medium text-slate-900">{approval.title}</p>
                    {approval.decision_note ? <p className="mt-1 text-sm leading-6 text-slate-600">{approval.decision_note}</p> : null}
                  </div>
                  <p className="text-sm text-slate-600">{approval.decision_by ? `by ${approval.decision_by}` : "Historical task"}</p>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="border-b border-slate-200 bg-white px-4 py-8 text-sm text-slate-600">No approval history yet.</p>
        )}
      </section>
    </div>
  );
}
