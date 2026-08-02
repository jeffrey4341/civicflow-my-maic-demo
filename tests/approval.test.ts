import { beforeEach, describe, expect, it } from "vitest";
import { buildApprovalTask, evaluateApprovalGate } from "@/lib/ai/approval";
import { decideApproval, listApprovals, resetStore, reviewCase, submitCase } from "@/lib/store";

describe("approval gate", () => {
  it("requires supervisor approval for flood-risk drainage", () => {
    const g = evaluateApprovalGate({
      category: "drainage",
      urgency: "flood_risk",
      pii_risk: "low",
      category_confidence: 0.9,
    });
    expect(g.requires_supervisor).toBe(true);
    expect(g.officer_review_only).toBe(false);
  });

  it("never auto-approves education aid — officer review only", () => {
    const g = evaluateApprovalGate({
      category: "education_aid_welfare",
      urgency: "normal",
      pii_risk: "low",
      category_confidence: 0.85,
    });
    expect(g.requires_supervisor).toBe(false);
    expect(g.officer_review_only).toBe(true);
  });

  it("requires supervisor approval when PII risk is high", () => {
    const g = evaluateApprovalGate({
      category: "business_licensing",
      urgency: "normal",
      pii_risk: "high",
      category_confidence: 0.8,
    });
    expect(g.requires_supervisor).toBe(true);
  });

  it("builds an approval task requested by the AI agent, pending, role=supervisor", () => {
    const task = buildApprovalTask({
      case_id: "c1",
      triage_revision: 1,
      title: "t",
      reason: "r",
      risk_factors: ["x"],
      evidence: [],
    });
    expect(task.requested_by).toBe("ai_agent");
    expect(task.status).toBe("pending");
    expect(task.approver_role).toBe("supervisor");
    expect(task.decision_by).toBeNull();
  });
});

describe("approval governance (no self-approval, role-gated)", () => {
  beforeEach(async () => {
    await resetStore();
  });

  it("lets a supervisor approve a high-risk case and blocks double-decision and wrong roles", async () => {
    const c = await submitCase({
      text: "Longkang tersumbat dekat Jalan SS2, bila hujan air naik cepat.",
      language: "ms",
      location_text: "Jalan SS2",
    });
    expect(c.status).toBe("awaiting_supervisor");
    expect(c.approval_task_id).not.toBeNull();

    const pending = await listApprovals("pending");
    const task = pending.find((t) => t.case_id === c.case_id);
    expect(task).toBeDefined();

    await reviewCase({
      case_id: c.case_id,
      triage_revision: c.triage_revision,
      officer: "Officer Tan (demo)",
      note: "Reviewed synthetic flood-risk case.",
      citizen_language: c.citizen_language,
      category: c.category,
      routing: { department: c.department, unit: c.unit },
      citation_keys: c.citations.map(({ source_doc, section }) => ({ source_doc, section })),
      reply_body: "Officer-reviewed synthetic citizen reply.",
      reply_body_en: "Officer-reviewed synthetic citizen reply.",
      resolution: "proceed",
    });

    // Wrong role may not decide.
    await expect(
      decideApproval({
        approval_id: task!.approval_id,
        triage_revision: c.triage_revision,
        decision: "approved",
        decided_by: "Officer X",
        decided_role: "officer",
        note: "Officer cannot approve this task.",
      }),
    ).rejects.toThrow();

    // Correct role approves.
    const approved = await decideApproval({
      approval_id: task!.approval_id,
      triage_revision: c.triage_revision,
      decision: "approved",
      decided_by: "Supervisor Lim (demo)",
      decided_role: "supervisor",
      note: "Confirmed flood risk; dispatch authorised.",
    });
    expect(approved.status).toBe("approved");
    expect(approved.decision_by).toBe("Supervisor Lim (demo)");

    // Cannot decide twice.
    await expect(
      decideApproval({
        approval_id: task!.approval_id,
        triage_revision: c.triage_revision,
        decision: "rejected",
        decided_role: "supervisor",
        note: "A second decision is not permitted.",
      }),
    ).rejects.toThrow();
  });
});
