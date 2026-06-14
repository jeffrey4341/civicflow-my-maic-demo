import { NextResponse } from "next/server";
import { getCase } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const found = await getCase(id);
  if (!found) return NextResponse.json({ error: "case not found" }, { status: 404 });
  return NextResponse.json(found);
}
