"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CaseStatus } from "@/lib/types";
import { Button } from "@/components/ui";

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
        <Button
          variant="soft-indigo"
          size="sm"
          loading={busy}
          onClick={() => setStatus("in_progress")}
        >
          {officerReviewOnly ? "Start officer review" : "Start work (in progress)"}
        </Button>
      )}
      {status !== "closed" && !officerReviewOnly && (
        <Button variant="soft-emerald" size="sm" loading={busy} onClick={() => setStatus("closed")}>
          Close case
        </Button>
      )}
      {officerReviewOnly && (
        <span className="text-xs text-slate-500">
          Eligibility is reviewed by an officer; generic closure is disabled.
        </span>
      )}
      {error && (
        <span role="alert" className="text-xs text-red-600">
          {error}
        </span>
      )}
    </div>
  );
}
