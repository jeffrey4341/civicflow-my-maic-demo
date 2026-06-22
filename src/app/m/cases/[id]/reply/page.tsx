import Link from "next/link";
import { notFound } from "next/navigation";
import { getCase } from "@/lib/store";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function CitizenReplyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await getCase(id);
  if (!c) notFound();
  const lang = c.citizen_language;
  const reply = c.reply_draft;
  const ready = reply?.status === "sent";

  return (
    <div className="flex flex-col">
      <div className="bg-flag-gold/15 px-4 py-2 text-center text-xxs font-medium text-amber-900">
        {t(lang, "common.synthetic_banner")}
      </div>
      <section className="px-5 py-6">
        <Link href={`/m/cases/${c.citizen_ref}`} className="text-xs text-slate-400">← {t(lang, "reply.back")}</Link>
        <h1 className="mt-2 text-lg font-bold text-slate-900">{t(lang, "reply.title")}</h1>

        {ready && reply ? (
          <>
            <div className="mt-1 text-xxs text-slate-400">
              {t(lang, "reply.from")}: {c.department} – {c.unit}
              {reply.approved_by ? ` · ${reply.approved_by}` : ""}
            </div>
            <div className="mt-4 rounded-xl border border-civic-100 bg-civic-50 p-4 text-sm leading-relaxed text-slate-800">
              {reply.body}
            </div>
            {reply.citations.length > 0 && (
              <div className="mt-4">
                <p className="text-xxs font-medium text-slate-500">{t(lang, "reply.citations")}</p>
                <ul className="mt-1 space-y-1">
                  {reply.citations.map((cit, i) => (
                    <li key={i} className="text-xs text-slate-600">
                      📄 {cit.doc_title} — <span className="text-slate-400">§ {cit.section}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="mt-5 text-2xs text-slate-400">{t(lang, "reply.disclaimer")}</p>
          </>
        ) : (
          <p className="mt-6 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
            {t(lang, "reply.not_ready")}
          </p>
        )}
      </section>
    </div>
  );
}
