"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ReplyActions({
  caseId,
  triageRevision,
  sent,
  blocker,
}: {
  caseId: string;
  triageRevision: number;
  sent: boolean;
  blocker?: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const blockerId = `reply-blocker-${caseId}`;

  async function release() {
    if (busy || blocker) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/cases/${caseId}/reply`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ triage_revision: triageRevision, officer: "Officer Tan (demo)" }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Reply release failed.");
      router.refresh();
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return <p className="text-sm font-medium text-emerald-800">Reply sent to the citizen.</p>;
  }

  return (
    <div>
      <button
        type="button"
        onClick={release}
        aria-disabled={busy || Boolean(blocker)}
        aria-describedby={blocker ? blockerId : undefined}
        aria-busy={busy}
        className="min-h-12 rounded-lg bg-civic-800 px-5 text-sm font-semibold text-white outline-none hover:bg-civic-900 focus-visible:ring-2 focus-visible:ring-civic-600 focus-visible:ring-offset-2 aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
      >
        {busy ? "Sending…" : "Send reply to citizen"}
      </button>
      {blocker ? <p id={blockerId} className="mt-3 text-sm leading-6 text-amber-800">{blocker}</p> : null}
      {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
