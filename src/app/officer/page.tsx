import Link from "next/link";
import { listApprovals, listCases } from "@/lib/store";
import { LANGUAGE_FLAGS, categoryLabel } from "@/lib/i18n";
import { PiiBadge, StatusBadge, UrgencyBadge } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function OfficerQueuePage() {
  const [cases, pending] = await Promise.all([listCases(), listApprovals("pending")]);

  const counts = {
    total: cases.length,
    awaiting: cases.filter((c) => c.status === "awaiting_supervisor").length,
    needsInfo: cases.filter((c) => c.status === "needs_info").length,
    closed: cases.filter((c) => c.status === "closed").length,
  };

  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Case queue</h1>
          <p className="mt-1 text-sm text-slate-500">
            {counts.total} cases · {counts.awaiting} awaiting supervisor · {counts.needsInfo} need info ·{" "}
            {counts.closed} closed
          </p>
        </div>
        {pending.length > 0 && (
          <Link
            href="/officer/approvals"
            className="rounded-lg bg-orange-100 px-3 py-2 text-sm font-medium text-orange-800 hover:bg-orange-200"
          >
            {pending.length} pending approval{pending.length > 1 ? "s" : ""} →
          </Link>
        )}
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5">Ref</th>
              <th className="px-4 py-2.5">Request</th>
              <th className="px-4 py-2.5">Category</th>
              <th className="px-4 py-2.5">Urgency</th>
              <th className="px-4 py-2.5">Department</th>
              <th className="px-4 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {cases.map((c) => (
              <tr key={c.case_id} className="hover:bg-civic-50/40">
                <td className="px-4 py-3 align-top">
                  <Link href={`/officer/cases/${c.case_id}`} className="font-mono text-xs font-semibold text-civic-700 hover:underline">
                    {c.citizen_ref}
                  </Link>
                  <div className="mt-1 flex items-center gap-1">
                    <span title={c.detected_language}>{LANGUAGE_FLAGS[c.detected_language]}</span>
                    {c.pii_risk !== "low" && <PiiBadge risk={c.pii_risk} />}
                  </div>
                </td>
                <td className="max-w-xs px-4 py-3 align-top">
                  <Link href={`/officer/cases/${c.case_id}`} className="block">
                    <span className="line-clamp-2 text-slate-700">{c.original_text}</span>
                    <span className="mt-0.5 line-clamp-1 text-[11px] italic text-slate-400">{c.translated_text_en}</span>
                  </Link>
                </td>
                <td className="px-4 py-3 align-top text-slate-600">{categoryLabel(c.category)}</td>
                <td className="px-4 py-3 align-top"><UrgencyBadge urgency={c.urgency} /></td>
                <td className="px-4 py-3 align-top text-slate-600">
                  {c.department}
                  <div className="text-[11px] text-slate-400">{c.unit}</div>
                </td>
                <td className="px-4 py-3 align-top"><StatusBadge status={c.status} /></td>
              </tr>
            ))}
            {cases.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  No cases yet. Submit one from the <Link href="/m" className="text-civic-600 underline">citizen app</Link>.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
