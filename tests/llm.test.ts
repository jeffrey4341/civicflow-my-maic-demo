import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runTriage } from "@/lib/ai/pipeline";
import { isLlmConfigured, resolvedModel, validate } from "@/lib/llm";
import { MANUAL_REVIEW_LOW_CONFIDENCE_REASON } from "@/lib/lifecycle";

const GOOD = {
  detected_language: "ms",
  category: "drainage",
  urgency: "flood_risk",
  translated_text_en: "The drain is blocked.",
};

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

describe("llm.validate (strict schema, deterministic-fallback contract)", () => {
  it("accepts a well-formed refinement and normalises it", () => {
    const out = validate(GOOD);
    expect(out).not.toBeNull();
    expect(out).toEqual(GOOD);
  });

  it("rejects invalid enum values", () => {
    expect(validate({ ...GOOD, category: "not_a_category" })).toBeNull();
    expect(validate({ ...GOOD, detected_language: "fr" })).toBeNull();
    expect(validate({ ...GOOD, urgency: "panic" })).toBeNull();
  });

  it("rejects an empty or non-string translation", () => {
    expect(validate({ ...GOOD, translated_text_en: "" })).toBeNull();
    expect(validate({ ...GOOD, translated_text_en: 42 })).toBeNull();
  });

  it("rejects non-objects", () => {
    expect(validate(null)).toBeNull();
    expect(validate("string")).toBeNull();
    expect(validate(undefined)).toBeNull();
  });

  it("truncates an over-long translation to 500 chars", () => {
    const out = validate({ ...GOOD, translated_text_en: "x".repeat(1000) });
    expect(out?.translated_text_en.length).toBe(500);
  });
});

describe("llm config helpers", () => {
  const saved = {
    key: process.env.ANTHROPIC_API_KEY,
    force: process.env.CIVICFLOW_FORCE_DETERMINISTIC,
    model: process.env.CIVICFLOW_LLM_MODEL,
  };

  beforeEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.CIVICFLOW_FORCE_DETERMINISTIC;
    delete process.env.CIVICFLOW_LLM_MODEL;
  });

  afterEach(() => {
    restoreEnv("ANTHROPIC_API_KEY", saved.key);
    restoreEnv("CIVICFLOW_FORCE_DETERMINISTIC", saved.force);
    restoreEnv("CIVICFLOW_LLM_MODEL", saved.model);
  });

  it("is off with no key, on with a key", () => {
    expect(isLlmConfigured()).toBe(false);
    process.env.ANTHROPIC_API_KEY = "sk-test";
    expect(isLlmConfigured()).toBe(true);
  });

  it("honours CIVICFLOW_FORCE_DETERMINISTIC=1 even when a key is set", () => {
    process.env.ANTHROPIC_API_KEY = "sk-test";
    process.env.CIVICFLOW_FORCE_DETERMINISTIC = "1";
    expect(isLlmConfigured()).toBe(false);
  });

  it("defaults the model and respects an override", () => {
    expect(resolvedModel()).toBe("claude-opus-4-8");
    process.env.CIVICFLOW_LLM_MODEL = "claude-sonnet-4-6";
    expect(resolvedModel()).toBe("claude-sonnet-4-6");
  });
});

describe("LLM refinement parity", () => {
  const saved = {
    key: process.env.ANTHROPIC_API_KEY,
    force: process.env.CIVICFLOW_FORCE_DETERMINISTIC,
  };
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = "sk-test";
    delete process.env.CIVICFLOW_FORCE_DETERMINISTIC;
    global.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          content: [
            {
              type: "text",
              text: JSON.stringify({
                detected_language: "en",
                category: "business_licensing",
                urgency: "normal",
                translated_text_en: "food stall licence documents required",
              }),
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    ) as typeof fetch;
  });

  afterEach(() => {
    restoreEnv("ANTHROPIC_API_KEY", saved.key);
    restoreEnv("CIVICFLOW_FORCE_DETERMINISTIC", saved.force);
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("keeps deterministic low-confidence default-deny reachable when the LLM refines category", async () => {
    const out = await runTriage({
      case_id: "llm-low-confidence",
      citizen_ref: "CF-LLM-LOW",
      text: "Hello, I need help.",
      selected_language: "en",
      location_text: "",
    });

    expect(out.result.ai_mode).toBe("llm");
    expect(out.result.citations.map((c) => c.source_doc)).toContain("business_licensing_faq.md");
    expect(out.result.category_confidence).toBeLessThan(0.5);
    expect(out.result.manual_review_reason).toBe(MANUAL_REVIEW_LOW_CONFIDENCE_REASON);
    expect(out.status).toBe("manual_review");
  });
});
