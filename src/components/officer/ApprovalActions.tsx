"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ApprovalActions({ approvalId }: { approvalId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function decide(decision: "approved" | "rejected") {
    const trimmedNote = note.trim();
    if (!trimmedNote) {
      setError("Decision note is required.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/approvals/${approvalId}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        decision,
        decided_by: "Supervisor Lim (demo)",
        decided_role: "supervisor",
        note: trimmedNote,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Action failed");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        required
        placeholder="Decision note (required)..."
        className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-civic-500 focus:outline-none"
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      <div className="mt-2 flex gap-2">
        <button
          onClick={() => decide("approved")}
          disabled={busy || !note.trim()}
          className="flex-1 rounded-lg bg-emerald-600 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
        >
          ✓ Approve
        </button>
        <button
          onClick={() => decide("rejected")}
          disabled={busy || !note.trim()}
          className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-40"
        >
          ✕ Reject
        </button>
      </div>
      <p className="mt-2 text-[11px] text-slate-400">
        Role-gated to supervisors. The AI requested this — it cannot approve itself.
      </p>
    </div>
  );
}
