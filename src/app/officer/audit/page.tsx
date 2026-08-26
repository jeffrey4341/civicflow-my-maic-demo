import Link from "next/link";

import { ActorBadge } from "@/components/ui";
import { getCase, listAudit } from "@/lib/store";

export const dynamic = "force-dynamic";

function firstQueryValue(q: string | string[] | undefined): string {
  return (Array.isArray(q) ? q : [q]).find((value) => value?.trim())?.trim() ?? "";
}

function formatAuditDate(createdAt: string): string {
  return new Date(createdAt).toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short" });
}

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const q = firstQueryValue((await searchParams).q);
  const events = (await listAudit()).slice().reverse();
  const caseIds = [...new Set(events.map((event) => event.case_id))];
  const cases = await Promise.all(caseIds.map((caseId) => getCase(caseId)));
  const refs = new Map(caseIds.map((caseId, index) => [caseId, cases[index]?.citizen_ref ?? caseId]));
  const auditRows = events.map((event) => ({
    event,
    reference: refs.get(event.case_id),
    dateLabel: formatAuditDate(event.created_at),
    revisionLabel: typeof event.payload.triage_revision === "number" ? `Revision ${event.payload.triage_revision}` : undefined,
  }));
  const query = q.toLocaleLowerCase();
  const filteredRows = query
    ? auditRows.filter(({ event, reference, dateLabel, revisionLabel }) => [event.event_type, event.actor, event.actor_label, event.summary, event.case_id, reference, dateLabel, revisionLabel]
      .some((value) => value?.toLocaleLowerCase().includes(query)))
    : auditRows;

  return (
    <div>
      <header className="border-b border-slate-200 pb-7">
        <p className="text-sm font-semibold text-civic-800">Evidence</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Audit trail</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Append-only records across all cases. Automated steps and human decisions stay distinguishable and traceable.
        </p>
      </header>

      <form className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end" method="get">
        <div className="min-w-0 flex-1">
          <label htmlFor="audit-search" className="block text-sm font-semibold text-slate-900">Search audit events</label>
          <input id="audit-search" name="q" type="search" defaultValue={q} className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-civic-600 focus-visible:ring-offset-2" />
        </div>
        <button type="submit" className="min-h-11 rounded-lg bg-civic-800 px-4 text-sm font-semibold text-white outline-none hover:bg-civic-900 focus-visible:ring-2 focus-visible:ring-civic-600 focus-visible:ring-offset-2">Search</button>
        {q ? <Link href="/officer/audit" className="inline-flex min-h-11 items-center justify-center text-sm font-semibold text-civic-800 underline-offset-4 hover:underline">Clear search</Link> : null}
      </form>

      <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-600" aria-live="polite">
        <p>{q ? `Results for “${q}”` : "All recorded events"}</p>
        <p>{filteredRows.length} event{filteredRows.length === 1 ? "" : "s"}.</p>
      </div>

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
            {filteredRows.map(({ event, reference, dateLabel, revisionLabel }) => (
              <tr key={event.event_id} className="align-top">
                <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-500">
                  <time dateTime={event.created_at}>{dateLabel}</time>
                  {revisionLabel ? <span className="mt-1 block">{revisionLabel}</span> : null}
                </td>
                <td className="px-4 py-4">
                  <Link href={`/officer/cases/${event.case_id}`} className="inline-flex min-h-11 items-center font-mono text-xs font-semibold text-civic-800 underline-offset-4 hover:underline">{reference}</Link>
                </td>
                <td className="px-4 py-4"><ActorBadge actor={event.actor} label={event.actor_label} /></td>
                <td className="px-4 py-4 font-mono text-xs text-slate-600">{event.event_type}</td>
                <td className="max-w-xl px-4 py-4 leading-6 text-slate-700">{event.summary}</td>
              </tr>
            ))}
            {filteredRows.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-600">No audit events match this search.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
