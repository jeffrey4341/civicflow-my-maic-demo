import { beforeEach, describe, expect, it } from "vitest";

import { POST as decideApprovalRoute } from "@/app/api/approvals/[id]/route";
import { POST as reviewCaseRoute } from "@/app/api/cases/[id]/review/route";
import { POST as releaseReplyRoute } from "@/app/api/cases/[id]/reply/route";
import { POST as setStatusRoute } from "@/app/api/cases/[id]/status/route";
import {
  getApproval,
  getCase,
  listAudit,
  listApprovals,
  resetStore,
  submitCase,
} from "@/lib/store";
import type { CitizenCase } from "@/lib/types";

const FLOOD_TEXT = "Longkang tersumbat dekat Jalan SS2, bila hujan air naik cepat.";

function routeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

function reviewBody(
  c: CitizenCase,
  overrides: Record<string, unknown> = {},
) {
  return {
    triage_revision: c.triage_revision,
    officer: "Officer Tan (demo)",
    note: "Checked the request, routing and policy evidence.",
    citizen_language: c.citizen_language,
    category: c.category,
    routing: { department: c.department, unit: c.unit },
    citation_keys: c.citations.map(({ source_doc, section }) => ({ source_doc, section })),
    reply_body: "Officer-reviewed synthetic citizen reply.",
    reply_body_en: "Officer-reviewed synthetic citizen reply.",
    resolution: "proceed",
    welfare_outcome: null,
    ...overrides,
  };
}

async function postJson(
  handler: (request: Request, context: ReturnType<typeof routeContext>) => Promise<Response>,
  url: string,
  id: string,
  body: Record<string, unknown>,
) {
  return handler(
    new Request(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    routeContext(id),
  );
}

async function submitStandardCase() {
  return submitCase({
    text: "I need a food stall business licence, operating hours 09:00 to 17:00.",
    language: "en",
    location_text: "Synthetic Market A",
    answers: {
      location: "Synthetic Market A",
      business_type: "Synthetic food stall",
      operating_hours: "09:00 to 17:00",
    },
  });
}

async function submitFloodCase() {
  return submitCase({ text: FLOOD_TEXT, language: "ms", location_text: "Jalan SS2" });
}

describe("officer review contract", () => {
  beforeEach(async () => {
    await resetStore();
  });

  it("rejects a stale review and resolves citation keys from the policy corpus", async () => {
    const c = await submitStandardCase();
    const stale = await postJson(
      reviewCaseRoute,
      `http://localhost/api/cases/${c.case_id}/review`,
      c.case_id,
      reviewBody(c, { triage_revision: 0 }),
    );
    expect(stale.status).toBe(409);
    expect((await getCase(c.case_id))?.officer_review).toBeNull();
    expect((await getCase(c.case_id))?.triage_revision).toBe(1);

    const invalidCitation = await postJson(
      reviewCaseRoute,
      `http://localhost/api/cases/${c.case_id}/review`,
      c.case_id,
      reviewBody(c, {
        citation_keys: [{ source_doc: "not-a-policy.md", section: "Invented" }],
      }),
    );
    expect(invalidCitation.status).toBe(400);
    expect((await getCase(c.case_id))?.officer_review).toBeNull();

    const reviewed = await postJson(
      reviewCaseRoute,
      `http://localhost/api/cases/${c.case_id}/review`,
      c.case_id,
      reviewBody(c),
    );
    expect(reviewed.status).toBe(200);
    const body = await reviewed.json();
    expect(body.officer_review).toMatchObject({
      triage_revision: 1,
      officer: "Officer Tan (demo)",
      resolution: "proceed",
    });
    expect(body.reply_draft).toMatchObject({ status: "approved", approved_revision: 1 });
    expect(body.citations[0].snippet).toBe(c.citations[0].snippet);
  });

  it("requires a current review before reply release, then supports start and noted closure", async () => {
    const c = await submitStandardCase();
    const earlyReply = await postJson(
      releaseReplyRoute,
      `http://localhost/api/cases/${c.case_id}/reply`,
      c.case_id,
      { triage_revision: c.triage_revision, officer: "Officer Tan (demo)" },
    );
    expect(earlyReply.status).toBe(400);

    expect((await postJson(
      reviewCaseRoute,
      `http://localhost/api/cases/${c.case_id}/review`,
      c.case_id,
      reviewBody(c),
    )).status).toBe(200);

    const beforeReply = await postJson(
      setStatusRoute,
      `http://localhost/api/cases/${c.case_id}/status`,
      c.case_id,
      { triage_revision: 1, status: "in_progress", officer: "Officer Tan (demo)" },
    );
    expect(beforeReply.status).toBe(400);
    expect((await beforeReply.json()).error).toMatch(/reply must be sent/i);

    const sent = await postJson(
      releaseReplyRoute,
      `http://localhost/api/cases/${c.case_id}/reply`,
      c.case_id,
      { triage_revision: 1, officer: "Officer Tan (demo)" },
    );
    expect(sent.status).toBe(200);
    expect((await sent.json()).reply_draft.status).toBe("sent");

    const started = await postJson(
      setStatusRoute,
      `http://localhost/api/cases/${c.case_id}/status`,
      c.case_id,
      { triage_revision: 1, status: "in_progress", officer: "Officer Tan (demo)" },
    );
    expect(started.status).toBe(200);
    expect((await started.json()).status).toBe("in_progress");

    const noNote = await postJson(
      setStatusRoute,
      `http://localhost/api/cases/${c.case_id}/status`,
      c.case_id,
      { triage_revision: 1, status: "closed", officer: "Officer Tan (demo)" },
    );
    expect(noNote.status).toBe(400);

    const closed = await postJson(
      setStatusRoute,
      `http://localhost/api/cases/${c.case_id}/status`,
      c.case_id,
      {
        triage_revision: 1,
        status: "closed",
        officer: "Officer Tan (demo)",
        note: "Synthetic service action completed.",
      },
    );
    expect(closed.status).toBe(200);
    expect((await closed.json()).status).toBe("closed");
  });

  it("holds supervisor decisions until review and never starts work on approval alone", async () => {
    const c = await submitFloodCase();
    const task = await getApproval(c.approval_task_id!);
    expect(task?.triage_revision).toBe(1);

    const earlyDecision = await postJson(
      decideApprovalRoute,
      `http://localhost/api/approvals/${task!.approval_id}`,
      task!.approval_id,
      {
        triage_revision: 1,
        decision: "approved",
        decided_by: "Supervisor Lim (demo)",
        decided_role: "supervisor",
        note: "Flood risk verified.",
      },
    );
    expect(earlyDecision.status).toBe(400);

    expect((await postJson(
      reviewCaseRoute,
      `http://localhost/api/cases/${c.case_id}/review`,
      c.case_id,
      reviewBody(c),
    )).status).toBe(200);

    const approved = await postJson(
      decideApprovalRoute,
      `http://localhost/api/approvals/${task!.approval_id}`,
      task!.approval_id,
      {
        triage_revision: 1,
        decision: "approved",
        decided_by: "Supervisor Lim (demo)",
        decided_role: "supervisor",
        note: "Flood risk verified.",
      },
    );
    expect(approved.status).toBe(200);
    expect((await getCase(c.case_id))?.status).toBe("routed");

    const replyOnlyReview = await postJson(
      reviewCaseRoute,
      `http://localhost/api/cases/${c.case_id}/review`,
      c.case_id,
      reviewBody(c, { reply_body: "Edited officer-reviewed synthetic reply." }),
    );
    expect(replyOnlyReview.status).toBe(200);
    expect((await replyOnlyReview.json()).triage_revision).toBe(1);
    expect((await getApproval(task!.approval_id))?.status).toBe("approved");

    const approvalOnlyStart = await postJson(
      setStatusRoute,
      `http://localhost/api/cases/${c.case_id}/status`,
      c.case_id,
      { triage_revision: 1, status: "in_progress", officer: "Officer Tan (demo)" },
    );
    expect(approvalOnlyStart.status).toBe(400);
    expect((await approvalOnlyStart.json()).error).toMatch(/reply must be sent/i);

    expect((await postJson(
      releaseReplyRoute,
      `http://localhost/api/cases/${c.case_id}/reply`,
      c.case_id,
      { triage_revision: 1, officer: "Officer Tan (demo)" },
    )).status).toBe(200);
    expect((await postJson(
      setStatusRoute,
      `http://localhost/api/cases/${c.case_id}/status`,
      c.case_id,
      { triage_revision: 1, status: "in_progress", officer: "Officer Tan (demo)" },
    )).status).toBe(200);
  });

  it("supersedes an old approval when substantive reviewed triage facts change", async () => {
    const c = await submitFloodCase();
    const oldApprovalId = c.approval_task_id!;
    const reviewed = await postJson(
      reviewCaseRoute,
      `http://localhost/api/cases/${c.case_id}/review`,
      c.case_id,
      reviewBody(c, {
        routing: { department: "Engineering", unit: "Emergency Drainage Desk" },
      }),
    );
    expect(reviewed.status).toBe(200);
    const body = await reviewed.json();
    expect(body.triage_revision).toBe(2);
    expect(body.approval_task_id).not.toBe(oldApprovalId);
    expect((await getApproval(oldApprovalId))?.status).toBe("superseded");
    expect((await getApproval(body.approval_task_id))?.triage_revision).toBe(2);
  });

  it("supports rejected close-no-action and revised resubmission without permitting work", async () => {
    const closeCase = await submitFloodCase();
    const closeTask = await getApproval(closeCase.approval_task_id!);
    await postJson(reviewCaseRoute, "http://localhost/review", closeCase.case_id, reviewBody(closeCase));
    await postJson(decideApprovalRoute, "http://localhost/approval", closeTask!.approval_id, {
      triage_revision: 1,
      decision: "rejected",
      decided_by: "Supervisor Lim (demo)",
      decided_role: "supervisor",
      note: "No field action authorised.",
    });

    const closeReview = await postJson(
      reviewCaseRoute,
      "http://localhost/review",
      closeCase.case_id,
      reviewBody(closeCase, {
        citation_keys: [],
        resolution: "close_no_action",
        note: "Close without dispatch after supervisor rejection.",
      }),
    );
    expect(closeReview.status).toBe(200);
    const closeReviewed = await closeReview.json();
    expect(closeReviewed.status).toBe("manual_review");
    expect(closeReviewed.triage_revision).toBe(2);
    expect(closeReviewed.approval_task_id).toBeNull();

    expect((await postJson(
      releaseReplyRoute,
      "http://localhost/reply",
      closeCase.case_id,
      { triage_revision: 2, officer: "Officer Tan (demo)" },
    )).status).toBe(200);
    expect((await postJson(
      setStatusRoute,
      "http://localhost/status",
      closeCase.case_id,
      { triage_revision: 2, status: "in_progress", officer: "Officer Tan (demo)" },
    )).status).toBe(400);
    const closedWithoutAction = await postJson(
      setStatusRoute,
      "http://localhost/status",
      closeCase.case_id,
      {
        triage_revision: 2,
        status: "closed",
        officer: "Officer Tan (demo)",
        note: "Closed without dispatch after supervisor rejection.",
      },
    );
    expect(closedWithoutAction.status).toBe(200);
    expect((await closedWithoutAction.json()).status).toBe("closed");

    const resubmitCase = await submitFloodCase();
    const rejectedTask = await getApproval(resubmitCase.approval_task_id!);
    await postJson(reviewCaseRoute, "http://localhost/review", resubmitCase.case_id, reviewBody(resubmitCase));
    await postJson(decideApprovalRoute, "http://localhost/approval", rejectedTask!.approval_id, {
      triage_revision: 1,
      decision: "rejected",
      decided_by: "Supervisor Lim (demo)",
      decided_role: "supervisor",
      note: "Revise the response route.",
    });
    const resubmitted = await postJson(
      reviewCaseRoute,
      "http://localhost/review",
      resubmitCase.case_id,
      reviewBody(resubmitCase, {
        resolution: "resubmit_approval",
        routing: { department: "Engineering", unit: "Emergency Drainage Desk" },
      }),
    );
    expect(resubmitted.status).toBe(200);
    const resubmittedBody = await resubmitted.json();
    expect(resubmittedBody.triage_revision).toBe(2);
    const resubmittedTask = await getApproval(resubmittedBody.approval_task_id);
    expect(resubmittedTask?.status).toBe("pending");
    expect((await listApprovals()).filter((task) => task.case_id === resubmitCase.case_id)).toHaveLength(2);

    expect((await postJson(decideApprovalRoute, "http://localhost/approval", resubmittedTask!.approval_id, {
      triage_revision: 2,
      decision: "approved",
      decided_by: "Supervisor Lim (demo)",
      decided_role: "supervisor",
      note: "Revised response route approved.",
    })).status).toBe(200);
    expect((await getCase(resubmitCase.case_id))?.officer_review?.resolution).toBe("resubmit_approval");
    const reviewedAgain = await postJson(
      reviewCaseRoute,
      "http://localhost/review",
      resubmitCase.case_id,
      reviewBody(await getCase(resubmitCase.case_id) as CitizenCase, {
        triage_revision: 2,
        resolution: "resubmit_approval",
        routing: { department: "Engineering", unit: "Emergency Drainage Desk" },
        reply_body: "Updated synthetic reply after the revised approval.",
      }),
    );
    expect(reviewedAgain.status).toBe(200);
    expect((await reviewedAgain.json()).status).toBe("routed");
    expect((await getApproval(resubmittedTask!.approval_id))?.status).toBe("approved");
    expect((await postJson(
      releaseReplyRoute,
      "http://localhost/reply",
      resubmitCase.case_id,
      { triage_revision: 2, officer: "Officer Tan (demo)" },
    )).status).toBe(200);
    const prematureClose = await postJson(
      setStatusRoute,
      "http://localhost/status",
      resubmitCase.case_id,
      {
        triage_revision: 2,
        status: "closed",
        officer: "Officer Tan (demo)",
        note: "This must not close before work starts.",
      },
    );
    expect(prematureClose.status).toBe(400);
    expect((await prematureClose.json()).error).toMatch(/start work before closure/i);
    expect((await postJson(
      setStatusRoute,
      "http://localhost/status",
      resubmitCase.case_id,
      { triage_revision: 2, status: "in_progress", officer: "Officer Tan (demo)" },
    )).status).toBe(200);

    const postApprovalReview = await postJson(
      reviewCaseRoute,
      "http://localhost/review",
      resubmitCase.case_id,
      reviewBody(await getCase(resubmitCase.case_id) as CitizenCase, {
        triage_revision: 2,
        resolution: "proceed",
        routing: { department: "Engineering", unit: "Emergency Drainage Desk" },
        reply_body: "Updated officer-reviewed synthetic reply after approval.",
      }),
    );
    expect(postApprovalReview.status).toBe(200);
    expect((await postApprovalReview.json()).status).toBe("in_progress");
  });

  it("does not let an officer bypass a pending high-risk approval with close-no-action", async () => {
    const c = await submitFloodCase();
    const task = await getApproval(c.approval_task_id!);

    const blocked = await postJson(
      reviewCaseRoute,
      "http://localhost/review",
      c.case_id,
      reviewBody(c, {
        resolution: "close_no_action",
        note: "Close without operational action.",
      }),
    );
    expect(blocked.status).toBe(400);
    expect((await blocked.json()).error).toMatch(/supervisor.*decision/i);
    expect((await getApproval(task!.approval_id))?.status).toBe("pending");
    expect((await getCase(c.case_id))?.officer_review).toBeNull();
  });

  it("supersedes an approved high-risk task when reviewed for close-no-action", async () => {
    const c = await submitFloodCase();
    const task = await getApproval(c.approval_task_id!);
    await postJson(reviewCaseRoute, "http://localhost/review", c.case_id, reviewBody(c));
    await postJson(decideApprovalRoute, "http://localhost/approval", task!.approval_id, {
      triage_revision: 1,
      decision: "approved",
      decided_by: "Supervisor Lim (demo)",
      decided_role: "supervisor",
      note: "Human checkpoint completed.",
    });

    const reviewed = await postJson(
      reviewCaseRoute,
      "http://localhost/review",
      c.case_id,
      reviewBody(await getCase(c.case_id) as CitizenCase, {
        resolution: "close_no_action",
        note: "No operational action is now required.",
      }),
    );
    expect(reviewed.status).toBe(200);
    const body = await reviewed.json();
    expect(body.approval_task_id).toBeNull();
    expect((await getApproval(task!.approval_id))?.status).toBe("superseded");
    expect((await listAudit(c.case_id)).some((event) => event.event_type === "approval.superseded")).toBe(true);

    const repeatedReview = await postJson(
      reviewCaseRoute,
      "http://localhost/review",
      c.case_id,
      reviewBody(body as CitizenCase, {
        resolution: "close_no_action",
        note: "No operational action is required; reply wording checked again.",
      }),
    );
    expect(repeatedReview.status).toBe(200);
    expect((await repeatedReview.json()).approval_task_id).toBeNull();
  });

  it("allows reviewed close-no-action closure when citizen details remain missing", async () => {
    const c = await submitCase({
      text: "I need a business licence.",
      language: "en",
      location_text: "",
    });
    expect(c.missing_info.some((item) => item.required && !item.satisfied)).toBe(true);

    const reviewed = await postJson(
      reviewCaseRoute,
      "http://localhost/review",
      c.case_id,
      reviewBody(c, {
        citation_keys: [],
        resolution: "close_no_action",
        note: "The incomplete request is being closed without operational action.",
      }),
    );
    expect(reviewed.status).toBe(200);
    expect((await postJson(
      releaseReplyRoute,
      "http://localhost/reply",
      c.case_id,
      { triage_revision: 2, officer: "Officer Tan (demo)" },
    )).status).toBe(200);
    const closed = await postJson(
      setStatusRoute,
      "http://localhost/status",
      c.case_id,
      {
        triage_revision: 2,
        status: "closed",
        officer: "Officer Tan (demo)",
        note: "Closed without action because required information was not supplied.",
      },
    );
    expect(closed.status).toBe(200);
    expect((await closed.json()).status).toBe("closed");
  });

  it("requires a human welfare outcome before closure", async () => {
    const c = await submitCase({
      text: "Can I apply for education aid for my child?",
      language: "en",
      location_text: "Synthetic Neighbourhood",
    });
    await postJson(reviewCaseRoute, "http://localhost/review", c.case_id, reviewBody(c));
    await postJson(releaseReplyRoute, "http://localhost/reply", c.case_id, {
      triage_revision: 1,
      officer: "Officer Tan (demo)",
    });
    await postJson(setStatusRoute, "http://localhost/status", c.case_id, {
      triage_revision: 1,
      status: "in_progress",
      officer: "Officer Tan (demo)",
    });

    const blocked = await postJson(setStatusRoute, "http://localhost/status", c.case_id, {
      triage_revision: 1,
      status: "closed",
      officer: "Officer Tan (demo)",
      note: "Document review completed.",
    });
    expect(blocked.status).toBe(400);
    expect((await blocked.json()).error).toMatch(/welfare outcome/i);

    const outcomeReview = await postJson(
      reviewCaseRoute,
      "http://localhost/review",
      c.case_id,
      reviewBody(c, { welfare_outcome: "eligible" }),
    );
    expect(outcomeReview.status).toBe(200);
    expect((await outcomeReview.json()).status).toBe("in_progress");
    const closed = await postJson(setStatusRoute, "http://localhost/status", c.case_id, {
      triage_revision: 1,
      status: "closed",
      officer: "Officer Tan (demo)",
      note: "Human welfare review completed.",
    });
    expect(closed.status).toBe(200);
  });
});
