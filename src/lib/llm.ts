/**
 * Optional LLM adapter with a deterministic fallback.
 *
 * The demo runs FULLY OFFLINE: when no ANTHROPIC_API_KEY is set (the default for
 * judging), `isLlmConfigured()` is false and the deterministic engine is used.
 * When a key IS present, `llmRefineClassification` makes a single best-effort
 * call (via global fetch — no SDK dependency) and forces a strict JSON schema.
 * Any error, timeout, or schema violation falls back to deterministic output.
 *
 * Concept adapted (not copied) from the reference repo's deterministic provider
 * adapter: a stable fallback that needs no credentials.
 */

import type { CaseCategory, Language, Urgency } from "@/lib/types";
import { CASE_CATEGORIES } from "@/lib/types";

export function isLlmConfigured(): boolean {
  if (process.env.CIVICFLOW_FORCE_DETERMINISTIC === "1") return false;
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function resolvedModel(): string {
  return process.env.CIVICFLOW_LLM_MODEL || "claude-opus-4-8";
}

const VALID_URGENCY: Urgency[] = ["low", "normal", "high", "urgent", "flood_risk"];
const VALID_LANG: Language[] = ["ms", "en", "zh", "ta"];

export interface LlmRefinement {
  detected_language: Language;
  category: CaseCategory;
  urgency: Urgency;
  translated_text_en: string;
}

const SYSTEM_PROMPT = `You are a triage assistant for a Malaysian local-council citizen-service system.
Classify the citizen's message. Reply with STRICT JSON only, no prose, matching:
{
  "detected_language": one of ["ms","en","zh","ta"],
  "category": one of ["drainage","business_licensing","education_aid_welfare","roads_potholes","waste_management","streetlight","general_enquiry"],
  "urgency": one of ["low","normal","high","urgent","flood_risk"],
  "translated_text_en": a short English translation/summary of the message
}
Use "flood_risk" only when water is rising fast or entering premises. You only classify and translate; you do not decide eligibility, approve actions, or close cases.`;

export function validate(obj: unknown): LlmRefinement | null {
  if (!obj || typeof obj !== "object") return null;
  const o = obj as Record<string, unknown>;
  const lang = o.detected_language as Language;
  const cat = o.category as CaseCategory;
  const urg = o.urgency as Urgency;
  const en = o.translated_text_en;
  if (!VALID_LANG.includes(lang)) return null;
  if (!CASE_CATEGORIES.includes(cat)) return null;
  if (!VALID_URGENCY.includes(urg)) return null;
  if (typeof en !== "string" || en.length === 0) return null;
  return { detected_language: lang, category: cat, urgency: urg, translated_text_en: en.slice(0, 500) };
}

/**
 * Best-effort LLM refinement. Returns null (→ caller uses deterministic output)
 * whenever the LLM is not configured or anything goes wrong.
 */
export async function llmRefineClassification(text: string): Promise<LlmRefinement | null> {
  if (!isLlmConfigured()) return null;
  const apiKey = process.env.ANTHROPIC_API_KEY as string;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: resolvedModel(),
        max_tokens: 400,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: text }],
      }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    const raw = data.content?.find((c) => c.type === "text")?.text ?? "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return validate(JSON.parse(match[0]));
  } catch {
    return null; // deterministic fallback
  } finally {
    clearTimeout(timeout);
  }
}
