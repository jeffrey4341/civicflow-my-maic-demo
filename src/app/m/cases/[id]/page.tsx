import Link from "next/link";
import { notFound } from "next/navigation";

import { CitizenFollowUpForm } from "@/components/citizen/CitizenFollowUpForm";
import { LANGUAGE_NAMES, categoryLabel, statusLabel, t } from "@/lib/i18n";
import { getCase } from "@/lib/store";
import type { CaseStatus, CitizenCase, Language } from "@/lib/types";

export const dynamic = "force-dynamic";

interface Stage {
  status: CaseStatus;
  state: "complete" | "current";
}

function stagesFor(c: CitizenCase): Stage[] {
  if (c.status === "needs_info") {
    return [{ status: "submitted", state: "complete" }, { status: "needs_info", state: "current" }];
  }
  if (c.status === "manual_review") {
    return [{ status: "submitted", state: "complete" }, { status: "manual_review", state: "current" }];
  }
  if (c.status === "awaiting_supervisor") {
    return [
      { status: "submitted", state: "complete" },
      { status: "routed", state: "complete" },
      { status: "awaiting_supervisor", state: "current" },
    ];
  }
  if (c.status === "routed") {
    return [{ status: "submitted", state: "complete" }, { status: "routed", state: "current" }];
  }
  if (c.status === "in_progress") {
    return [
      { status: "submitted", state: "complete" },
      { status: "routed", state: "complete" },
      { status: "in_progress", state: "current" },
    ];
  }
  const closedWithoutAction = c.officer_review?.resolution === "close_no_action";
  return closedWithoutAction
    ? [
        { status: "submitted", state: "complete" },
        { status: "manual_review", state: "complete" },
        { status: "closed", state: "current" },
      ]
    : [
        { status: "submitted", state: "complete" },
        { status: "routed", state: "complete" },
        { status: "in_progress", state: "complete" },
        { status: "closed", state: "current" },
      ];
}

function nextStepText(c: CitizenCase, language: Language): string {
  const key: Record<CaseStatus, string> = {
    draft: "status.routed_next",
    needs_info: "status.needs_help",
    submitted: "status.routed_next",
    manual_review: "status.manual_next",
    routed: "status.routed_next",
    awaiting_supervisor: "status.supervisor_next",
    in_progress: "status.progress_next",
    closed: "status.closed_next",
  };
  return t(language, key[c.status]);
}

export default async function CitizenCasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await getCase(id);
  if (!c) notFound();
  const language = c.citizen_language;
  const required = c.missing_info.filter((item) => item.required && !item.satisfied);
  const showAssignment = !["needs_info", "manual_review"].includes(c.status);
  const replyReady = c.reply_draft?.status === "sent";
  const heading = c.status === "needs_info" ? t(language, "status.needs_heading") : t(language, "status.title");

  return (
    <div lang={language}>
      <aside className="border-l-4 border-amber-400 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950" role="note">
        {t(language, "common.synthetic_banner")}
      </aside>

      <section className="mt-7">
        <p className="text-sm font-medium text-civic-800">{statusLabel(c.status, language)}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{heading}</h1>
        <div className="mt-5 flex flex-wrap items-baseline justify-between gap-2 border-y border-slate-200 py-4">
          <span className="text-sm text-slate-600">{t(language, "status.track_label")}</span>
          <span className="font-mono text-lg font-semibold tracking-wide text-slate-950">{c.citizen_ref}</span>
        </div>
      </section>

      <section className="mt-7" aria-labelledby="next-action-heading">
        <h2 id="next-action-heading" className="text-lg font-semibold text-slate-950">
          {t(language, "status.what_next")}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-700">{nextStepText(c, language)}</p>
        {c.status === "needs_info" && required.length > 0 ? (
          <CitizenFollowUpForm
            citizenRef={c.citizen_ref}
            triageRevision={c.triage_revision}
            language={language}
            fields={required}
          />
        ) : null}
      </section>

      <section className="mt-8 border-t border-slate-200 pt-7" aria-labelledby="progress-heading">
        <h2 id="progress-heading" className="text-lg font-semibold text-slate-950">{t(language, "status.timeline")}</h2>
        <ol className="mt-4 space-y-4">
          {stagesFor(c).map((stage, index) => (
            <li key={`${stage.status}-${index}`} className="flex items-center gap-3" aria-current={stage.state === "current" ? "step" : undefined}>
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${stage.state === "current" ? "border-civic-700 bg-civic-700 text-white" : "border-civic-300 bg-civic-50 text-civic-800"}`}>
                {index + 1}
              </span>
              <span className={stage.state === "current" ? "font-semibold text-slate-950" : "text-sm text-slate-600"}>
                {statusLabel(stage.status, language)}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-8 border-t border-slate-200 pt-7" aria-labelledby="case-summary-heading">
        <h2 id="case-summary-heading" className="text-lg font-semibold text-slate-950">{t(language, "review.understanding")}</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <SummaryItem label={t(language, "created.category")} value={categoryLabel(c.category, language)} />
          <SummaryItem label={t(language, "landing.choose_language")} value={LANGUAGE_NAMES[language]} />
          {showAssignment ? (
            <SummaryItem label={t(language, "status.assigned_to")} value={`${c.department} — ${c.unit}`} />
          ) : null}
        </dl>
      </section>

      <section className="mt-8 border-t border-slate-200 pt-7">
        {replyReady ? (
          <>
            <h2 className="text-lg font-semibold text-slate-950">{t(language, "status.reply_ready")}</h2>
            <Link
              href={`/m/cases/${c.citizen_ref}/reply`}
              className="mt-4 flex min-h-12 items-center justify-center rounded-lg bg-civic-700 px-4 font-semibold text-white outline-none hover:bg-civic-800 focus-visible:ring-2 focus-visible:ring-civic-600 focus-visible:ring-offset-2"
            >
              {t(language, "status.view_reply")}
            </Link>
          </>
        ) : (
          <p className="text-sm leading-6 text-slate-600">{t(language, "status.reply_pending")}</p>
        )}
      </section>

      <nav className="mt-8 flex flex-wrap gap-x-6 gap-y-3 border-t border-slate-200 pt-6 text-sm font-medium" aria-label="Citizen case actions">
        <Link href="/m" className="text-civic-800 underline-offset-4 hover:underline">{t(language, "status.new_request")}</Link>
      </nav>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-slate-600">{label}</dt>
      <dd className="mt-1 font-medium text-slate-900">{value}</dd>
    </div>
  );
}
