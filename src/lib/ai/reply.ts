/**
 * Multilingual citizen-reply drafter (deterministic).
 *
 * Composes a reply from localized, policy-grounded fragments. The draft is never
 * auto-sent: an officer reviews and releases it. Each draft carries the citation
 * it was grounded on (or, if none cleared the threshold, a manual-review note).
 */

import type {
  CaseCategory,
  CitizenReplyDraft,
  Language,
  MissingInfoItem,
  PolicyCitation,
} from "@/lib/types";
import { categoryLabel } from "@/lib/i18n";
import { nowIso } from "@/lib/util";

type Frag = Record<Language, string>;

const F: Record<string, Frag> = {
  greeting: {
    en: "Thank you for contacting Majlis Demo.",
    ms: "Terima kasih kerana menghubungi Majlis Demo.",
    zh: "感谢您联系示范市议会（Majlis Demo）。",
    ta: "மஜ்லிஸ் டெமோவைத் தொடர்பு கொண்டதற்கு நன்றி.",
  },
  ack: {
    en: "We have recorded your {category} request.",
    ms: "Kami telah merekodkan permintaan {category} anda.",
    zh: "我们已记录您的{category}请求。",
    ta: "உங்கள் {category} கோரிக்கையை நாங்கள் பதிவு செய்துள்ளோம்.",
  },
  routed: {
    en: "It has been routed to {department} – {unit}.",
    ms: "Ia telah dihala ke {department} – {unit}.",
    zh: "已转介至 {department} – {unit}。",
    ta: "இது {department} – {unit} க்கு வழிநடத்தப்பட்டது.",
  },
  ref: {
    en: "Your tracking code is {ref}.",
    ms: "Kod penjejakan anda ialah {ref}.",
    zh: "您的追踪编号是 {ref}。",
    ta: "உங்கள் கண்காணிப்புக் குறியீடு {ref}.",
  },
  cited: {
    en: "This guidance is based on our {doc} ({section}).",
    ms: "Panduan ini berdasarkan {doc} kami ({section}).",
    zh: "此说明依据我们的《{doc}》（{section}）。",
    ta: "இந்த வழிகாட்டுதல் எங்கள் {doc} ({section}) அடிப்படையில் அமைந்துள்ளது.",
  },
  manual_review: {
    en: "An officer will review this manually before any action is taken.",
    ms: "Seorang pegawai akan menyemak ini secara manual sebelum sebarang tindakan.",
    zh: "在采取任何行动之前，官员将人工审核此个案。",
    ta: "எந்த நடவடிக்கையும் எடுக்கும் முன் ஒரு அலுவலர் இதை கைமுறையாக மதிப்பாய்வு செய்வார்.",
  },
  need_info: {
    en: "To proceed, please tell us: {list}.",
    ms: "Untuk meneruskan, sila beritahu kami: {list}.",
    zh: "为继续处理，请告知我们：{list}。",
    ta: "தொடர, தயவுசெய்து எங்களிடம் தெரிவிக்கவும்: {list}.",
  },
  checklist: {
    en: "Please prepare these documents for officer review: {list}.",
    ms: "Sila sediakan dokumen ini untuk semakan pegawai: {list}.",
    zh: "请准备以下文件以供官员审核：{list}。",
    ta: "அலுவலர் மதிப்பாய்வுக்காக இந்த ஆவணங்களைத் தயார் செய்யவும்: {list}.",
  },
  supervisor: {
    en: "As this may involve flood risk, a supervisor will review it as a priority.",
    ms: "Memandangkan ini mungkin melibatkan risiko banjir, seorang penyelia akan menyemaknya sebagai keutamaan.",
    zh: "由于此个案可能涉及水灾风险，主管将优先审核。",
    ta: "இது வெள்ள அபாயத்தை உள்ளடக்கக்கூடும் என்பதால், ஒரு மேற்பார்வையாளர் இதை முன்னுரிமையாக மதிப்பாய்வு செய்வார்.",
  },
  eligibility: {
    en: "Eligibility is decided by a welfare officer after document review — this is not an automatic approval.",
    ms: "Kelayakan ditentukan oleh pegawai kebajikan selepas semakan dokumen — ini bukan kelulusan automatik.",
    zh: "资格由福利官员在审核文件后决定——这并非自动批准。",
    ta: "ஆவண மதிப்பாய்வுக்குப் பிறகு தகுதி நலன் அலுவலரால் தீர்மானிக்கப்படுகிறது — இது தானியங்கி ஒப்புதல் அல்ல.",
  },
  sla: {
    en: "We aim to respond {when}.",
    ms: "Kami menyasarkan untuk membalas {when}.",
    zh: "我们的目标是在{when}回复。",
    ta: "நாங்கள் {when} பதிலளிக்க இலக்கு வைத்துள்ளோம்.",
  },
  closing: {
    en: "We will keep you updated.",
    ms: "Kami akan memberi anda perkembangan terkini.",
    zh: "我们会及时通知您最新进展。",
    ta: "உங்களுக்கு தொடர்ந்து தகவல் தருவோம்.",
  },
  // Bilingual official-term hint inserted for licensing (per spec).
  licence_term: {
    en: "(official term: lesen perniagaan / business licence)",
    ms: "(istilah rasmi: lesen perniagaan / business licence)",
    zh: "（正式名称：lesen perniagaan／business licence）",
    ta: "(அதிகாரப்பூர்வ சொல்: lesen perniagaan / business licence)",
  },
};

function frag(name: string, lang: Language, vars: Record<string, string> = {}): string {
  const tmpl = F[name][lang] ?? F[name].en;
  return tmpl.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

function slaWhen(hours: number, lang: Language): string {
  if (hours <= 4) {
    return { en: "within a few hours as a priority", ms: "dalam beberapa jam sebagai keutamaan", zh: "几小时内（优先）", ta: "சில மணிநேரத்தில் முன்னுரிமையாக" }[lang];
  }
  const days = Math.max(1, Math.round(hours / 24));
  return {
    en: `within about ${days} working day(s)`,
    ms: `dalam kira-kira ${days} hari bekerja`,
    zh: `在约 ${days} 个工作日内`,
    ta: `சுமார் ${days} வேலை நாட்களுக்குள்`,
  }[lang];
}

export interface ReplyParams {
  case_id: string;
  language: Language;
  category: CaseCategory;
  citizen_ref: string;
  department: string;
  unit: string;
  citation: PolicyCitation | null;
  missingInfo: MissingInfoItem[];
  requires_supervisor: boolean;
  officer_review_only: boolean;
  manual_review_reason?: string | null;
  sla_hours: number;
}

function composeBody(p: ReplyParams, lang: Language): string {
  const parts: string[] = [];
  parts.push(frag("greeting", lang));

  const catText =
    categoryLabel(p.category, lang) +
    (p.category === "business_licensing" ? ` ${frag("licence_term", lang)}` : "");
  parts.push(frag("ack", lang, { category: catText }));
  parts.push(frag("routed", lang, { department: p.department, unit: p.unit }));

  if (p.citation) {
    parts.push(frag("cited", lang, { doc: p.citation.doc_title, section: p.citation.section }));
  } else {
    parts.push(frag("manual_review", lang));
  }
  if (p.manual_review_reason && p.citation) {
    parts.push(frag("manual_review", lang));
  }

  const blocking = p.missingInfo.filter((m) => m.required && !m.satisfied);
  const checklist = p.missingInfo.filter((m) => !m.required && !m.satisfied);

  if (blocking.length > 0) {
    const list = blocking.map((m) => m.question_localized.replace(/[.?]$/, "")).join("; ");
    parts.push(frag("need_info", lang, { list }));
  }
  if (p.category === "education_aid_welfare" && checklist.length > 0) {
    const list = checklist.map((m) => m.question_localized.replace(/\s*\(.*?\)\s*$/, "").replace(/[.?]$/, "")).join("; ");
    parts.push(frag("checklist", lang, { list }));
  }

  if (p.requires_supervisor) parts.push(frag("supervisor", lang));
  if (p.officer_review_only && p.category === "education_aid_welfare") parts.push(frag("eligibility", lang));

  parts.push(frag("sla", lang, { when: slaWhen(p.sla_hours, lang) }));
  parts.push(frag("ref", lang, { ref: p.citizen_ref }));
  parts.push(frag("closing", lang));

  return parts.join(" ");
}

/** Build a draft reply in the citizen's language plus an English reference. */
export function generateReplyDraft(p: ReplyParams): CitizenReplyDraft {
  return {
    case_id: p.case_id,
    language: p.language,
    body: composeBody(p, p.language),
    body_en: composeBody(p, "en"),
    citations: p.citation ? [p.citation] : [],
    status: "draft",
    drafted_by: "ai_agent",
    approved_by: null,
    created_at: nowIso(),
  };
}
