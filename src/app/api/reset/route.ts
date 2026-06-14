import { NextResponse } from "next/server";
import { listCases, resetStore } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Re-seed the demo store to a clean state. */
export async function POST() {
  await resetStore();
  const cases = await listCases();
  return NextResponse.json({ ok: true, seeded_cases: cases.length });
}
