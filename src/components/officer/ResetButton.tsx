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
      const res = await fetch("/api/reset", { method: "POST" });
      if (!res.ok) throw new Error(`Reset failed (HTTP ${res.status})`);
      router.push("/officer");
      router.refresh();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={reset}
      disabled={busy}
      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
    >
      {busy ? "Resetting…" : "↺ Reset demo"}
    </button>
  );
}
