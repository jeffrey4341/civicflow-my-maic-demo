import { describe, expect, it } from "vitest";
import { makeAuditEvent } from "@/lib/audit";
import { runTriage } from "@/lib/ai/pipeline";

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
});
