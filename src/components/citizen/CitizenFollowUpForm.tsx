"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { t } from "@/lib/i18n";
import type { Language, MissingInfoItem } from "@/lib/types";

export function CitizenFollowUpForm({
  citizenRef,
  triageRevision,
  language,
  fields,
}: {
  citizenRef: string;
  triageRevision: number;
  language: Language;
  fields: MissingInfoItem[];
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const complete = fields.every((field) => answers[field.field]?.trim());

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!complete) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/cases/${encodeURIComponent(citizenRef)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ triage_revision: triageRevision, answers }),
      });
      await response.json().catch(() => null);
      if (!response.ok) throw new Error();
      router.replace(`/m/cases/${encodeURIComponent(citizenRef)}?updated=1#case-update-status`);
    } catch {
      setError(t(language, "error.follow_up"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="mt-5 space-y-4" onSubmit={submit}>
      {fields.map((field) => (
        <div key={field.field}>
          <label htmlFor={`follow-up-${field.field}`} className="block text-sm font-medium text-slate-800">
            {field.question_localized}
          </label>
          <input
            id={`follow-up-${field.field}`}
            value={answers[field.field] ?? ""}
            onChange={(event) => setAnswers((current) => ({ ...current, [field.field]: event.target.value }))}
            required
            className="mt-2 min-h-12 w-full rounded-lg border border-slate-300 px-3 text-base outline-none focus:border-civic-600 focus:ring-2 focus:ring-civic-200"
          />
        </div>
      ))}
      {error ? (
        <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900" role="alert" aria-live="polite">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={!complete || busy}
        className="min-h-12 w-full rounded-lg bg-civic-700 px-4 font-semibold text-white outline-none hover:bg-civic-800 focus-visible:ring-2 focus-visible:ring-civic-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? t(language, "common.working") : t(language, "status.send_details")}
      </button>
    </form>
  );
}

export function CitizenUpdateStatus({ message }: { message: string }) {
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  return (
    <p
      ref={ref}
      id="case-update-status"
      role="status"
      tabIndex={-1}
      className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium leading-6 text-emerald-900 outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
    >
      {message}
    </p>
  );
}
