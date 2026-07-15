import { beforeEach, describe, expect, it } from "vitest";

import { POST as previewTriage } from "@/app/api/triage/route";
import { POST as createCase } from "@/app/api/cases/route";
import * as caseRoute from "@/app/api/cases/[id]/route";
import { getCase, listApprovals, listCases, resetStore, submitCase } from "@/lib/store";

const LICENCE_TEXT = "我要申请小食档执照，需要什么文件？";

describe("citizen details and triage revisions", () => {
  beforeEach(async () => {
    await resetStore();
  });

  it("uses keyed answers without rewriting the original citizen text", async () => {
    const created = await submitCase({
      text: LICENCE_TEXT,
      language: "zh",
      answers: {
        location: "示例地点 A",
        business_type: "示例类型 B",
        operating_hours: "示例时间 C",
      },
    });

    expect(created.original_text).toBe(LICENCE_TEXT);
    expect(created.citizen_answers).toEqual({
      location: "示例地点 A",
      business_type: "示例类型 B",
      operating_hours: "示例时间 C",
    });
    expect(created.missing_info.filter((item) => item.required && !item.satisfied)).toHaveLength(0);
    expect(created.status).not.toBe("needs_info");
    expect(created.triage_revision).toBe(1);
  });

  it("rejects stale follow-up revisions without changing the case", async () => {
    const created = await submitCase({ text: LICENCE_TEXT, language: "zh" });
    expect(created.status).toBe("needs_info");
    expect(typeof caseRoute.PATCH).toBe("function");

    const response = await caseRoute.PATCH!(
      new Request(`http://localhost/api/cases/${created.citizen_ref}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          triage_revision: 0,
          answers: {
            location: "示例地点 A",
            business_type: "示例类型 B",
            operating_hours: "示例时间 C",
          },
        }),
      }),
      { params: Promise.resolve({ id: created.citizen_ref }) },
    );

    expect(response.status).toBe(409);
    expect((await getCase(created.case_id))?.triage_revision).toBe(1);
  });

  it("rejects personal-data shaped input before preview, create, or follow-up persistence", async () => {
    const preview = await previewTriage(
      new Request("http://localhost/api/triage", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: "My NRIC is 000000-00-0000", language: "en" }),
      }),
    );
    expect(preview.status).toBe(422);
    expect(await preview.json()).toMatchObject({ code: "synthetic_data_only" });

    const before = (await listCases()).length;
    const create = await createCase(
      new Request("http://localhost/api/cases", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: "Email me at person@example.com", language: "en" }),
      }),
    );
    expect(create.status).toBe(422);
    expect((await listCases()).length).toBe(before);

    const needsInfo = await submitCase({ text: LICENCE_TEXT, language: "zh" });
    expect(typeof caseRoute.PATCH).toBe("function");
    const followUp = await caseRoute.PATCH!(
      new Request(`http://localhost/api/cases/${needsInfo.citizen_ref}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          triage_revision: needsInfo.triage_revision,
          answers: {
            location: "012-0000000",
            business_type: "示例类型 B",
            operating_hours: "示例时间 C",
          },
        }),
      }),
      { params: Promise.resolve({ id: needsInfo.citizen_ref }) },
    );
    expect(followUp.status).toBe(422);
    expect((await getCase(needsInfo.case_id))?.triage_revision).toBe(1);
  });

  it("keeps the confirmed citizen locale when detected language differs", async () => {
    const created = await submitCase({ text: LICENCE_TEXT, language: "ms" });

    expect(created.detected_language).toBe("zh");
    expect(created.citizen_language).toBe("ms");
    expect(created.reply_draft?.language).toBe("ms");
    expect(created.missing_info.find((item) => item.field === "location")?.question_localized)
      .toContain("Di manakah");
  });

  it("keeps high-risk cases in needs_info until details are complete", async () => {
    const created = await submitCase({
      text: "Longkang tersumbat, bila hujan air naik cepat.",
      language: "ms",
    });

    expect(created.urgency).toBe("flood_risk");
    expect(created.status).toBe("needs_info");
    expect(created.approval_task_id).toBeNull();
    expect((await listApprovals()).some((task) => task.case_id === created.case_id)).toBe(false);

    expect(typeof caseRoute.PATCH).toBe("function");
    const response = await caseRoute.PATCH!(
      new Request(`http://localhost/api/cases/${created.citizen_ref}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ triage_revision: 1, answers: { location: "Jalan Demo" } }),
      }),
      { params: Promise.resolve({ id: created.citizen_ref }) },
    );

    expect(response.status).toBe(200);
    const updated = await response.json();
    expect(updated.status).toBe("awaiting_supervisor");
    expect(updated.triage_revision).toBe(2);
    expect(updated.approval_task_id).toBeTruthy();
  });
});
