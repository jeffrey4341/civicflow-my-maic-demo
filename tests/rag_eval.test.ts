import { describe, expect, it } from "vitest";
import { runTriage } from "@/lib/ai/pipeline";
import { retrievePolicies } from "@/lib/rag/retrieve";
import type { CaseCategory } from "@/lib/types";

const GOLDEN: { q: string; category: CaseCategory; accept: string[] }[] = [
  { q: "The drain is blocked and floods when it rains", category: "drainage", accept: ["drainage_response_sop.md"] },
  { q: "Storm water rising fast, flash flood near my house", category: "drainage", accept: ["drainage_response_sop.md"] },
  { q: "Water entering my shop during heavy rain, flooding", category: "drainage", accept: ["drainage_response_sop.md"] },
  { q: "What documents do I need for a food stall hawker licence", category: "business_licensing", accept: ["business_licensing_faq.md"] },
  { q: "How much is the business licence fee and the processing time", category: "business_licensing", accept: ["business_licensing_faq.md"] },
  { q: "Do I need a licence to operate a small business stall", category: "business_licensing", accept: ["business_licensing_faq.md"] },
  { q: "Can I apply for education aid for my child at school", category: "education_aid_welfare", accept: ["welfare_education_aid_policy.md"] },
  { q: "Am I eligible for welfare assistance, what income proof is needed", category: "education_aid_welfare", accept: ["welfare_education_aid_policy.md"] },
  { q: "There is a large pothole on the road that needs repair", category: "roads_potholes", accept: ["council_service_charter.md", "department_routing_rules.md"] },
  { q: "Rubbish has not been collected and garbage is piling up", category: "waste_management", accept: ["council_service_charter.md", "department_routing_rules.md"] },
  { q: "The street light is not working at night", category: "streetlight", accept: ["council_service_charter.md", "department_routing_rules.md"] },
  { q: "What are your service response time targets", category: "general_enquiry", accept: ["council_service_charter.md", "department_routing_rules.md"] },
];

describe("RAG retrieval accuracy (golden set)", () => {
  it("retrieves a top-1 policy doc within the acceptable set for >=80% of labelled queries", () => {
    let hits = 0;
    const misses: string[] = [];
    for (const g of GOLDEN) {
      const cites = retrievePolicies(g.q, { category: g.category });
      const top = cites[0]?.source_doc;
      if (top && g.accept.includes(top)) hits += 1;
      else misses.push(`${g.q} -> got ${top ?? "none"}, expected ${g.accept.join("|")}`);
    }
    const hitRate = hits / GOLDEN.length;
    if (hitRate < 0.8) console.error(`RAG top-1 hit-rate ${(hitRate * 100).toFixed(0)}%`, misses);
    expect(hitRate).toBeGreaterThanOrEqual(0.8);
  });

  it("returns NO citation for a genuinely off-topic query", () => {
    const cites = retrievePolicies("When is the next full moon and how do I bake sourdough bread", {
      category: "general_enquiry",
    });
    expect(cites).toHaveLength(0);
  });

  it("respects topK", () => {
    const one = retrievePolicies("drain blocked flooding rain", { category: "drainage", topK: 1 });
    expect(one.length).toBeLessThanOrEqual(1);
  });
});

describe("multilingual pipeline -> grounded citation", () => {
  it("Malay flood-risk drainage case cites the Drainage Response SOP", async () => {
    const out = await runTriage({
      case_id: "t_ms",
      citizen_ref: "CF-TEST-MS",
      text: "Longkang tersumbat dekat Jalan SS2, bila hujan air naik cepat.",
      selected_language: "ms",
      location_text: "Jalan SS2",
    });
    expect(out.result.detected_language).toBe("ms");
    expect(out.result.citations[0]?.source_doc).toBe("drainage_response_sop.md");
  });

  it("Chinese food-stall licence case cites the Business Licensing FAQ", async () => {
    const out = await runTriage({
      case_id: "t_zh",
      citizen_ref: "CF-TEST-ZH",
      text: "我要申请小食档执照，需要什么文件？",
      selected_language: "zh",
      location_text: "",
    });
    expect(out.result.detected_language).toBe("zh");
    expect(out.result.citations.map((c) => c.source_doc)).toContain("business_licensing_faq.md");
  });

  it("Tamil drainage case is detected as Tamil and drafts a Tamil reply", async () => {
    const out = await runTriage({
      case_id: "t_ta",
      citizen_ref: "CF-TEST-TA",
      text: "வடிகால் அடைபட்டு மழை பெய்தால் வெள்ளம் வருகிறது.",
      selected_language: "ta",
      location_text: "",
    });
    expect(out.result.detected_language).toBe("ta");
    expect(out.result.reply_draft.language).toBe("ta");
    expect(out.result.reply_draft.body).toContain("நன்றி");
  });
});
