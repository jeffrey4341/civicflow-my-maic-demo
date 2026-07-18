import { describe, expect, it } from "vitest";
import { makeAuditEvent } from "@/lib/audit";
import { runTriage } from "@/lib/ai/pipeline";
import { listAudit, listCases, resetStore } from "@/lib/store";

describe("audit event creation", () => {
  it("creates a well-formed, timestamped audit event", () => {
    const e = makeAuditEvent({
      case_id: "case_1",
      actor: "ai_agent",
      event_type: "ai.classified",
      summary: "Classified.",
      payload: { category: "drainage" },
    });
    expect(e.event_id).toMatch(/^audit_/);
    expect(e.case_id).toBe("case_1");
    expect(e.actor).toBe("ai_agent");
    expect(e.actor_label).toBe("AI Triage Agent");
    expect(() => new Date(e.created_at).toISOString()).not.toThrow();
    expect(e.payload.category).toBe("drainage");
  });

  it("emits the full AI reasoning trail for a flood-risk case", async () => {
    const out = await runTriage({
      case_id: "case_flood",
      citizen_ref: "CF-TEST01",
      text: "Longkang tersumbat dekat Jalan SS2, bila hujan air naik cepat.",
      selected_language: "ms",
      location_text: "Jalan SS2",
    });
    const types = out.audit.map((e) => e.event_type);
    expect(types).toContain("ai.language_detected");
    expect(types).toContain("ai.classified");
    expect(types).toContain("rag.retrieved");
    expect(types).toContain("ai.routed");
    expect(types).toContain("approval.requested");
    expect(types).toContain("reply.drafted");
    expect(out.result.requires_supervisor).toBe(true);
    expect(out.status).toBe("awaiting_supervisor");
  });

  it.each([
    ["en", "This flood-risk request requires supervisor approval before council work can begin.", "will review it"],
    ["ms", "Permohonan berkaitan risiko banjir ini memerlukan kelulusan penyelia sebelum tindakan pihak majlis dapat dimulakan.", "akan menyemaknya"],
    ["zh", "这项涉及洪水风险的服务请求须经主管批准，市政部门方可开始处理。", "主管将优先审核"],
    ["ta", "வெள்ள அபாயம் தொடர்பான இந்தக் கோரிக்கைக்கு, நகராட்சி மன்றம் நடவடிக்கை எடுப்பதற்கு முன் மேற்பார்வையாளரின் ஒப்புதல் அவசியம்.", "மதிப்பாய்வு செய்வார்"],
  ] as const)("uses state-stable supervisor copy in %s", async (language, expected, stale) => {
    const out = await runTriage({
      case_id: `case_flood_${language}`,
      citizen_ref: `CF-${language.toUpperCase()}01`,
      text: "Longkang tersumbat dekat Jalan SS2, bila hujan air naik cepat.",
      selected_language: language,
      location_text: "Jalan SS2",
    });

    expect(out.result.reply_draft.body).toContain(expected);
    expect(out.result.reply_draft.body).not.toContain(stale);
  });

  it("drafts a reply grounded on a citation (every recommendation is cited)", async () => {
    const out = await runTriage({
      case_id: "case_lic",
      citizen_ref: "CF-TEST02",
      text: "我要申请小食档执照，需要什么文件？",
      selected_language: "zh",
      location_text: "",
    });
    expect(out.result.detected_language).toBe("zh");
    expect(out.result.reply_draft.language).toBe("zh");
    expect(out.result.citations.length).toBeGreaterThan(0);
    // Chinese reply includes the official bilingual term per spec.
    expect(out.result.reply_draft.body).toContain("business licence");
    expect(out.needsInfo).toBe(true); // location, business type, operating hours
  });

  it("records seeded human review and reply approval state in the audit trail", async () => {
    await resetStore();
    const cases = await listCases();
    const reviewed = cases.find(
      (record) => record.officer_review && record.reply_draft?.status === "approved",
    );
    expect(reviewed).toBeDefined();

    const audit = await listAudit(reviewed!.case_id);
    expect(audit.some((event) => event.event_type === "officer.reviewed")).toBe(true);
    expect(audit.some((event) => event.event_type === "reply.approved")).toBe(true);
  });
});
