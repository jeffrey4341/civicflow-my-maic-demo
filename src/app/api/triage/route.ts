import { NextResponse } from "next/server";
import { runTriage } from "@/lib/ai/pipeline";
import { LANGUAGES, type Language } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Preview triage WITHOUT persisting — used by the citizen "Analyse" step. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const text = String(body.text ?? "").trim();
  if (!text) return NextResponse.json({ error: "text is required" }, { status: 400 });

  const language: Language = LANGUAGES.includes(body.language) ? body.language : "en";
  const location_text = String(body.location_text ?? "");

  const out = await runTriage({
    case_id: "preview",
    citizen_ref: "PREVIEW",
    text,
    selected_language: language,
    location_text,
  });

  return NextResponse.json({
    result: out.result,
    status: out.status,
    needsInfo: out.needsInfo,
    requires_supervisor: out.result.requires_supervisor,
  });
}
