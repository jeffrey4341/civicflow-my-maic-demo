import { NextResponse } from "next/server";
import { setStatus } from "@/lib/store";
import { CASE_STATUS_ORDER, type CaseStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Officer advances the case status (e.g. in_progress, closed). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const status = body.status as CaseStatus;
  if (!CASE_STATUS_ORDER.includes(status)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }
  try {
    const updated = await setStatus({
      case_id: id,
      status,
      actor_label: String(body.officer ?? "Council Officer"),
    });
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
