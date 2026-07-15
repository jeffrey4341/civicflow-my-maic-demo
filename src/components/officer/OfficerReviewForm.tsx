"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { LANGUAGE_NAMES, categoryLabel } from "@/lib/i18n";
import {
  CASE_CATEGORIES,
  LANGUAGES,
  type CaseCategory,
  type CitizenCase,
  type Language,
  type OfficerReviewResolution,
  type PolicyCitation,
  type WelfareOutcome,
} from "@/lib/types";

function citationKey(citation: Pick<PolicyCitation, "source_doc" | "section">): string {
  return `${citation.source_doc}::${citation.section}`;
}

export function OfficerReviewForm({
  caseData,
  canResubmit = false,
}: {
  caseData: CitizenCase;
  canResubmit?: boolean;
}) {
  const router = useRouter();
  const review = caseData.officer_review;
  const [resolution, setResolution] = useState<OfficerReviewResolution>(review?.resolution ?? "proceed");
  const [language, setLanguage] = useState<Language>(caseData.citizen_language);
  const [category, setCategory] = useState<CaseCategory>(caseData.category);
  const [department, setDepartment] = useState(caseData.department);
  const [unit, setUnit] = useState(caseData.unit);
  const [note, setNote] = useState(review?.note ?? "Reviewed against the citizen request and cited council policy.");
  const [replyBody, setReplyBody] = useState(caseData.reply_draft?.body ?? "");
  const [replyBodyEn, setReplyBodyEn] = useState(caseData.reply_draft?.body_en ?? "");
  const [welfareOutcome, setWelfareOutcome] = useState<WelfareOutcome | "">(review?.welfare_outcome ?? "");
  const [candidates, setCandidates] = useState<PolicyCitation[]>(caseData.citations);
  const [selectedKeys, setSelectedKeys] = useState<string[]>(caseData.citations.map(citationKey));
  const [policyQuery, setPolicyQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function searchPolicies() {
    const query = policyQuery.trim();
    if (!query) return;
    setSearching(true);
    setError(null);
    try {
      const response = await fetch(`/api/policies/search?q=${encodeURIComponent(query)}&category=${encodeURIComponent(category)}`);
      const body = await response.json().catch(() => []);
      if (!response.ok) throw new Error(body.error ?? "Policy search failed.");
      const results = body as PolicyCitation[];
      setCandidates((current) => {
        const merged = new Map(current.map((citation) => [citationKey(citation), citation]));
        results.forEach((citation) => merged.set(citationKey(citation), citation));
        return [...merged.values()];
      });
      setMessage(results.length > 0 ? `${results.length} policy result${results.length === 1 ? "" : "s"} added below.` : "No matching policy sections found.");
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setSearching(false);
    }
  }

  function toggleCitation(key: string) {
    setSelectedKeys((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  }

  async function submitReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const citationKeys = candidates
        .filter((citation) => selectedKeys.includes(citationKey(citation)))
        .map((citation) => ({ source_doc: citation.source_doc, section: citation.section }));
      const response = await fetch(`/api/cases/${caseData.case_id}/review`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          triage_revision: caseData.triage_revision,
          officer: "Officer Tan (demo)",
          note,
          citizen_language: language,
          category,
          routing: { department, unit },
          citation_keys: citationKeys,
          reply_body: replyBody,
          reply_body_en: replyBodyEn,
          resolution,
          welfare_outcome: category === "education_aid_welfare" && welfareOutcome ? welfareOutcome : null,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Officer review could not be saved.");
      setMessage("Officer review saved for the current triage revision.");
      router.refresh();
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (caseData.status === "closed") {
    return (
      <p className="border-l-4 border-slate-300 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
        This case is closed. Its reviewed facts remain read-only.
      </p>
    );
  }

  return (
    <form onSubmit={submitReview} className="mt-6 space-y-7">
      <fieldset>
        <legend className="text-base font-semibold text-slate-950">Decision</legend>
        <p className="mt-1 text-sm leading-6 text-slate-600">Confirm the case facts and choose the human decision for this revision.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <FormField label="Resolution" htmlFor="review-resolution">
            <select
              id="review-resolution"
              value={resolution}
              onChange={(event) => setResolution(event.target.value as OfficerReviewResolution)}
              className="form-control"
            >
              <option value="proceed">Proceed with routing</option>
              <option value="close_no_action">Close with no operational action</option>
              {canResubmit ? <option value="resubmit_approval">Revise and resubmit for approval</option> : null}
            </select>
          </FormField>
          <FormField label="Confirmed language" htmlFor="review-language">
            <select id="review-language" value={language} onChange={(event) => setLanguage(event.target.value as Language)} className="form-control">
              {LANGUAGES.map((item) => <option key={item} value={item}>{LANGUAGE_NAMES[item]}</option>)}
            </select>
          </FormField>
          <FormField label="Confirmed category" htmlFor="review-category">
            <select id="review-category" value={category} onChange={(event) => setCategory(event.target.value as CaseCategory)} className="form-control">
              {CASE_CATEGORIES.map((item) => <option key={item} value={item}>{categoryLabel(item)}</option>)}
            </select>
          </FormField>
          {category === "education_aid_welfare" ? (
            <FormField label="Human welfare outcome" htmlFor="welfare-outcome">
              <select id="welfare-outcome" value={welfareOutcome} onChange={(event) => setWelfareOutcome(event.target.value as WelfareOutcome | "")} className="form-control">
                <option value="">Choose an outcome</option>
                <option value="eligible">Eligible after officer review</option>
                <option value="not_eligible">Not eligible after officer review</option>
              </select>
            </FormField>
          ) : null}
          <FormField label="Confirmed department" htmlFor="review-department">
            <input id="review-department" value={department} onChange={(event) => setDepartment(event.target.value)} required className="form-control" />
          </FormField>
          <FormField label="Confirmed unit" htmlFor="review-unit">
            <input id="review-unit" value={unit} onChange={(event) => setUnit(event.target.value)} required className="form-control" />
          </FormField>
          <div className="sm:col-span-2">
            <FormField label="Review note" htmlFor="review-note">
              <textarea id="review-note" value={note} onChange={(event) => setNote(event.target.value)} rows={3} required className="form-control py-3" />
            </FormField>
          </div>
        </div>
      </fieldset>

      <fieldset className="border-t border-slate-200 pt-6">
        <legend className="text-base font-semibold text-slate-950">Policy evidence</legend>
        <p className="mt-1 text-sm leading-6 text-slate-600">A proceed decision needs at least one verified policy section. Search adds evidence for manual-review cases.</p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <label htmlFor="policy-search" className="sr-only">Search policy evidence</label>
          <input
            id="policy-search"
            type="search"
            value={policyQuery}
            onChange={(event) => setPolicyQuery(event.target.value)}
            placeholder="Search policy evidence"
            className="form-control"
          />
          <button
            type="button"
            onClick={searchPolicies}
            disabled={searching || !policyQuery.trim()}
            className="min-h-12 shrink-0 rounded-lg border border-civic-700 px-4 text-sm font-semibold text-civic-800 outline-none hover:bg-civic-50 focus-visible:ring-2 focus-visible:ring-civic-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {searching ? "Searching…" : "Search policy"}
          </button>
        </div>
        {candidates.length > 0 ? (
          <div className="mt-4 divide-y divide-slate-200 border-y border-slate-200">
            {candidates.map((citation) => {
              const key = citationKey(citation);
              return (
                <label key={key} className="flex cursor-pointer gap-3 py-4">
                  <input
                    type="checkbox"
                    checked={selectedKeys.includes(key)}
                    onChange={() => toggleCitation(key)}
                    aria-label={`Use citation: ${citation.doc_title} — ${citation.section}`}
                    className="mt-1 h-5 w-5 shrink-0 accent-civic-700"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-slate-900">{citation.doc_title}</span>
                    <span className="mt-1 block text-sm text-slate-700">{citation.section}</span>
                    <span className="mt-1 line-clamp-2 block text-xs leading-5 text-slate-500">{citation.snippet}</span>
                  </span>
                </label>
              );
            })}
          </div>
        ) : (
          <p className="mt-4 border-l-4 border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-950">No policy evidence is selected. Search before choosing a proceed decision.</p>
        )}
      </fieldset>

      <fieldset className="border-t border-slate-200 pt-6">
        <legend className="text-base font-semibold text-slate-950">Citizen reply draft</legend>
        <p className="mt-1 text-sm leading-6 text-slate-600">Edit both versions before approval. Saving the review approves this draft for the current revision; it is not sent automatically.</p>
        <div className="mt-4 grid gap-4">
          <FormField label={`Citizen reply (${LANGUAGE_NAMES[language]})`} htmlFor="reply-body">
            <textarea id="reply-body" value={replyBody} onChange={(event) => setReplyBody(event.target.value)} rows={5} required className="form-control py-3" />
          </FormField>
          <FormField label="English reference reply" htmlFor="reply-body-en">
            <textarea id="reply-body-en" value={replyBodyEn} onChange={(event) => setReplyBodyEn(event.target.value)} rows={5} required className="form-control py-3" />
          </FormField>
        </div>
      </fieldset>

      {error ? <p role="alert" className="border-l-4 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}
      {message ? <p role="status" className="text-sm text-slate-700">{message}</p> : null}

      <div className="flex flex-wrap items-center gap-4 border-t border-slate-200 pt-6">
        <button
          type="submit"
          disabled={busy}
          className="min-h-12 rounded-lg bg-civic-800 px-5 text-sm font-semibold text-white outline-none hover:bg-civic-900 focus-visible:ring-2 focus-visible:ring-civic-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Saving review…" : "Save officer review"}
        </button>
        <span className="text-xs leading-5 text-slate-500">Revision {caseData.triage_revision} · saved as Officer Tan (demo)</span>
      </div>
    </form>
  );
}

function FormField({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="text-sm font-medium text-slate-800">{label}</label>
      <div className="mt-2">{children}</div>
    </div>
  );
}
