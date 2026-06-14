import { beforeEach, describe, expect, it } from "vitest";
import { POST as postApprovalDecision } from "@/app/api/approvals/[id]/route";
import { POST as postCaseStatus } from "@/app/api/cases/[id]/status/route";
import {
  decideApproval,
  getCase,
  listAudit,
  listApprovals,
  resetStore,
  setStatus,
  submitCase,
} from "@/lib/store";

const FLOOD_TEXT = "Longkang tersumbat dekat Jalan SS2, bila hujan air naik cepat.";

async function submitFloodRiskCase() {
  const c = await submitCase({
    text: FLOOD_TEXT,
    language: "ms",
    location_text: "Jalan SS2",
  });
  expect(c.status).toBe("awaiting_supervisor");
  expect(c.approval_task_id).not.toBeNull();
  return c;
}

async function pendingApprovalFor(caseId: string) {
  const pending = await listApprovals("pending");
  const task = pending.find((t) => t.case_id === caseId);
  expect(task).toBeDefined();
  return task!;
}

describe("case lifecycle governance", () => {
  beforeEach(async () => {
    await resetStore();
  });

  it("blocks a pending flood-risk drainage case from moving to in_progress", async () => {
    const c = await submitFloodRiskCase();

    await expect(
      setStatus({ case_id: c.case_id, status: "in_progress", actor_label: "Officer Tan (demo)" }),
    ).rejects.toThrow(/Supervisor approval required before work can start/i);

    expect((await getCase(c.case_id))?.status).toBe("awaiting_supervisor");
    const denied = (await listAudit(c.case_id)).filter((e) => e.event_type === "status.denied");
    expect(denied.at(-1)?.payload.status).toBe("in_progress");
  });

  it("blocks a pending flood-risk drainage case from moving to closed via the status API", async () => {
    const c = await submitFloodRiskCase();

    const res = await postCaseStatus(
      new Request(`http://localhost/api/cases/${c.case_id}/status`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "closed", officer: "Officer Tan (demo)" }),
      }),
      { params: Promise.resolve({ id: c.case_id }) },
    );

    expect([400, 403]).toContain(res.status);
    const body = await res.json();
    expect(body.error).toMatch(/Supervisor approval required before work can start/i);
    expect((await getCase(c.case_id))?.status).toBe("awaiting_supervisor");
  });

  it("allows an approved flood-risk drainage case to move to in_progress", async () => {
    const c = await submitFloodRiskCase();
    const task = await pendingApprovalFor(c.case_id);

    await decideApproval({
      approval_id: task.approval_id,
      decision: "approved",
      decided_by: "Supervisor Lim (demo)",
      decided_role: "supervisor",
      note: "Flood risk verified; start field response.",
    });

    const updated = await setStatus({
      case_id: c.case_id,
      status: "in_progress",
      actor_label: "Officer Tan (demo)",
    });
    expect(updated.status).toBe("in_progress");
  });

  it("blocks needs-info business licensing cases from normal start or closure", async () => {
    const c = await submitCase({
      text: "I want to apply for a food stall licence. What documents are needed?",
      language: "en",
      location_text: "",
    });

    expect(c.category).toBe("business_licensing");
    expect(c.status).toBe("needs_info");

    await expect(setStatus({ case_id: c.case_id, status: "in_progress" })).rejects.toThrow(/Missing information/i);
    await expect(setStatus({ case_id: c.case_id, status: "closed" })).rejects.toThrow(/Missing information/i);
    expect((await getCase(c.case_id))?.status).toBe("needs_info");
  });

  it("blocks education and welfare cases from generic closure as an auto-approval", async () => {
    const c = await submitCase({
      text: "Can I apply for education aid for my child?",
      language: "en",
      location_text: "Taman Demo",
    });

    expect(c.category).toBe("education_aid_welfare");
    expect(c.officer_review_only).toBe(true);
    expect(c.status).toBe("routed");

    await expect(setStatus({ case_id: c.case_id, status: "closed" })).rejects.toThrow(/eligibility/i);
    const started = await setStatus({ case_id: c.case_id, status: "in_progress" });
    expect(started.status).toBe("in_progress");
  });

  it("puts zero-citation and low-confidence enquiries into manual review, not normal routed work", async () => {
    const c = await submitCase({
      text: "Hello, I have a question.",
      language: "en",
      location_text: "",
    });

    expect(c.category).toBe("general_enquiry");
    expect(c.category_confidence).toBeLessThan(0.5);
    expect(c.citations).toHaveLength(0);
    expect(c.status).toBe("manual_review");
    expect(c.manual_review_reason).toBe("Manual review required because no reliable policy citation was found.");

    await expect(setStatus({ case_id: c.case_id, status: "in_progress" })).rejects.toThrow(/Manual review required/i);
  });
});

describe("approval decision notes", () => {
  beforeEach(async () => {
    await resetStore();
  });

  it("requires a non-empty supervisor decision note in the store", async () => {
    const c = await submitFloodRiskCase();
    const task = await pendingApprovalFor(c.case_id);

    await expect(
      decideApproval({
        approval_id: task.approval_id,
        decision: "approved",
        decided_by: "Supervisor Lim (demo)",
        decided_role: "supervisor",
        note: "   ",
      }),
    ).rejects.toThrow(/Decision note is required/i);
  });

  it("requires a non-empty supervisor decision note through the approval API", async () => {
    const c = await submitFloodRiskCase();
    const task = await pendingApprovalFor(c.case_id);

    const res = await postApprovalDecision(
      new Request(`http://localhost/api/approvals/${task.approval_id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          decision: "approved",
          decided_by: "Supervisor Lim (demo)",
          decided_role: "supervisor",
        }),
      }),
      { params: Promise.resolve({ id: task.approval_id }) },
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Decision note is required/i);
  });
});
