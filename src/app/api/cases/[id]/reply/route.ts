import { NextResponse } from "next/server";
import { releaseReply } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Officer releases (sends) the AI-drafted reply after review. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const officer = String(body.officer ?? "Officer (demo)");
  try {
    const updated = await releaseReply(id, officer);
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
