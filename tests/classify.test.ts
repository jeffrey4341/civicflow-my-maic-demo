import { describe, expect, it } from "vitest";
import { classifyCase, detectPiiRisk } from "@/lib/ai/classify";
import { detectLanguage } from "@/lib/ai/language";

describe("case classification", () => {
  it("classifies the Malay blocked-drain case as drainage with flood risk", () => {
    const text = "Longkang tersumbat dekat Jalan SS2, bila hujan air naik cepat.";
    const c = classifyCase(text);
    expect(c.category).toBe("drainage");
    expect(c.urgency).toBe("flood_risk");
    expect(c.category_confidence).toBeGreaterThan(0.5);
    expect(detectLanguage(text)).toBe("ms");
  });

  it("classifies the Chinese food-stall licence case as business licensing", () => {
    const text = "我要申请小食档执照，需要什么文件？";
    const c = classifyCase(text);
    expect(c.category).toBe("business_licensing");
    expect(detectLanguage(text)).toBe("zh");
  });

  it("classifies the English education-aid case as education/welfare", () => {
    const text = "Can I apply for education aid for my child?";
    const c = classifyCase(text);
    expect(c.category).toBe("education_aid_welfare");
    expect(c.urgency).toBe("normal");
    expect(detectLanguage(text)).toBe("en");
  });

  it("falls back to general_enquiry with low confidence when nothing matches", () => {
    const c = classifyCase("Hello, just saying hi.");
    expect(c.category).toBe("general_enquiry");
    expect(c.category_confidence).toBeLessThan(0.5);
  });

  it("flags PII risk when an identity number or phone is present", () => {
    expect(detectPiiRisk("My IC is 000000-00-0000")).toBe("high");
    expect(detectPiiRisk("Call me at 012-0000000")).toBe("high");
    expect(detectPiiRisk("The drain is blocked")).toBe("low");
  });
});
