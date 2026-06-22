"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

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
    <Button variant="secondary" size="sm" loading={busy} onClick={reset}>
      {busy ? "Resetting…" : "↺ Reset demo"}
    </Button>
  );
}
