import { NextResponse } from "next/server";
import { listCases, submitCase } from "@/lib/store";
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

  const created = await submitCase({
    text,
    language,
    location_text: String(body.location_text ?? ""),
    media_refs,
    source_channel: channel,
  });
  return NextResponse.json(created, { status: 201 });
}
