import Link from "next/link";
import { notFound } from "next/navigation";

import { t } from "@/lib/i18n";
import { getCase } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function CitizenReplyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await getCase(id);
  if (!c) notFound();
  const language = c.citizen_language;
  const reply = c.reply_draft;
  const ready = reply?.status === "sent";

  return (
    <div lang={language}>
      <aside className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950" role="note">
        {t(language, "common.synthetic_banner")}
      </aside>
      <section className="mt-7">
        <Link href={`/m/cases/${c.citizen_ref}`} className="inline-flex min-h-11 items-center text-sm font-medium text-civic-800 underline-offset-4 hover:underline">
          ← {t(language, "reply.back")}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{t(language, "reply.title")}</h1>

        {ready && reply ? (
          <>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {t(language, "reply.from")}: <span data-language-part="department" lang="en">{c.department}</span>
              <span aria-hidden="true"> — </span>
              <span data-language-part="unit" lang="en">{c.unit}</span>
              {reply.approved_by ? (
                <>
                  <span aria-hidden="true"> · </span>
                  <span data-language-part="approver" lang="en">{reply.approved_by}</span>
                </>
              ) : null}
            </p>
            <div className="mt-6 border-y border-civic-200 bg-civic-50 px-4 py-5 text-base leading-7 text-slate-900">
              {reply.body}
            </div>
            {reply.citations.length > 0 ? (
              <div className="mt-7">
                <h2 className="font-semibold text-slate-950">{t(language, "reply.citations")}</h2>
                <ul className="mt-3 divide-y divide-slate-200 border-y border-slate-200">
                  {reply.citations.map((citation) => (
                    <li key={`${citation.source_doc}-${citation.section}`} className="py-3 text-sm leading-6 text-slate-700">
                      <span data-language-part="policy-title" lang="en" className="font-medium text-slate-900">{citation.doc_title}</span>
                      <span data-language-part="policy-section" lang="en" className="block">{citation.section}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <p className="mt-7 border-t border-slate-200 pt-5 text-sm leading-6 text-slate-600" role="note">
              {t(language, "reply.disclaimer")}
            </p>
          </>
        ) : (
          <p className="mt-6 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
            {t(language, "reply.not_ready")}
          </p>
        )}
      </section>
    </div>
  );
}
