import { NextResponse } from "next/server";
import { runTriage } from "@/lib/ai/pipeline";
import { assertSyntheticDataOnly, SYNTHETIC_DATA_ONLY_CODE } from "@/lib/ai/classify";
import { LANGUAGES, type Language } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Preview triage WITHOUT persisting — used by the citizen "Analyse" step. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const text = String(body.text ?? "").trim();
  if (!text) return NextResponse.json({ error: "text is required" }, { status: 400 });

  const language: Language = LANGUAGES.includes(body.language) ? body.language : "en";
  const location_text = String(body.location_text ?? "");
  const answers = body.answers && typeof body.answers === "object" && !Array.isArray(body.answers)
    ? Object.fromEntries(Object.entries(body.answers).map(([key, value]) => [key, String(value).trim()]))
    : {};

  try {
    assertSyntheticDataOnly(text, ...Object.values(answers));
  } catch (error) {
    if ((error as { code?: string }).code === SYNTHETIC_DATA_ONLY_CODE) {
      return NextResponse.json(
        { code: SYNTHETIC_DATA_ONLY_CODE, error: "Use synthetic example details only." },
        { status: 422 },
      );
    }
    throw error;
  }

  const out = await runTriage({
    case_id: "preview",
    citizen_ref: "PREVIEW",
    text,
    selected_language: language,
    location_text,
    answers,
  });

  return NextResponse.json({
    result: out.result,
    status: out.status,
    needsInfo: out.needsInfo,
    requires_supervisor: out.result.requires_supervisor,
  });
}
