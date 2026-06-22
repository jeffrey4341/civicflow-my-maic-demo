"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Textarea } from "@/components/ui";

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
      <Textarea
        label="Decision note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        required
        aria-required="true"
        placeholder="Why are you approving or rejecting?"
      />
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
      <div className="mt-2 flex gap-2">
        <Button
          variant="success"
          loading={busy}
          disabled={!note.trim()}
          onClick={() => decide("approved")}
          className="flex-1"
        >
          ✓ Approve
        </Button>
        <Button
          variant="danger"
          loading={busy}
          disabled={!note.trim()}
          onClick={() => decide("rejected")}
          className="flex-1"
        >
          ✕ Reject
        </Button>
      </div>
      <p className="mt-2 text-[11px] text-slate-400">
        Role-gated to supervisors. The AI requested this — it cannot approve itself.
      </p>
    </div>
  );
}
