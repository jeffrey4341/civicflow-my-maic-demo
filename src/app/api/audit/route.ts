import { NextResponse } from "next/server";
import { listAudit } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const caseId = new URL(req.url).searchParams.get("case_id") ?? undefined;
  return NextResponse.json(await listAudit(caseId || undefined));
}
