import Link from "next/link";

import { OfficerQueue } from "@/components/officer/OfficerQueue";
import { hasCurrentOfficerReview } from "@/lib/lifecycle";
import { listApprovals, listCases } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function OfficerQueuePage() {
  const [cases, pendingApprovals] = await Promise.all([listCases(), listApprovals("pending")]);
  const caseById = new Map(cases.map((item) => [item.case_id, item]));
  const decisionReadyApprovals = pendingApprovals.filter((approval) => {
    const record = caseById.get(approval.case_id);
    return Boolean(
      record
      && record.approval_task_id === approval.approval_id
      && record.triage_revision === approval.triage_revision
      && hasCurrentOfficerReview(record),
    );
  });
  const active = cases.filter((item) => item.status !== "closed").length;
  const needsReview = cases.filter(
    (item) => item.status !== "closed"
      && item.status !== "needs_info"
      && (!item.officer_review || item.officer_review.triage_revision !== item.triage_revision || item.status === "manual_review"),
  ).length;
  const needsInfo = cases.filter((item) => item.status === "needs_info").length;

  return (
    <div>
      <div className="flex flex-col gap-5 border-b border-slate-200 pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-civic-800">Officer workspace</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Case queue</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Work from the next required human action. Closed cases stay hidden until you choose that filter.
          </p>
        </div>
        {decisionReadyApprovals.length > 0 ? (
          <Link
            href="/officer/approvals"
            className="inline-flex min-h-12 items-center justify-center rounded-lg border border-amber-300 bg-amber-50 px-4 text-sm font-semibold text-amber-950 outline-none hover:bg-amber-100 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
          >
            {decisionReadyApprovals.length} supervisor decision{decisionReadyApprovals.length === 1 ? "" : "s"} waiting
          </Link>
        ) : null}
      </div>

      <dl className="grid grid-cols-2 gap-px border-b border-slate-200 bg-slate-200 sm:grid-cols-4">
        <Metric label="Active" value={active} />
        <Metric label="Needs review" value={needsReview} />
        <Metric label="Needs citizen info" value={needsInfo} />
        <Metric label="Needs supervisor" value={decisionReadyApprovals.length} />
      </dl>

      <OfficerQueue cases={cases} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-slate-50 px-4 py-5">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold tabular-nums text-slate-950">{value}</dd>
    </div>
  );
}
