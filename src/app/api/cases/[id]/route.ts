import { NextResponse } from "next/server";
import { getCase, updateCitizenDetails } from "@/lib/store";
import { SYNTHETIC_DATA_ONLY_CODE } from "@/lib/ai/classify";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const found = await getCase(id);
  if (!found) return NextResponse.json({ error: "case not found" }, { status: 404 });
  return NextResponse.json(found);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const answers = body.answers && typeof body.answers === "object" && !Array.isArray(body.answers)
    ? Object.fromEntries(Object.entries(body.answers).map(([key, value]) => [key, String(value).trim()]))
    : {};
  try {
    const updated = await updateCitizenDetails({
      id_or_ref: id,
      triage_revision: Number(body.triage_revision),
      answers,
    });
    return NextResponse.json(updated);
  } catch (error) {
    const message = (error as Error).message;
    const code = (error as { code?: string }).code;
    const status = code === SYNTHETIC_DATA_ONLY_CODE
      ? 422
      : message === "stale_triage_revision"
        ? 409
        : message === "case_not_found"
          ? 404
          : 400;
    return NextResponse.json({ code: code ?? message, error: message }, { status });
  }
}
