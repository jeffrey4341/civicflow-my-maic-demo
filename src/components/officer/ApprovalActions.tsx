"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ApprovalActions({
  approvalId,
  triageRevision,
  disabledReason,
}: {
  approvalId: string;
  triageRevision: number;
  disabledReason?: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const noteHintId = `approval-note-hint-${approvalId}`;
  const blockerId = `approval-blocker-${approvalId}`;

  async function decide(decision: "approved" | "rejected") {
    if (busy || disabledReason) return;
    const trimmedNote = note.trim();
    if (!trimmedNote) {
      setError("A supervisor decision note is required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/approvals/${approvalId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          triage_revision: triageRevision,
          decision,
          decided_by: "Supervisor Lim (demo)",
          decided_role: "supervisor",
          note: trimmedNote,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Supervisor decision failed.");
      router.refresh();
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const disabled = busy || Boolean(disabledReason) || !note.trim();
  const describedBy = `${noteHintId}${disabledReason ? ` ${blockerId}` : ""}`;

  return (
    <div>
      <label htmlFor={`approval-note-${approvalId}`} className="text-sm font-medium text-slate-800">
        Supervisor decision note
      </label>
      <textarea
        id={`approval-note-${approvalId}`}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        rows={3}
        required
        aria-describedby={noteHintId}
        placeholder="Record the reason for this human decision"
        className="form-control mt-2 py-3"
      />
      <p id={noteHintId} className="mt-2 text-xs leading-5 text-slate-600">Enter a note before choosing a supervisor decision.</p>
      {disabledReason ? <p id={blockerId} className="mt-2 text-sm leading-6 text-amber-800">{disabledReason}</p> : null}
      {error ? <p role="alert" className="mt-2 text-sm text-red-700">{error}</p> : null}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => decide("approved")}
          aria-disabled={disabled}
          aria-describedby={describedBy}
          aria-busy={busy}
          className="min-h-12 flex-1 rounded-lg bg-civic-800 px-4 text-sm font-semibold text-white outline-none hover:bg-civic-900 focus-visible:ring-2 focus-visible:ring-civic-600 focus-visible:ring-offset-2 aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
        >
          {busy ? "Saving…" : "Approve request"}
        </button>
        <button
          type="button"
          onClick={() => decide("rejected")}
          aria-disabled={disabled}
          aria-describedby={describedBy}
          aria-busy={busy}
          className="min-h-12 flex-1 rounded-lg border border-red-300 bg-white px-4 text-sm font-semibold text-red-800 outline-none hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
        >
          Reject request
        </button>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">Only a supervisor can make this decision. Revision {triageRevision} remains unchanged.</p>
    </div>
  );
}
