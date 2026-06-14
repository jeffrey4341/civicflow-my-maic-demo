import Link from "next/link";
import { getCase, listAudit } from "@/lib/store";

export const dynamic = "force-dynamic";

const ACTOR_DOT: Record<string, string> = {
  citizen: "bg-sky-500",
  ai_agent: "bg-civic-500",
  system: "bg-slate-400",
  officer: "bg-indigo-500",
  supervisor: "bg-orange-500",
};

export default async function AuditPage() {
  const events = (await listAudit()).slice().reverse(); // newest first
  // Resolve case refs for linking.
  const refs = new Map<string, string>();
  for (const e of events) {
    if (!refs.has(e.case_id)) {
      const c = await getCase(e.case_id);
      refs.set(e.case_id, c?.citizen_ref ?? e.case_id);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Audit evidence</h1>
      <p className="mt-1 text-sm text-slate-500">
        Append-only timeline across all cases. {events.length} events. Every AI decision and human
        action is recorded.
      </p>

      <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5">When</th>
              <th className="px-4 py-2.5">Case</th>
              <th className="px-4 py-2.5">Actor</th>
              <th className="px-4 py-2.5">Event</th>
              <th className="px-4 py-2.5">Summary</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {events.map((e) => (
              <tr key={e.event_id} className="align-top">
                <td className="whitespace-nowrap px-4 py-2.5 text-[11px] text-slate-400">
                  {new Date(e.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </td>
                <td className="px-4 py-2.5">
                  <Link href={`/officer/cases/${e.case_id}`} className="font-mono text-xs text-civic-700 hover:underline">
                    {refs.get(e.case_id)}
                  </Link>
                </td>
                <td className="px-4 py-2.5">
                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                    <span className={`h-2 w-2 rounded-full ${ACTOR_DOT[e.actor] ?? "bg-slate-400"}`} />
                    {e.actor_label}
                  </span>
                </td>
                <td className="px-4 py-2.5"><span className="font-mono text-[11px] text-slate-500">{e.event_type}</span></td>
                <td className="px-4 py-2.5 text-slate-700">{e.summary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
