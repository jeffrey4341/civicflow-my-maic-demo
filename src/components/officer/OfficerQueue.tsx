"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { LANGUAGE_NAMES, categoryLabel } from "@/lib/i18n";
import { hasCurrentOfficerReview } from "@/lib/lifecycle";
import type { CitizenCase } from "@/lib/types";
import { StatusBadge, UrgencyBadge } from "@/components/ui";

type QueueFilter = "active" | "review" | "approval" | "work" | "closed" | "all";

const FILTERS: { value: QueueFilter; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "review", label: "Needs review" },
  { value: "approval", label: "Needs approval" },
  { value: "work", label: "In progress" },
  { value: "closed", label: "Closed" },
  { value: "all", label: "All" },
];

function nextAction(c: CitizenCase): string {
  if (c.status === "closed") return "Complete";
  if (c.status === "needs_info") return "Waiting for citizen details";
  if (!c.officer_review || c.officer_review.triage_revision !== c.triage_revision) return "Officer review required";
  if (c.status === "awaiting_supervisor") return "Supervisor decision required";
  if (c.reply_draft?.status !== "sent") return "Send reviewed reply";
  if (c.status === "routed") return "Start council work";
  if (c.status === "in_progress") return "Record closure when complete";
  return "Review case";
}

function matchesFilter(c: CitizenCase, filter: QueueFilter): boolean {
  if (filter === "all") return true;
  if (filter === "active") return c.status !== "closed";
  if (filter === "closed") return c.status === "closed";
  if (filter === "approval") return c.status === "awaiting_supervisor" && hasCurrentOfficerReview(c);
  if (filter === "work") return c.status === "in_progress";
  return c.status !== "closed"
    && c.status !== "needs_info"
    && (!c.officer_review || c.officer_review.triage_revision !== c.triage_revision || c.status === "manual_review");
}

export function OfficerQueue({ cases }: { cases: CitizenCase[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<QueueFilter>("active");

  const visibleCases = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return cases.filter((c) => {
      if (!matchesFilter(c, filter)) return false;
      if (!needle) return true;
      return [c.citizen_ref, c.original_text, c.translated_text_en, c.department, c.unit, categoryLabel(c.category)]
        .join(" ")
        .toLocaleLowerCase()
        .includes(needle);
    });
  }, [cases, filter, query]);

  return (
    <section className="mt-7" aria-labelledby="queue-results-heading">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div>
          <label htmlFor="case-search" className="text-sm font-medium text-slate-800">Search cases</label>
          <input
            id="case-search"
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tracking code, request, category, or team"
            className="mt-2 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-4 text-base text-slate-950 outline-none placeholder:text-slate-500 focus:border-civic-700 focus:ring-2 focus:ring-civic-200"
          />
        </div>
        <div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter cases">
            {FILTERS.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={filter === item.value}
                onClick={() => setFilter(item.value)}
                className={`min-h-11 rounded-full border px-4 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-civic-600 focus-visible:ring-offset-2 ${
                  filter === item.value
                    ? "border-civic-800 bg-civic-800 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-baseline justify-between gap-4 border-b border-slate-300 pb-3">
        <h2 id="queue-results-heading" className="text-base font-semibold text-slate-950">Queue results</h2>
        <p className="text-sm text-slate-600" aria-live="polite">{visibleCases.length} case{visibleCases.length === 1 ? "" : "s"}</p>
      </div>

      <div className="hidden border-b border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid md:grid-cols-[120px_minmax(220px,1.5fr)_minmax(150px,1fr)_140px_200px] md:gap-4">
        <span>Reference</span>
        <span>Request</span>
        <span>Service</span>
        <span>Status</span>
        <span>Next action</span>
      </div>

      {visibleCases.length > 0 ? (
        <ul className="divide-y divide-slate-200 border-b border-slate-200 bg-white">
          {visibleCases.map((c) => (
            <li key={c.case_id}>
              <Link
                href={`/officer/cases/${c.case_id}`}
                prefetch={false}
                className="grid gap-3 px-3 py-5 outline-none hover:bg-slate-50 focus-visible:bg-civic-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-civic-700 md:grid-cols-[120px_minmax(220px,1.5fr)_minmax(150px,1fr)_140px_200px] md:items-start md:gap-4"
              >
                <div>
                  <span className="font-mono text-sm font-semibold text-civic-800">{c.citizen_ref}</span>
                  <span className="mt-1 block text-xs text-slate-500">{LANGUAGE_NAMES[c.citizen_language]}</span>
                </div>
                <div>
                  <span className="line-clamp-2 text-sm leading-6 text-slate-900">{c.original_text}</span>
                  {c.translated_text_en !== c.original_text ? (
                    <span className="mt-1 line-clamp-1 block text-xs text-slate-500">EN: {c.translated_text_en}</span>
                  ) : null}
                </div>
                <div>
                  <span className="text-sm font-medium text-slate-800">{categoryLabel(c.category)}</span>
                  <span className="mt-1 block text-xs text-slate-500">{c.department} / {c.unit}</span>
                </div>
                <div className="flex flex-wrap gap-2 md:block">
                  <StatusBadge status={c.status} />
                  <span className="md:mt-2 md:block"><UrgencyBadge urgency={c.urgency} /></span>
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Next action</span>
                  <span className="mt-1 block text-sm font-medium leading-5 text-slate-950">{nextAction(c)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="border-b border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-600">
          No cases match this search and filter.
        </p>
      )}
    </section>
  );
}
