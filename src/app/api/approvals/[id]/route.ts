import { NextResponse } from "next/server";
import { decideApproval } from "@/lib/store";
import type { ApprovalStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Supervisor approves or rejects a high-risk case.
 * Demo-level gating only: the role/self-approval checks compare client-asserted
 * body strings (no auth/session layer). Server-side identity is a pilot TODO.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const decision = body.decision as ApprovalStatus;
  if (decision !== "approved" && decision !== "rejected") {
    return NextResponse.json({ error: "decision must be 'approved' or 'rejected'" }, { status: 400 });
  }
  try {
    const updated = await decideApproval({
      approval_id: id,
      decision,
      decided_by: String(body.decided_by ?? "Supervisor (demo)"),
      decided_role: String(body.decided_role ?? "supervisor"),
      note: body.note ? String(body.note) : undefined,
    });
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
