"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LANGUAGES, type Language, type TriageResult } from "@/lib/types";
import {
  LANGUAGE_FLAGS,
  LANGUAGE_NAMES,
  categoryLabel,
  t,
  urgencyLabel,
} from "@/lib/i18n";
import { Button, Input, SafetyBanner, Textarea } from "@/components/ui";

/** Shared focus-visible ring for the bespoke selection controls (language/example tiles). */
const TILE_FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-civic-500 focus-visible:ring-offset-1";

type Step = "lang" | "describe" | "details";

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

export default function CitizenWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("lang");
  const [language, setLanguage] = useState<Language>("ms");
  const [text, setText] = useState("");
  const [location, setLocation] = useState("");
  const [media, setMedia] = useState<string[]>([]);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function analyse() {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/triage", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, language, location_text: location }),
      });
      if (!res.ok) throw new Error("Triage failed");
      setPreview(await res.json());
      setStep("details");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const extra = Object.values(answers).filter(Boolean).join(". ");
      const combined = extra ? `${text}. ${extra}` : text;
      const loc = answers["location"] || location;
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: combined, language, location_text: loc, media_refs: media }),
      });
      if (!res.ok) throw new Error("Submission failed");
      const created = await res.json();
      router.push(`/m/cases/${created.citizen_ref}`);
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col">
      <SafetyBanner text={t(language, "common.synthetic_banner")} />

      {step === "lang" && (
        <section className="px-5 py-8">
          <h1 className="text-xl font-bold text-slate-900">{t(language, "app.title")}</h1>
          <p className="mt-1 text-sm text-slate-500">{t(language, "app.tagline")}</p>
          <p className="mt-6 text-sm font-medium text-slate-700">{t(language, "landing.choose_language")}</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {LANGUAGES.map((lng) => (
              <button
                key={lng}
                onClick={() => setLanguage(lng)}
                aria-pressed={language === lng}
                className={`rounded-xl border p-4 text-left transition ${TILE_FOCUS} ${
                  language === lng
                    ? "border-civic-500 bg-civic-50 ring-2 ring-civic-200"
                    : "border-slate-200 bg-white hover:border-civic-300"
                }`}
              >
                <div className="text-2xl">{LANGUAGE_FLAGS[lng]}</div>
                <div className="mt-1 text-sm font-medium text-slate-800">{LANGUAGE_NAMES[lng]}</div>
              </button>
            ))}
          </div>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            className="mt-8"
            onClick={() => setStep("describe")}
          >
            {t(language, "landing.continue")}
          </Button>
          <p className="mt-4 text-center text-xxs text-slate-400">{t(language, "common.powered")}</p>
        </section>
      )}

      {step === "describe" && (
        <section className="px-5 py-6">
          <button onClick={() => setStep("lang")} className="text-xs text-slate-400">← {t(language, "common.back")}</button>
          <h2 className="mt-2 text-lg font-bold text-slate-900">{t(language, "submit.title")}</h2>
          <div className="mt-4">
            <Textarea
              label={t(language, "submit.prompt_label")}
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              placeholder={t(language, "submit.placeholder")}
            />
          </div>
          <p className="mt-1 text-xxs text-slate-400">{t(language, "submit.hint")}</p>

          <p className="mt-5 text-xs font-medium text-slate-500">{t(language, "submit.examples_title")}</p>
          <div className="mt-2 space-y-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex.key}
                onClick={() => setText(ex.text)}
                className={`block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs text-slate-600 hover:border-civic-300 ${TILE_FOCUS}`}
              >
                <span className="font-medium text-civic-700">{t(language, ex.key)}</span>
                <span className="mt-0.5 block truncate text-slate-400">{ex.text}</span>
              </button>
            ))}
          </div>

          {error && (
            <p role="alert" className="mt-4 text-sm text-red-600">
              {error}
            </p>
          )}
          <Button
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            disabled={!text.trim()}
            className="mt-6"
            onClick={analyse}
          >
            {t(language, "submit.analyse")}
          </Button>
        </section>
      )}

      {step === "details" && preview && (
        <DetailsStep
          language={language}
          preview={preview}
          media={media}
          setMedia={setMedia}
          location={location}
          setLocation={setLocation}
          answers={answers}
          setAnswers={setAnswers}
          onBack={() => setStep("describe")}
          onSubmit={submit}
          loading={loading}
          error={error}
        />
      )}
    </div>
  );
}

function DetailsStep(props: {
  language: Language;
  preview: Preview;
  media: string[];
  setMedia: (m: string[]) => void;
  location: string;
  setLocation: (s: string) => void;
  answers: Record<string, string>;
  setAnswers: (a: Record<string, string>) => void;
  onBack: () => void;
  onSubmit: () => void;
  loading: boolean;
  error: string | null;
}) {
  const { language, preview, media, setMedia, answers, setAnswers } = props;
  const r = preview.result;
  const required = r.missing_info.filter((m) => m.required && !m.satisfied);
  const checklist = r.missing_info.filter((m) => !m.required && !m.satisfied);

  return (
    <section className="px-5 py-6">
      <button onClick={props.onBack} className="text-xs text-slate-400">← {t(language, "common.back")}</button>

      {/* AI triage summary */}
      <div className="mt-3 rounded-xl border border-civic-100 bg-civic-50 p-4">
        <div className="text-xxs font-semibold uppercase tracking-wide text-civic-600">AI assistant</div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
          <Info label={t(language, "created.detected_lang")} value={LANGUAGE_NAMES[r.detected_language]} />
          <Info label={t(language, "created.category")} value={categoryLabel(r.category, language)} />
          <Info label={t(language, "created.department")} value={`${r.department} – ${r.unit}`} />
          <Info label={t(language, "created.urgency")} value={urgencyLabel(r.urgency, language)} />
        </div>
        {preview.requires_supervisor && (
          <p className="mt-3 rounded-lg bg-orange-100 px-3 py-2 text-xs text-orange-800">
            {t(language, "created.approval_note")}
          </p>
        )}
      </div>

      {/* Photo / location mock */}
      <div className="mt-5">
        <p className="text-sm font-medium text-slate-700">{t(language, "media.title")}</p>
        <p className="mt-0.5 text-xxs text-slate-400">{t(language, "media.intro")}</p>
        <div className="mt-2 flex gap-2">
          <button
            onClick={() => setMedia([...media, `photo:mock_${media.length + 1}.jpg`])}
            className={`flex-1 rounded-lg border border-slate-200 bg-white py-2 text-xs text-slate-600 hover:border-civic-300 ${TILE_FOCUS}`}
          >
            📷 {t(language, "media.add_photo")}
          </button>
          <button
            onClick={() => props.setLocation(props.location || "Jalan Demo, Taman Demo")}
            className={`flex-1 rounded-lg border border-slate-200 bg-white py-2 text-xs text-slate-600 hover:border-civic-300 ${TILE_FOCUS}`}
          >
            📍 {t(language, "media.add_location")}
          </button>
        </div>
        {media.length > 0 && (
          <p className="mt-2 text-xxs text-civic-600">✓ {media.length} × {t(language, "media.photo_added")}</p>
        )}
        <p className="mt-1 text-2xs text-slate-400">{t(language, "media.note")}</p>
      </div>

      {/* Clarification (required) */}
      {required.length > 0 && (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">{t(language, "clarify.title")}</p>
          <p className="mt-0.5 text-xxs text-amber-700">{t(language, "clarify.intro")}</p>
          <div className="mt-3 space-y-3">
            {required.map((m) => (
              <div key={m.field}>
                <Input
                  label={m.question_localized}
                  value={answers[m.field] ?? ""}
                  onChange={(e) => setAnswers({ ...answers, [m.field]: e.target.value })}
                />
              </div>
            ))}
          </div>
          <p className="mt-2 text-2xs text-amber-600">{t(language, "clarify.optional")}</p>
        </div>
      )}

      {/* Optional checklist (welfare) */}
      {checklist.length > 0 && (
        <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-700">{t(language, "status.missing_title")}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-600">
            {checklist.map((m) => (
              <li key={m.field}>{m.question_localized}</li>
            ))}
          </ul>
        </div>
      )}

      {props.error && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {props.error}
        </p>
      )}
      <Button
        variant="primary"
        size="lg"
        fullWidth
        loading={props.loading}
        className="mt-6"
        onClick={props.onSubmit}
      >
        {t(language, "clarify.submit")}
      </Button>
      <p className="mt-3 text-center text-2xs text-slate-400">{t(language, "common.ai_disclaimer")}</p>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-2xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="font-medium text-slate-800">{value}</div>
    </div>
  );
}
