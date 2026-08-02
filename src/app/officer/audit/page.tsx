import Link from "next/link";

import { ActorBadge } from "@/components/ui";
import { getCase, listAudit } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const events = (await listAudit()).slice().reverse();
  const caseIds = [...new Set(events.map((event) => event.case_id))];
  const cases = await Promise.all(caseIds.map((caseId) => getCase(caseId)));
  const refs = new Map(caseIds.map((caseId, index) => [caseId, cases[index]?.citizen_ref ?? caseId]));

  return (
    <div>
      <header className="border-b border-slate-200 pb-7">
        <p className="text-sm font-semibold text-civic-800">Evidence</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Audit trail</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Append-only records across all cases. Automated steps and human decisions stay distinguishable and traceable.
        </p>
      </header>

      <p id="audit-scroll-hint" className="mt-5 text-sm text-slate-600 sm:hidden">Scroll horizontally to view all audit columns.</p>
      <div
        role="region"
        aria-label="Audit events table"
        aria-describedby="audit-scroll-hint"
        tabIndex={0}
        className="mt-3 overflow-x-auto border-y border-slate-200 bg-white outline-none focus-visible:ring-2 focus-visible:ring-civic-700 focus-visible:ring-offset-2 sm:mt-7"
      >
        <table className="w-full min-w-[860px] text-left text-sm">
          <caption className="sr-only">Newest audit events across all CivicFlow cases</caption>
          <thead className="border-b border-slate-300 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <tr>
              <th scope="col" className="px-4 py-3">When</th>
              <th scope="col" className="px-4 py-3">Case</th>
              <th scope="col" className="px-4 py-3">Actor</th>
              <th scope="col" className="px-4 py-3">Event</th>
              <th scope="col" className="px-4 py-3">Summary</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {events.map((event) => (
              <tr key={event.event_id} className="align-top">
                <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-500">
                  <time dateTime={event.created_at}>{new Date(event.created_at).toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short" })}</time>
                  {typeof event.payload.triage_revision === "number" ? <span className="mt-1 block">Revision {event.payload.triage_revision}</span> : null}
                </td>
                <td className="px-4 py-4">
                  <Link href={`/officer/cases/${event.case_id}`} className="inline-flex min-h-11 items-center font-mono text-xs font-semibold text-civic-800 underline-offset-4 hover:underline">{refs.get(event.case_id)}</Link>
                </td>
                <td className="px-4 py-4"><ActorBadge actor={event.actor} label={event.actor_label} /></td>
                <td className="px-4 py-4 font-mono text-xs text-slate-600">{event.event_type}</td>
                <td className="max-w-xl px-4 py-4 leading-6 text-slate-700">{event.summary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-sm text-slate-600">{events.length} recorded event{events.length === 1 ? "" : "s"}.</p>
    </div>
  );
}
