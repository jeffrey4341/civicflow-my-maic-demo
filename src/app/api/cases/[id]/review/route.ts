import { NextResponse } from "next/server";

import { SYNTHETIC_DATA_ONLY_CODE } from "@/lib/ai/classify";
import { reviewCase } from "@/lib/store";
import {
  CASE_CATEGORIES,
  LANGUAGES,
  type CaseCategory,
  type Language,
  type OfficerReviewResolution,
  type WelfareOutcome,
} from "@/lib/types";

export const dynamic = "force-dynamic";

const RESOLUTIONS: OfficerReviewResolution[] = ["proceed", "close_no_action", "resubmit_approval"];
const WELFARE_OUTCOMES: WelfareOutcome[] = ["eligible", "not_eligible"];

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const triageRevision = Number(body.triage_revision);
  if (!Number.isInteger(triageRevision) || triageRevision < 0) {
    return NextResponse.json({ error: "valid triage_revision is required" }, { status: 400 });
  }
  if (!LANGUAGES.includes(body.citizen_language as Language)) {
    return NextResponse.json({ error: "invalid citizen_language" }, { status: 400 });
  }
  if (!CASE_CATEGORIES.includes(body.category as CaseCategory)) {
    return NextResponse.json({ error: "invalid category" }, { status: 400 });
  }
  if (!RESOLUTIONS.includes(body.resolution as OfficerReviewResolution)) {
    return NextResponse.json({ error: "invalid resolution" }, { status: 400 });
  }
  if (body.welfare_outcome != null && !WELFARE_OUTCOMES.includes(body.welfare_outcome as WelfareOutcome)) {
    return NextResponse.json({ error: "invalid welfare_outcome" }, { status: 400 });
  }
  if (!body.routing || typeof body.routing !== "object" || Array.isArray(body.routing)) {
    return NextResponse.json({ error: "routing is required" }, { status: 400 });
  }
  if (!Array.isArray(body.citation_keys)) {
    return NextResponse.json({ error: "citation_keys must be an array" }, { status: 400 });
  }
  const citationKeys = body.citation_keys.map((key: unknown) => {
    const item = key && typeof key === "object" && !Array.isArray(key)
      ? key as Record<string, unknown>
      : {};
    return { source_doc: String(item.source_doc ?? "").trim(), section: String(item.section ?? "").trim() };
  });
  if (citationKeys.some((key: { source_doc: string; section: string }) => !key.source_doc || !key.section)) {
    return NextResponse.json({ error: "invalid citation key" }, { status: 400 });
  }

  try {
    const updated = await reviewCase({
      case_id: id,
      triage_revision: triageRevision,
      officer: String(body.officer ?? ""),
      note: String(body.note ?? ""),
      citizen_language: body.citizen_language as Language,
      category: body.category as CaseCategory,
      routing: {
        department: String(body.routing.department ?? ""),
        unit: String(body.routing.unit ?? ""),
      },
      citation_keys: citationKeys,
      reply_body: String(body.reply_body ?? ""),
      reply_body_en: String(body.reply_body_en ?? ""),
      resolution: body.resolution as OfficerReviewResolution,
      welfare_outcome: body.welfare_outcome as WelfareOutcome | null | undefined,
    });
    return NextResponse.json(updated);
  } catch (error) {
    const message = (error as Error).message;
    const code = (error as { code?: string }).code;
    const status = message === "stale_triage_revision"
      ? 409
      : message === "case_not_found"
        ? 404
        : code === SYNTHETIC_DATA_ONLY_CODE
          ? 422
          : 400;
    return NextResponse.json({ code: code ?? message, error: message }, { status });
  }
}
