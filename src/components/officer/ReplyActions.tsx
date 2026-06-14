"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ReplyActions({ caseId, sent }: { caseId: string; sent: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function release() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/cases/${caseId}/reply`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ officer: "Officer Tan (demo)" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to release reply");
      }
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return <span className="text-xs font-medium text-emerald-600">✓ Reply released to citizen</span>;
  }

  return (
    <div>
      <button
        onClick={release}
        disabled={busy}
        className="rounded-lg bg-civic-600 px-4 py-2 text-sm font-semibold text-white hover:bg-civic-700 disabled:opacity-40"
      >
        {busy ? "…" : "Review & release reply"}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
