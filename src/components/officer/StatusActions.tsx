"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CaseStatus } from "@/lib/types";

export function StatusActions({
  caseId,
  status,
  blocker,
  officerReviewOnly = false,
}: {
  caseId: string;
  status: CaseStatus;
  blocker?: string | null;
  officerReviewOnly?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function setStatus(next: CaseStatus) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/cases/${caseId}/status`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: next, officer: "Officer Tan (demo)" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to update status");
      }
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (blocker) {
    return (
      <div className="max-w-sm rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
        {blocker}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status !== "in_progress" && status !== "closed" && (
        <button
          onClick={() => setStatus("in_progress")}
          disabled={busy}
          className="rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-40"
        >
          {officerReviewOnly ? "Start officer review" : "Start work (in progress)"}
        </button>
      )}
      {status !== "closed" && !officerReviewOnly && (
        <button
          onClick={() => setStatus("closed")}
          disabled={busy}
          className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-40"
        >
          Close case
        </button>
      )}
      {officerReviewOnly && (
        <span className="text-xs text-slate-500">
          Eligibility is reviewed by an officer; generic closure is disabled.
        </span>
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
