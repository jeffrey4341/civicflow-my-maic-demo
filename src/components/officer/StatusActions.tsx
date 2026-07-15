"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { CaseStatus } from "@/lib/types";

export function StatusActions({
  caseId,
  triageRevision,
  status,
  startBlocker,
  closeBlocker,
}: {
  caseId: string;
  triageRevision: number;
  status: CaseStatus;
  startBlocker?: string | null;
  closeBlocker?: string | null;
}) {
  const router = useRouter();
  const [busyAction, setBusyAction] = useState<"start" | "close" | null>(null);
  const [closureNote, setClosureNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const startDescriptionId = `start-description-${caseId}`;
  const startBlockerId = `start-blocker-${caseId}`;
  const closeDescriptionId = `close-description-${caseId}`;
  const closeBlockerId = `close-blocker-${caseId}`;

  async function setCaseStatus(next: "in_progress" | "closed") {
    if (busyAction !== null) return;
    if (next === "in_progress" && (status === "in_progress" || startBlocker)) return;
    if (next === "closed" && closeBlocker) return;
    if (next === "closed" && !closureNote.trim()) {
      setError("Enter a closure note before closing the case.");
      return;
    }
    setBusyAction(next === "in_progress" ? "start" : "close");
    setError(null);
    try {
      const response = await fetch(`/api/cases/${caseId}/status`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          triage_revision: triageRevision,
          status: next,
          officer: "Officer Tan (demo)",
          note: next === "closed" ? closureNote.trim() : undefined,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Case status could not be updated.");
      router.refresh();
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusyAction(null);
    }
  }

  if (status === "closed") {
    return <p className="text-sm leading-6 text-slate-700">This case is closed and cannot be changed.</p>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <h3 className="font-semibold text-slate-950">Begin council work</h3>
        <p id={startDescriptionId} className="mt-1 text-sm leading-6 text-slate-600">Starting work is a separate officer action. Reviews, approvals, and sending a reply never start it automatically.</p>
        <button
          type="button"
          onClick={() => setCaseStatus("in_progress")}
          aria-disabled={busyAction !== null || status === "in_progress" || Boolean(startBlocker)}
          aria-describedby={`${startDescriptionId}${startBlocker ? ` ${startBlockerId}` : ""}`}
          aria-busy={busyAction === "start"}
          className="mt-4 min-h-12 rounded-lg border border-civic-700 bg-white px-5 text-sm font-semibold text-civic-800 outline-none hover:bg-civic-50 focus-visible:ring-2 focus-visible:ring-civic-600 focus-visible:ring-offset-2 aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
        >
          {busyAction === "start" ? "Starting…" : status === "in_progress" ? "Work started" : "Start work"}
        </button>
        {startBlocker ? <p id={startBlockerId} className="mt-3 text-sm leading-6 text-amber-800">{startBlocker}</p> : null}
      </div>

      <div className="border-t border-slate-200 pt-6 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
        <h3 className="font-semibold text-slate-950">Close the case</h3>
        <p id={closeDescriptionId} className="mt-1 text-sm leading-6 text-slate-600">Closure requires a sent citizen reply and a durable officer note.</p>
        <label htmlFor="closure-note" className="mt-4 block text-sm font-medium text-slate-800">Closure note</label>
        <textarea
          id="closure-note"
          value={closureNote}
          onChange={(event) => setClosureNote(event.target.value)}
          rows={3}
          required
          placeholder="Record what was completed and why the case can close"
          className="form-control mt-2 py-3"
        />
        <button
          type="button"
          onClick={() => setCaseStatus("closed")}
          aria-disabled={busyAction !== null || Boolean(closeBlocker) || !closureNote.trim()}
          aria-describedby={`${closeDescriptionId}${closeBlocker ? ` ${closeBlockerId}` : ""}`}
          aria-busy={busyAction === "close"}
          className="mt-4 min-h-12 rounded-lg bg-slate-950 px-5 text-sm font-semibold text-white outline-none hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-slate-600 focus-visible:ring-offset-2 aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
        >
          {busyAction === "close" ? "Closing…" : "Close case"}
        </button>
        {closeBlocker ? <p id={closeBlockerId} className="mt-3 text-sm leading-6 text-amber-800">{closeBlocker}</p> : null}
      </div>

      {error ? <p role="alert" className="text-sm text-red-700 lg:col-span-2">{error}</p> : null}
    </div>
  );
}
