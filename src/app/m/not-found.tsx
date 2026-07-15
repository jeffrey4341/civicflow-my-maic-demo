"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { t } from "@/lib/i18n";
import { LANGUAGES, type Language } from "@/lib/types";

export default function CitizenNotFound() {
  return <Suspense fallback={<NotFoundContent language="en" />}><LocalizedNotFound /></Suspense>;
}

function LocalizedNotFound() {
  const requested = useSearchParams().get("lang") as Language | null;
  const language = requested && LANGUAGES.includes(requested) ? requested : "en";
  return <NotFoundContent language={language} />;
}

function NotFoundContent({ language }: { language: Language }) {
  return (
    <section lang={language} className="py-10 text-center sm:py-16">
      <p className="text-sm font-semibold text-civic-800">404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{t(language, "not_found.title")}</h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">{t(language, "not_found.message")}</p>
      <Link
        href={`/m?view=track&lang=${language}`}
        className="mt-7 inline-flex min-h-12 items-center justify-center rounded-lg bg-civic-700 px-5 font-semibold text-white outline-none hover:bg-civic-800 focus-visible:ring-2 focus-visible:ring-civic-600 focus-visible:ring-offset-2"
      >
        {t(language, "not_found.action")}
      </Link>
    </section>
  );
}
