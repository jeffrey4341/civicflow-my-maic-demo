import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST as previewTriage } from "@/app/api/triage/route";
import { POST as createCase } from "@/app/api/cases/route";
import * as caseRoute from "@/app/api/cases/[id]/route";
import { getCase, listApprovals, listAudit, listCases, resetStore, submitCase } from "@/lib/store";
import * as util from "@/lib/util";

const LICENCE_TEXT = "我要申请小食档执照，需要什么文件？";

describe("citizen details and triage revisions", () => {
  beforeEach(async () => {
    await resetStore();
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

    const previewLocation = await previewTriage(
      new Request("http://localhost/api/triage", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          text: "A blocked drain needs attention",
          language: "en",
          location_text: "person@example.com",
        }),
      }),
    );
    expect(previewLocation.status).toBe(422);

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

    const createMedia = await createCase(
      new Request("http://localhost/api/cases", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          text: "A blocked drain needs attention",
          language: "en",
          location_text: "Synthetic lane",
          media_refs: ["photo:person@example.com.jpg"],
        }),
      }),
    );
    expect(createMedia.status).toBe(422);
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

  it("rejects realistic personal names at the preview boundary", async () => {
    for (const name of ["Ahmad bin Ali", "Nur Aisyah binti Rahman", "Ahmad Bin Ali", "John Smith"]) {
      const response = await previewTriage(
        new Request("http://localhost/api/triage", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            text: `My name is ${name}. A blocked drain needs attention.`,
            language: "en",
          }),
        }),
      );

      expect(response.status).toBe(422);
      expect(await response.json()).toMatchObject({ code: "synthetic_data_only" });
    }
  });

  it("rejects realistic street addresses while keeping documented demo locations", async () => {
    for (const location_text of ["12 Jalan Ampang Kuala Lumpur"]) {
      const realAddress = await previewTriage(
        new Request("http://localhost/api/triage", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            text: "A blocked drain needs attention.",
            language: "en",
            location_text,
          }),
        }),
      );
      expect(realAddress.status).toBe(422);
      expect(await realAddress.json()).toMatchObject({ code: "synthetic_data_only" });
    }

    for (const location_text of ["Jalan SS2", "Taman Demo, Jalan Demo 9", "Synthetic Market A"]) {
      const response = await previewTriage(
        new Request("http://localhost/api/triage", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            text: "A blocked drain needs attention.",
            language: "en",
            location_text,
          }),
        }),
      );

      expect(response.status).toBe(200);
    }
  });

  it("does not mistake ordinary Malay road and lane reports for personal addresses", async () => {
    for (const text of [
      "Jalan rosak dan berlubang dekat sekolah.",
      "Lampu rosak di lorong belakang.",
    ]) {
      const response = await previewTriage(
        new Request("http://localhost/api/triage", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text, language: "ms" }),
        }),
      );
      expect(response.status).toBe(200);
    }
  });

  it("keeps a structured answer as the canonical case location through the create route", async () => {
    const response = await createCase(
      new Request("http://localhost/api/cases", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          text: "I need a business licence for a hawker stall",
          language: "en",
          answers: {
            location: "Synthetic Market A",
            business_type: "Synthetic food stall",
            operating_hours: "09:00 to 17:00",
          },
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect((await response.json()).location_text).toBe("Synthetic Market A");
  });

  it("allows only one concurrent follow-up for the same triage revision", async () => {
    const created = await submitCase({ text: LICENCE_TEXT, language: "zh" });
    const body = JSON.stringify({
      triage_revision: created.triage_revision,
      answers: {
        location: "Synthetic Market A",
        business_type: "Synthetic food stall",
        operating_hours: "09:00 to 17:00",
      },
    });
    const patch = () => caseRoute.PATCH!(
      new Request(`http://localhost/api/cases/${created.citizen_ref}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body,
      }),
      { params: Promise.resolve({ id: created.citizen_ref }) },
    );

    const responses = await Promise.all([patch(), patch()]);
    expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
    expect((await getCase(created.case_id))?.triage_revision).toBe(2);
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
    expect((await listAudit(created.case_id)).some((event) => event.event_type === "approval.requested"))
      .toBe(false);

    let clock = Date.parse("2099-01-01T00:00:00.000Z");
    vi.spyOn(util, "nowIso").mockImplementation(() => new Date(clock++).toISOString());

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

    const audit = await listAudit(created.case_id);
    const detailsIndex = audit.findIndex((event) => event.event_type === "citizen.details_submitted");
    const retriageIndex = audit.findLastIndex((event) => event.event_type === "ai.language_detected");
    expect(detailsIndex).toBeGreaterThan(-1);
    expect(detailsIndex).toBeLessThan(retriageIndex);
    expect(audit.filter((event) => event.event_type === "approval.requested")).toHaveLength(1);
  });
});
