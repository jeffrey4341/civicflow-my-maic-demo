import { describe, expect, it } from "vitest";
import { routeCase } from "@/lib/ai/routing";

describe("routing policy", () => {
  it("routes a flood-risk drainage case to Engineering / Drainage Unit and requires supervisor", () => {
    const r = routeCase({
      case_id: "c1",
      category: "drainage",
      urgency: "flood_risk",
      pii_risk: "low",
      category_confidence: 0.9,
    });
    expect(r.department).toBe("Engineering");
    expect(r.unit).toBe("Drainage Unit");
    expect(r.rule_id).toBe("RTE-DRN");
    expect(r.requires_supervisor).toBe(true);
  });

  it("routes business licensing to the Licensing Unit", () => {
    const r = routeCase({
      case_id: "c2",
      category: "business_licensing",
      urgency: "normal",
      pii_risk: "low",
      category_confidence: 0.8,
    });
    expect(r.department).toBe("Licensing");
    expect(r.unit).toBe("Licensing Unit");
    expect(r.rule_id).toBe("RTE-LIC");
    expect(r.requires_supervisor).toBe(false);
  });

  it("routes education aid to Community & Welfare without a supervisor gate", () => {
    const r = routeCase({
      case_id: "c3",
      category: "education_aid_welfare",
      urgency: "normal",
      pii_risk: "low",
      category_confidence: 0.85,
    });
    expect(r.department).toBe("Community & Welfare");
    expect(r.unit).toBe("Education Support Unit");
    expect(r.requires_supervisor).toBe(false);
  });

  it("falls back to Customer Service when confidence is low", () => {
    const r = routeCase({
      case_id: "c4",
      category: "drainage",
      urgency: "normal",
      pii_risk: "low",
      category_confidence: 0.3,
    });
    expect(r.department).toBe("Customer Service");
    expect(r.rule_id).toBe("RTE-GEN");
  });
});
