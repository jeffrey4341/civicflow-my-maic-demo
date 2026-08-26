"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ResetButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function reset() {
    if (!confirm("Reset the demo to seed data? This clears any cases you submitted.")) return;
    setBusy(true);
    try {
      const response = await fetch("/api/reset", { method: "POST" });
      if (!response.ok) throw new Error(`Reset failed (HTTP ${response.status})`);
      router.push("/officer");
      router.refresh();
    } catch (caught) {
      alert((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={reset}
      disabled={busy}
      className="min-h-11 rounded-lg border border-slate-300 px-3 text-xs font-medium text-slate-600 outline-none hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-civic-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {busy ? "Resetting…" : "Reset synthetic demo"}
    </button>
  );
}
