/**
 * Deterministic language detection and English gloss.
 *
 * Detection uses script signals (CJK / Tamil unicode blocks) plus a Malay-vs-
 * English keyword heuristic. An optional LLM path would replace this, but the
 * demo always runs offline with these heuristics.
 */

import type { CaseCategory, Language } from "@/lib/types";

const MALAY_MARKERS = [
  "saya", "longkang", "hujan", "banjir", "tersumbat", "jalan", "lesen", "bila",
  "air", "naik", "dekat", "nak", "tolong", "boleh", "untuk", "dengan", "dan",
  "yang", "kami", "anak", "sekolah", "bantuan", "perniagaan", "makanan", "gerai",
  "penjaja", "permohonan", "dokumen", "cepat", "parit", "majlis", "rakyat",
  "tidak", "sudah", "sampah", "ada", "ini", "itu", "kepada", "lori", "hantar",
  "lebat", "kompound", "kutip", "berbau",
];

const ENGLISH_MARKERS = [
  "the", "is", "my", "can", "apply", "for", "drain", "please", "need", "what",
  "documents", "child", "education", "aid", "business", "licence", "license",
  "street", "road", "flood", "pothole", "rubbish", "garbage", "light",
];

function countMarkers(text: string, markers: string[]): number {
  const lower = ` ${text.toLowerCase()} `;
  let n = 0;
  for (const m of markers) {
    if (lower.includes(` ${m} `) || lower.includes(`${m},`) || lower.includes(`${m}.`)) n += 1;
  }
  return n;
}

/** Detect the citizen's language from free text. Defaults to English. */
export function detectLanguage(text: string): Language {
  if (/[一-鿿]/.test(text)) return "zh"; // CJK ideographs
  if (/[஀-௿]/.test(text)) return "ta"; // Tamil block

  const ms = countMarkers(text, MALAY_MARKERS);
  const en = countMarkers(text, ENGLISH_MARKERS);
  if (ms === 0 && en === 0) return "en";
  return ms > en ? "ms" : "en";
}

// A tiny synthetic translation memory for the canonical demo inputs so the
// English gloss reads naturally during a live demo. Everything else falls back
// to a labelled auto-summary (honest about being machine-generated).
const PHRASE_MEMORY: { match: RegExp; en: string }[] = [
  {
    match: /longkang\s+tersumbat.*hujan.*air\s+naik/i,
    en: "The drain is blocked near Jalan SS2; when it rains the water rises quickly.",
  },
  {
    match: /小食档.*执照|执照.*文件|申请.*执照/,
    en: "I want to apply for a food-stall licence — what documents do I need?",
  },
  {
    match: /education aid.*child|apply.*education aid/i,
    en: "Can I apply for education aid for my child?",
  },
];

const CATEGORY_GLOSS: Record<CaseCategory, string> = {
  drainage: "a drainage / flooding issue",
  business_licensing: "a business-licensing enquiry",
  education_aid_welfare: "an education-aid / welfare enquiry",
  roads_potholes: "a roads / pothole issue",
  waste_management: "a waste / cleanliness issue",
  streetlight: "a street-lighting issue",
  general_enquiry: "a general enquiry",
};

/**
 * Produce an English version of the request.
 * - English text is returned unchanged.
 * - Known demo phrases use the synthetic translation memory.
 * - Otherwise a labelled auto-summary is returned.
 */
export function translateToEnglish(
  text: string,
  language: Language,
  category: CaseCategory,
): string {
  if (language === "en") return text.trim();
  for (const p of PHRASE_MEMORY) {
    if (p.match.test(text)) return p.en;
  }
  return `[auto-summary from ${language}] Citizen reports ${CATEGORY_GLOSS[category]}.`;
}
