/**
 * Deterministic case classification: category, urgency and PII-risk.
 *
 * Uses weighted multilingual keyword matching. Strong, category-specific terms
 * outweigh shared/ambiguous terms (e.g. "jalan" appears in both a drainage and a
 * roads report, so it is weighted low). When nothing matches, the case falls
 * back to `general_enquiry` with low confidence, which triggers manual-review
 * routing downstream.
 */

import type { CaseCategory, PiiRisk, Urgency } from "@/lib/types";
import { clamp, round2 } from "@/lib/util";

interface Keyword {
  term: string;
  weight: number;
}

const k = (term: string, weight = 1): Keyword => ({ term, weight });

const CATEGORY_KEYWORDS: Record<CaseCategory, Keyword[]> = {
  drainage: [
    k("longkang", 3), k("tersumbat", 3), k("banjir", 3), k("parit", 2),
    k("drain", 3), k("drainage", 3), k("flood", 3), k("flooding", 3),
    k("hujan", 1.5), k("rain", 1.5), k("overflow", 2), k("monsoon", 1.5),
    k("沟渠", 3), k("排水", 3), k("水灾", 3), k("淹水", 3), k("堵塞", 2.5),
    k("வடிகால்", 3), k("வெள்ளம்", 3),
  ],
  business_licensing: [
    k("licence", 3), k("license", 3), k("lesen", 3), k("permit", 2),
    k("perniagaan", 2.5), k("business", 2), k("gerai", 3), k("hawker", 3),
    k("penjaja", 3), k("stall", 2.5), k("food stall", 3),
    k("执照", 3), k("营业", 2.5), k("小食档", 3), k("摊位", 2.5), k("申请", 1.2),
    k("உரிமம்", 3), k("வணிக", 2.5),
  ],
  education_aid_welfare: [
    k("education aid", 3), k("bantuan pendidikan", 3), k("welfare", 2.5),
    k("kebajikan", 2.5), k("scholarship", 2.5), k("biasiswa", 2.5),
    k("bantuan", 2), k("school", 1.5), k("sekolah", 1.5), k("student", 1.5),
    k("education", 1.8),
    k("教育", 2.5), k("援助", 2.5), k("福利", 2.5), k("助学金", 3), k("学费", 2),
    k("கல்வி", 2.5), k("உதவி", 2),
  ],
  roads_potholes: [
    k("pothole", 3), k("lubang", 2.5), k("jalan rosak", 3), k("road", 1.5),
    k("tar", 1.5), k("resurfacing", 2),
    k("坑洞", 3), k("道路", 1.5), k("路面", 2),
    k("பள்ளம்", 3), k("சாலை", 1.5),
  ],
  waste_management: [
    k("rubbish", 3), k("garbage", 3), k("sampah", 3), k("waste", 2),
    k("smelly", 1.5), k("longgokan", 2.5), k("cleansing", 2),
    k("垃圾", 3), k("清洁", 1.5),
    k("குப்பை", 3), k("கழிவு", 2),
  ],
  streetlight: [
    k("streetlight", 3), k("street light", 3), k("lampu jalan", 3),
    k("lampu", 2), k("gelap", 1.5), k("lighting", 2),
    k("路灯", 3), k("街灯", 3),
    k("தெரு விளக்கு", 3), k("விளக்கு", 2),
  ],
  general_enquiry: [],
};

const FLOOD_RISK_SIGNALS = [
  "air naik", "naik cepat", "naik dengan cepat", "rises quickly", "rise quickly",
  "rising fast", "water rises", "masuk rumah", "enter the house", "enters homes",
  "into my house", "flash flood", "banjir kilat", "涨水", "水位", "很快", "进屋",
  "进我家", "வேகமாக",
];

const BLOCK_SIGNALS = ["tersumbat", "blocked", "block", "堵塞", "阻塞", "அடைபட்ட"];

const HIGH_URGENCY_WORDS = [
  "urgent", "segera", "emergency", "kecemasan", "bahaya", "danger", "dangerous",
  "紧急", "危险", "அவசரம்",
];

function scoreCategory(text: string, keywords: Keyword[]): number {
  const lower = text.toLowerCase();
  let score = 0;
  for (const { term, weight } of keywords) {
    if (lower.includes(term.toLowerCase())) score += weight;
  }
  return score;
}

export interface Classification {
  category: CaseCategory;
  category_confidence: number;
  urgency: Urgency;
  pii_risk: PiiRisk;
  matched_terms: string[];
}

function classifyUrgency(text: string, category: CaseCategory): Urgency {
  const lower = text.toLowerCase();
  if (category === "drainage") {
    if (FLOOD_RISK_SIGNALS.some((s) => lower.includes(s))) return "flood_risk";
    if (BLOCK_SIGNALS.some((s) => lower.includes(s))) return "urgent";
    return "normal";
  }
  if (HIGH_URGENCY_WORDS.some((s) => lower.includes(s))) return "high";
  return "normal";
}

export function detectPiiRisk(text: string): PiiRisk {
  const nric = /\b\d{6}-\d{2}-\d{4}\b/;
  // Malaysian phone-shaped placeholders, e.g. 012-0000000, 03-00000000.
  const phone = /\b(?:\+?60|0)\d{1,2}[-\s]?\d{6,8}\b/;
  const email = /[\w.+-]+@[\w-]+\.[\w.-]+/;
  const longDigits = /\b\d{7,}\b/;
  const idWords = /\b(nric|mykad|no\.?\s?kp|i\/?c\s?no|ic number|telefon|phone no)\b/i;

  if (nric.test(text) || phone.test(text) || email.test(text)) return "high";
  if (longDigits.test(text) || idWords.test(text)) return "medium";
  return "low";
}

/** Classify free-text into category + urgency + PII-risk with a confidence. */
export function classifyCase(text: string): Classification {
  const scores: { category: CaseCategory; score: number }[] = (
    Object.keys(CATEGORY_KEYWORDS) as CaseCategory[]
  )
    .filter((c) => c !== "general_enquiry")
    .map((category) => ({ category, score: scoreCategory(text, CATEGORY_KEYWORDS[category]) }));

  scores.sort((a, b) => b.score - a.score);
  const top = scores[0];
  const second = scores[1] ?? { category: "general_enquiry" as CaseCategory, score: 0 };

  let category: CaseCategory;
  let confidence: number;
  if (!top || top.score === 0) {
    category = "general_enquiry";
    confidence = 0.2;
  } else {
    category = top.category;
    const margin = top.score - second.score;
    confidence = clamp(0.55 + 0.06 * top.score + 0.06 * margin, 0.5, 0.98);
  }

  const matched: string[] = [];
  if (category !== "general_enquiry") {
    const lower = text.toLowerCase();
    for (const { term } of CATEGORY_KEYWORDS[category]) {
      if (lower.includes(term.toLowerCase())) matched.push(term);
    }
  }

  return {
    category,
    category_confidence: round2(confidence),
    urgency: classifyUrgency(text, category),
    pii_risk: detectPiiRisk(text),
    matched_terms: matched.slice(0, 6),
  };
}
