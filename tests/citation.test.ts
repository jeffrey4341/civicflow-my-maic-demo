import { describe, expect, it } from "vitest";
import { retrievePolicies } from "@/lib/rag/retrieve";

describe("citation retrieval (RAG)", () => {
  it("retrieves the Drainage Response SOP for a drainage query", () => {
    const cites = retrievePolicies("Longkang tersumbat, bila hujan air naik cepat dan banjir", {
      category: "drainage",
    });
    expect(cites.length).toBeGreaterThan(0);
    expect(cites[0].source_doc).toBe("drainage_response_sop.md");
    expect(cites[0].confidence).toBeGreaterThan(0);
    expect(cites[0].confidence).toBeLessThanOrEqual(1);
    expect(cites[0].snippet.length).toBeGreaterThan(0);
  });

  it("retrieves the Business Licensing FAQ for a licensing query", () => {
    const cites = retrievePolicies("food stall hawker licence lesen documents required", {
      category: "business_licensing",
    });
    const docs = cites.map((c) => c.source_doc);
    expect(docs).toContain("business_licensing_faq.md");
  });

  it("retrieves the Welfare Education Aid Policy for an education-aid query", () => {
    const cites = retrievePolicies("apply for education aid welfare for my child school", {
      category: "education_aid_welfare",
    });
    const docs = cites.map((c) => c.source_doc);
    expect(docs).toContain("welfare_education_aid_policy.md");
  });

  it("returns every citation with provenance and bounded confidence", () => {
    const cites = retrievePolicies("drain blocked flooding", { category: "drainage", topK: 3 });
    for (const c of cites) {
      expect(c.source_doc.endsWith(".md")).toBe(true);
      expect(c.section.length).toBeGreaterThan(0);
      expect(c.confidence).toBeGreaterThanOrEqual(0);
      expect(c.confidence).toBeLessThanOrEqual(1);
    }
  });
});
