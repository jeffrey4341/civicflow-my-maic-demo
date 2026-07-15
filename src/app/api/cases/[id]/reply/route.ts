import { NextResponse } from "next/server";
import { releaseReply } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Officer releases (sends) the AI-drafted reply after review. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const updated = await releaseReply({
      case_id: id,
      triage_revision: Number(body.triage_revision),
      officer: String(body.officer ?? "Officer (demo)"),
    });
    return NextResponse.json(updated);
  } catch (err) {
    const message = (err as Error).message;
    return NextResponse.json(
      { error: message },
      { status: message === "stale_triage_revision" ? 409 : message.includes("not found") ? 404 : 400 },
    );
  }
}
