import { NextResponse } from "next/server";
import { listApprovals } from "@/lib/store";
import type { ApprovalStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const status = new URL(req.url).searchParams.get("status") as ApprovalStatus | null;
  const valid: ApprovalStatus[] = ["pending", "approved", "rejected"];
  return NextResponse.json(await listApprovals(status && valid.includes(status) ? status : undefined));
}
