import Link from "next/link";
import { notFound } from "next/navigation";
import { getCase } from "@/lib/store";
import { CASE_STATUS_ORDER } from "@/lib/types";
import { LANGUAGE_NAMES, categoryLabel, statusLabel, t, urgencyLabel } from "@/lib/i18n";
import { StatusBadge, UrgencyBadge } from "@/components/ui";

export const dynamic = "force-dynamic";

const CITIZEN_MILESTONES = ["submitted", "routed", "awaiting_supervisor", "in_progress", "closed"] as const;

export default async function CitizenCasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await getCase(id);
  if (!c) notFound();
  const lang = c.citizen_language;
  const required = c.missing_info.filter((m) => m.required && !m.satisfied);
  const replyReady = c.reply_draft?.status === "sent";
  const currentIdx = CASE_STATUS_ORDER.indexOf(c.status);

  return (
    <div className="flex flex-col" lang={lang}>
      <div className="bg-flag-gold/15 px-4 py-2 text-center text-[11px] font-medium text-amber-900">
        {t(lang, "common.synthetic_banner")}
      </div>

      <section className="px-5 py-6">
        <div className="rounded-xl bg-civic-600 p-5 text-white">
          <div className="text-2xl">✅</div>
          <h1 className="mt-2 text-lg font-bold">{t(lang, "created.title")}</h1>
          <p className="mt-1 text-sm text-civic-50">{t(lang, "created.intro")}</p>
          <div className="mt-4 rounded-lg bg-white/15 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wide text-civic-100">{t(lang, "created.ref_label")}</div>
            <div className="font-mono text-xl font-bold tracking-wider">{c.citizen_ref}</div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <Info label={t(lang, "created.detected_lang")} value={LANGUAGE_NAMES[c.detected_language]} />
          <Info label={t(lang, "created.category")} value={categoryLabel(c.category, lang)} />
          <Info label={t(lang, "created.department")} value={`${c.department} – ${c.unit}`} />
          <div>
            <div className="text-[10px] uppercase tracking-wide text-slate-600">{t(lang, "created.urgency")}</div>
            <div className="mt-1"><UrgencyBadge urgency={c.urgency} locale={lang} /></div>
          </div>
        </div>

        {/* Status progress */}
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">{t(lang, "status.timeline")}</p>
            <StatusBadge status={c.status} locale={lang} />
          </div>
          <ol className="mt-3 space-y-2">
            {CITIZEN_MILESTONES.map((s) => {
              const reached = CASE_STATUS_ORDER.indexOf(s) <= currentIdx && currentIdx >= 0;
              const isCurrent = s === c.status;
              return (
                <li key={s} className="flex items-center gap-3">
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${reached ? "bg-civic-500 text-white" : "bg-slate-200 text-slate-600"}`}>
                    {reached ? "✓" : "•"}
                  </span>
                  <span className={`text-sm ${isCurrent ? "font-semibold text-civic-700" : "text-slate-600"}`}>
                    {statusLabel(s, lang)}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        {c.status === "needs_info" && required.length > 0 && (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-900">{t(lang, "status.missing_title")}</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-[12px] text-amber-800">
              {required.map((m) => <li key={m.field}>{m.question_localized}</li>)}
            </ul>
          </div>
        )}

        {/* Reply */}
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
          {replyReady ? (
            <>
              <p className="text-sm font-semibold text-civic-700">{t(lang, "status.reply_ready")}</p>
              <Link
                href={`/m/cases/${c.citizen_ref}/reply`}
                className="mt-3 block w-full rounded-xl bg-civic-600 py-2.5 text-center font-semibold text-white hover:bg-civic-700"
              >
                {t(lang, "status.view_reply")}
              </Link>
            </>
          ) : (
            <p className="text-sm text-slate-500">{t(lang, "status.reply_pending")}</p>
          )}
        </div>

        <div className="mt-5 flex justify-between text-[11px] text-slate-600">
          <Link href="/m" className="underline">＋ New request</Link>
          <Link href={`/officer/cases/${c.case_id}`} className="underline">Officer view →</Link>
        </div>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-slate-600">{label}</div>
      <div className="font-medium text-slate-800">{value}</div>
    </div>
  );
}
