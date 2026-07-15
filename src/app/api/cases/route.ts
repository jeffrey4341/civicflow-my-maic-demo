import { NextResponse } from "next/server";
import { listCases, submitCase } from "@/lib/store";
import { SYNTHETIC_DATA_ONLY_CODE } from "@/lib/ai/classify";
import { LANGUAGES, type Language, type SourceChannel } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await listCases());
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const text = String(body.text ?? "").trim();
  if (!text) return NextResponse.json({ error: "text is required" }, { status: 400 });

  const language: Language = LANGUAGES.includes(body.language) ? body.language : "en";
  const channel: SourceChannel = body.source_channel ?? "mobile_pwa";
  const media_refs = Array.isArray(body.media_refs) ? body.media_refs.map(String) : [];
  const answers = body.answers && typeof body.answers === "object" && !Array.isArray(body.answers)
    ? Object.fromEntries(Object.entries(body.answers).map(([key, value]) => [key, String(value).trim()]))
    : {};

  try {
    const created = await submitCase({
      text,
      language,
      location_text: String(body.location_text ?? ""),
      media_refs,
      answers,
      source_channel: channel,
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if ((error as { code?: string }).code === SYNTHETIC_DATA_ONLY_CODE) {
      return NextResponse.json(
        { code: SYNTHETIC_DATA_ONLY_CODE, error: "Use synthetic example details only." },
        { status: 422 },
      );
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
