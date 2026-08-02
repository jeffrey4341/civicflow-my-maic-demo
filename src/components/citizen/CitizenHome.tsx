"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { LANGUAGE_NAMES, categoryLabel, t } from "@/lib/i18n";
import { LANGUAGES, type Language, type TriageResult } from "@/lib/types";

export type CitizenHomeMode = "new" | "track";
type Mode = CitizenHomeMode;
type Step = "compose" | "review";

interface Preview {
  result: TriageResult;
  status: string;
  needsInfo: boolean;
  requires_supervisor: boolean;
}

const EXAMPLES: { key: string; text: string }[] = [
  { key: "submit.example_drain", text: "Longkang tersumbat dekat Jalan SS2, bila hujan air naik cepat." },
  { key: "submit.example_licence", text: "我要申请小食档执照，需要什么文件？" },
  { key: "submit.example_aid", text: "Can I apply for education aid for my child?" },
];

function localizedApiError(language: Language, body: unknown, fallbackKey: string): string {
  const code = body && typeof body === "object" && "code" in body
    ? (body as { code?: unknown }).code
    : undefined;
  return t(language, code === "synthetic_data_only" ? "error.synthetic_data_only" : fallbackKey);
}

export function CitizenHome({
  initialLanguage,
  initialMode,
}: {
  initialLanguage: Language;
  initialMode: CitizenHomeMode;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [step, setStep] = useState<Step>("compose");
  const [language, setLanguage] = useState<Language>(initialLanguage);
  const [text, setText] = useState("");
  const [trackingCode, setTrackingCode] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [languageConfirmed, setLanguageConfirmed] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const newTabRef = useRef<HTMLButtonElement>(null);
  const trackTabRef = useRef<HTMLButtonElement>(null);
  const reviewHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (step === "review") reviewHeadingRef.current?.focus();
  }, [step]);

  function selectMode(nextMode: Mode) {
    setMode(nextMode);
    setError(null);
  }

  function handleTabKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, current: Mode) {
    let next: Mode | null = null;
    if (event.key === "Home") next = "new";
    if (event.key === "End") next = "track";
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") next = current === "new" ? "track" : "new";
    if (!next) return;
    event.preventDefault();
    selectMode(next);
    (next === "new" ? newTabRef : trackTabRef).current?.focus();
  }

  async function analyse(selectedLanguage: Language = language) {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/triage", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: text.trim(), language: selectedLanguage, answers }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(localizedApiError(selectedLanguage, body, "error.review"));
        return;
      }
      const nextPreview = body as Preview;
      setPreview(nextPreview);
      setLanguageConfirmed(nextPreview.result.detected_language === selectedLanguage);
      setAnnouncement(`${t(selectedLanguage, "review.title")}. ${t(selectedLanguage, "review.intro")}`);
      setStep("review");
    } catch {
      setError(t(selectedLanguage, "error.review"));
    } finally {
      setLoading(false);
    }
  }

  async function switchToDetected() {
    if (!preview) return;
    const detected = preview.result.detected_language;
    setLanguage(detected);
    await analyse(detected);
    setLanguageConfirmed(true);
  }

  async function submitRequest() {
    if (!preview || !languageConfirmed) return;
    setLoading(true);
    setError(null);
    const cleanAnswers = Object.fromEntries(
      Object.entries(answers).map(([field, value]) => [field, value.trim()]).filter(([, value]) => value),
    );
    try {
      const response = await fetch("/api/cases", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          text: text.trim(),
          language,
          location_text: cleanAnswers.location ?? "",
          answers: cleanAnswers,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(localizedApiError(language, body, "error.submit"));
        setLoading(false);
        return;
      }
      router.push(`/m/cases/${body.citizen_ref}`);
    } catch {
      setError(t(language, "error.submit"));
      setLoading(false);
    }
  }

  function trackCase(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = trackingCode.trim().toUpperCase();
    if (!code) return;
    router.push(`/m/cases/${encodeURIComponent(code)}?lang=${language}`);
  }

  return (
    <div lang={language}>
      <p className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</p>
      <aside className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950" role="note">
        {t(language, "common.synthetic_banner")}
      </aside>

      <div className="mt-7">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{t(language, "app.title")}</h1>
        <p className="mt-2 text-base leading-7 text-slate-700">{t(language, "landing.subtitle")}</p>
      </div>

      <div className="mt-7 grid grid-cols-2 border-b border-slate-200" role="tablist" aria-label={t(language, "a11y.citizen_services")}>
        <button
          ref={newTabRef}
          id="citizen-tab-new"
          type="button"
          role="tab"
          aria-controls="citizen-panel-new"
          aria-selected={mode === "new"}
          tabIndex={mode === "new" ? 0 : -1}
          onClick={() => selectMode("new")}
          onKeyDown={(event) => handleTabKeyDown(event, "new")}
          className={`min-h-12 border-b-2 px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-civic-600 ${mode === "new" ? "border-civic-700 text-civic-800" : "border-transparent text-slate-600 hover:text-slate-900"}`}
        >
          {t(language, "nav.new_request")}
        </button>
        <button
          ref={trackTabRef}
          id="citizen-tab-track"
          type="button"
          role="tab"
          aria-controls="citizen-panel-track"
          aria-selected={mode === "track"}
          tabIndex={mode === "track" ? 0 : -1}
          onClick={() => selectMode("track")}
          onKeyDown={(event) => handleTabKeyDown(event, "track")}
          className={`min-h-12 border-b-2 px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-civic-600 ${mode === "track" ? "border-civic-700 text-civic-800" : "border-transparent text-slate-600 hover:text-slate-900"}`}
        >
          {t(language, "nav.track_case")}
        </button>
      </div>

      <div id="citizen-panel-new" role="tabpanel" aria-labelledby="citizen-tab-new" hidden={mode !== "new"}>
        {step === "compose" ? (
          <ComposeRequest
            language={language}
            setLanguage={setLanguage}
            text={text}
            setText={setText}
            loading={loading}
            error={error}
            onAnalyse={() => analyse()}
          />
        ) : preview ? (
          <ReviewRequest
            headingRef={reviewHeadingRef}
            language={language}
            preview={preview}
            answers={answers}
            setAnswers={setAnswers}
            languageConfirmed={languageConfirmed}
            loading={loading}
            error={error}
            onKeepLanguage={() => setLanguageConfirmed(true)}
            onUseDetected={switchToDetected}
            onBack={() => { setAnnouncement(""); setStep("compose"); }}
            onSubmit={submitRequest}
          />
        ) : null}
      </div>
      <div id="citizen-panel-track" role="tabpanel" aria-labelledby="citizen-tab-track" hidden={mode !== "track"}>
        <TrackCaseForm
          language={language}
          trackingCode={trackingCode}
          setTrackingCode={setTrackingCode}
          onSubmit={trackCase}
        />
      </div>
    </div>
  );
}

function TrackCaseForm(props: {
  language: Language;
  trackingCode: string;
  setTrackingCode: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="py-7" onSubmit={props.onSubmit}>
      <h2 className="text-xl font-semibold text-slate-950">{t(props.language, "track.title")}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{t(props.language, "track.intro")}</p>
      <label htmlFor="tracking-code" className="mt-6 block text-sm font-medium text-slate-800">
        {t(props.language, "track.code_label")}
      </label>
      <input
        id="tracking-code"
        value={props.trackingCode}
        onChange={(event) => props.setTrackingCode(event.target.value)}
        placeholder="CF-ABC123"
        autoCapitalize="characters"
        autoComplete="off"
        className="mt-2 min-h-12 w-full rounded-lg border border-slate-300 px-3 font-mono text-base uppercase outline-none focus:border-civic-600 focus:ring-2 focus:ring-civic-200"
      />
      <button
        type="submit"
        disabled={!props.trackingCode.trim()}
        className="mt-5 min-h-12 w-full rounded-lg bg-civic-700 px-4 font-semibold text-white outline-none hover:bg-civic-800 focus-visible:ring-2 focus-visible:ring-civic-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {t(props.language, "track.action")}
      </button>
    </form>
  );
}

function ComposeRequest(props: {
  language: Language;
  setLanguage: (language: Language) => void;
  text: string;
  setText: (value: string) => void;
  loading: boolean;
  error: string | null;
  onAnalyse: () => void;
}) {
  return (
    <form className="py-7" onSubmit={(event) => { event.preventDefault(); props.onAnalyse(); }}>
      <fieldset>
        <legend className="text-sm font-medium text-slate-800">{t(props.language, "landing.choose_language")}</legend>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {LANGUAGES.map((candidate) => (
            <button
              key={candidate}
              type="button"
              aria-pressed={props.language === candidate}
              onClick={() => props.setLanguage(candidate)}
              className={`min-h-12 rounded-lg border px-2 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-civic-600 focus-visible:ring-offset-2 ${props.language === candidate ? "border-civic-700 bg-civic-50 text-civic-900" : "border-slate-300 bg-white text-slate-700 hover:border-civic-400"}`}
            >
              {LANGUAGE_NAMES[candidate]}
            </button>
          ))}
        </div>
      </fieldset>

      <label htmlFor="citizen-request" className="mt-7 block text-sm font-medium text-slate-800">
        {t(props.language, "submit.prompt_label")}
      </label>
      <textarea
        id="citizen-request"
        value={props.text}
        onChange={(event) => props.setText(event.target.value)}
        rows={6}
        placeholder={t(props.language, "submit.placeholder")}
        className="mt-2 w-full rounded-lg border border-slate-300 p-3 text-base leading-6 outline-none focus:border-civic-600 focus:ring-2 focus:ring-civic-200"
      />
      <p className="mt-2 text-sm leading-6 text-slate-600">{t(props.language, "submit.hint")}</p>

      <div className="mt-5">
        <p className="text-sm font-medium text-slate-700">{t(props.language, "submit.examples_title")}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {EXAMPLES.map((example) => (
            <button
              key={example.key}
              type="button"
              onClick={() => props.setText(example.text)}
              className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-700 outline-none hover:border-civic-500 hover:text-civic-800 focus-visible:ring-2 focus-visible:ring-civic-600"
            >
              {t(props.language, example.key)}
            </button>
          ))}
        </div>
      </div>

      <InlineError message={props.error} />
      <button
        type="submit"
        disabled={!props.text.trim() || props.loading}
        className="mt-7 min-h-12 w-full rounded-lg bg-civic-700 px-4 font-semibold text-white outline-none hover:bg-civic-800 focus-visible:ring-2 focus-visible:ring-civic-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {props.loading ? t(props.language, "common.working") : t(props.language, "submit.review")}
      </button>
    </form>
  );
}

function ReviewRequest(props: {
  headingRef: React.RefObject<HTMLHeadingElement>;
  language: Language;
  preview: Preview;
  answers: Record<string, string>;
  setAnswers: (answers: Record<string, string>) => void;
  languageConfirmed: boolean;
  loading: boolean;
  error: string | null;
  onKeepLanguage: () => void;
  onUseDetected: () => void;
  onBack: () => void;
  onSubmit: () => void;
}) {
  const result = props.preview.result;
  const mismatch = result.detected_language !== props.language;
  const required = result.missing_info.filter((item) => item.required && !item.satisfied);
  const manualReview = props.preview.status === "manual_review";
  const nextStep = manualReview
    ? t(props.language, "review.manual_next")
    : props.preview.needsInfo
      ? t(props.language, "review.needs_next")
      : props.preview.requires_supervisor
        ? t(props.language, "review.supervisor_next")
        : t(props.language, "review.routed_next");

  return (
    <section className="py-7">
      <button type="button" onClick={props.onBack} className="min-h-11 text-sm font-medium text-civic-800 underline-offset-4 hover:underline">
        ← {t(props.language, "common.back")}
      </button>
      <h2 ref={props.headingRef} tabIndex={-1} className="mt-3 rounded-sm text-xl font-semibold text-slate-950 focus:outline-none focus:ring-2 focus:ring-civic-600 focus:ring-offset-2">{t(props.language, "review.title")}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{t(props.language, "review.intro")}</p>

      {mismatch ? (
        <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4">
          <p className="font-semibold text-amber-950">
            {t(props.language, "review.detected", { language: LANGUAGE_NAMES[result.detected_language] })}
          </p>
          <p className="mt-1 text-sm leading-6 text-amber-900">{t(props.language, "review.language_choice")}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={props.onKeepLanguage}
              aria-pressed={props.languageConfirmed}
              className="min-h-11 rounded-md border border-amber-500 bg-white px-3 text-sm font-semibold text-amber-950 outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
            >
              {t(props.language, "review.keep_language", { language: LANGUAGE_NAMES[props.language] })}
            </button>
            <button
              type="button"
              onClick={props.onUseDetected}
              className="min-h-11 rounded-md bg-amber-800 px-3 text-sm font-semibold text-white outline-none hover:bg-amber-900 focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2"
            >
              {t(props.language, "review.use_language", { language: LANGUAGE_NAMES[result.detected_language] })}
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-6 border-y border-slate-200 py-5">
        <h3 className="font-semibold text-slate-950">{t(props.language, "review.understanding")}</h3>
        <dl className="mt-3 grid gap-4 sm:grid-cols-2">
          <SummaryItem label={t(props.language, "created.category")} value={categoryLabel(result.category, props.language)} />
          <SummaryItem label={t(props.language, "created.detected_lang")} value={LANGUAGE_NAMES[result.detected_language]} />
          {!manualReview ? (
            <SummaryItem
              label={t(props.language, "review.suggested_team")}
              value={<span lang={props.language === "en" ? undefined : "en"}>{result.department} — {result.unit}</span>}
            />
          ) : null}
        </dl>
      </div>

      <div className="mt-6">
        <h3 className="font-semibold text-slate-950">{t(props.language, "review.next_step")}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-700">{nextStep}</p>
      </div>

      {required.length > 0 ? (
        <div className="mt-7 border-t border-slate-200 pt-6">
          <h3 className="font-semibold text-slate-950">{t(props.language, "review.details_optional")}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">{t(props.language, "review.details_help")}</p>
          <div className="mt-4 space-y-4">
            {required.map((item) => (
              <div key={item.field}>
                <label htmlFor={`missing-${item.field}`} className="block text-sm font-medium text-slate-800">
                  {item.question_localized}
                </label>
                <input
                  id={`missing-${item.field}`}
                  value={props.answers[item.field] ?? ""}
                  onChange={(event) => props.setAnswers({ ...props.answers, [item.field]: event.target.value })}
                  className="mt-2 min-h-12 w-full rounded-lg border border-slate-300 px-3 text-base outline-none focus:border-civic-600 focus:ring-2 focus:ring-civic-200"
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <InlineError message={props.error} />
      {!props.languageConfirmed ? (
        <p className="mt-5 text-sm font-medium text-amber-900" role="status">
          {t(props.language, "review.choose_language_first")}
        </p>
      ) : null}
      <button
        type="button"
        onClick={props.onSubmit}
        disabled={props.loading || !props.languageConfirmed}
        className="mt-6 min-h-12 w-full rounded-lg bg-civic-700 px-4 font-semibold text-white outline-none hover:bg-civic-800 focus-visible:ring-2 focus-visible:ring-civic-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {props.loading ? t(props.language, "common.working") : t(props.language, "review.submit")}
      </button>
      <p className="mt-3 text-sm leading-6 text-slate-600">{t(props.language, "common.ai_disclaimer")}</p>
    </section>
  );
}

function SummaryItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-slate-600">{label}</dt>
      <dd className="mt-1 font-medium text-slate-900">{value}</dd>
    </div>
  );
}

function InlineError({ message }: { message: string | null }) {
  return message ? (
    <p className="mt-5 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900" role="alert" aria-live="polite">
      {message}
    </p>
  ) : null;
}
