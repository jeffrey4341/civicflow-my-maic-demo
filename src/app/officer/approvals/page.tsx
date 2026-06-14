import Link from "next/link";
import { getCase, listApprovals } from "@/lib/store";
import { Badge } from "@/components/ui";
import { ApprovalActions } from "@/components/officer/ApprovalActions";
import type { CitizenCase } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-orange-100 text-orange-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
};

export default async function ApprovalsPage() {
  const approvals = await listApprovals();
  const cases = await Promise.all(approvals.map((a) => getCase(a.case_id)));
  const caseById = new Map<string, CitizenCase>();
  cases.forEach((c) => c && caseById.set(c.case_id, c));

  const pending = approvals.filter((a) => a.status === "pending");
  const decided = approvals.filter((a) => a.status !== "pending");

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Supervisor approvals</h1>
      <p className="mt-1 text-sm text-slate-500">
        High-risk cases the AI escalated. The AI never approves — a supervisor decides.
      </p>

      <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Pending ({pending.length})
      </h2>
      <div className="mt-3 space-y-4">
        {pending.length === 0 && <p className="text-sm text-slate-400">No pending approvals.</p>}
        {pending.map((a) => {
          const c = caseById.get(a.case_id);
          return (
            <div key={a.approval_id} className="rounded-xl border border-orange-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge className={STATUS_STYLE[a.status]}>{a.status}</Badge>
                    {c && (
                      <Link href={`/officer/cases/${c.case_id}`} className="font-mono text-sm font-semibold text-civic-700 hover:underline">
                        {c.citizen_ref}
                      </Link>
                    )}
                  </div>
                  <p className="mt-2 text-sm font-medium text-slate-800">{a.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{a.reason}</p>
                  {c && <p className="mt-2 text-xs italic text-slate-400">“{c.translated_text_en}”</p>}
                  <ul className="mt-2 space-y-1">
                    {a.risk_factors.map((rf, i) => (
                      <li key={i} className="text-[12px] text-slate-600">⚠️ {rf}</li>
                    ))}
                  </ul>
                  {a.evidence.length > 0 && (
                    <p className="mt-2 text-[11px] text-slate-400">
                      Evidence: {a.evidence.map((e) => e.doc_title).join(", ")}
                    </p>
                  )}
                </div>
                <div className="w-full sm:w-64">
                  <ApprovalActions approvalId={a.approval_id} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {decided.length > 0 && (
        <>
          <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Decided ({decided.length})
          </h2>
          <div className="mt-3 space-y-2">
            {decided.map((a) => {
              const c = caseById.get(a.case_id);
              return (
                <div key={a.approval_id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge className={STATUS_STYLE[a.status]}>{a.status}</Badge>
                    {c && (
                      <Link href={`/officer/cases/${c.case_id}`} className="font-mono text-xs font-semibold text-civic-700 hover:underline">
                        {c.citizen_ref}
                      </Link>
                    )}
                    <span className="text-slate-600">{a.title}</span>
                  </div>
                  <span className="text-[11px] text-slate-400">by {a.decision_by}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
