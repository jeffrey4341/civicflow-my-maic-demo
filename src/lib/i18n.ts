/**
 * Lightweight i18n for the citizen-facing mobile app.
 *
 * Pattern adapted (concept only) from the reference repo's t(key, vars, locale)
 * approach: simple string lookup with {var} interpolation and an English fallback.
 * The officer console is intentionally English-only (staff tool); the four
 * citizen languages are ms / en / zh / ta.
 */

import type {
  CaseCategory,
  CaseStatus,
  Language,
  Urgency,
} from "@/lib/types";

export const LANGUAGE_NAMES: Record<Language, string> = {
  ms: "Bahasa Melayu",
  en: "English",
  zh: "中文",
  ta: "தமிழ்",
};

type Dict = Record<string, string>;

const en: Dict = {
  "app.title": "CivicFlow MY",
  "app.tagline": "Citizen services, in your language.",
  "common.synthetic_banner": "Demo system — all data is synthetic. Do not enter real personal details.",
  "common.ai_disclaimer": "Replies are AI-drafted and reviewed by a council officer before they are sent.",
  "common.back": "Back",
  "common.next": "Continue",
  "common.powered": "A MAIC T5 Public Services & Smart Cities demo",
  "landing.subtitle": "Report an issue or ask a question. Choose your language to begin.",
  "landing.choose_language": "Choose your language",
  "landing.continue": "Continue",
  "submit.title": "What can we help you with?",
  "submit.prompt_label": "Describe your request",
  "submit.placeholder": "e.g. The drain on my street is blocked and floods when it rains.",
  "submit.hint": "Write in your own words. Our assistant will detect the language and category.",
  "submit.examples_title": "Try an example",
  "submit.example_drain": "Blocked drain / flood risk",
  "submit.example_licence": "Business licence question",
  "submit.example_aid": "Education aid enquiry",
  "submit.analyse": "Analyse my request",
  "media.title": "Add a photo or location (optional)",
  "media.intro": "Attachments help officers act faster. This demo uses mock attachments only.",
  "media.add_photo": "Attach mock photo",
  "media.add_location": "Share mock location",
  "media.photo_added": "Mock photo attached",
  "media.location_added": "Mock location attached",
  "media.note": "No real photos or GPS are captured in this demo.",
  "clarify.title": "A few more details",
  "clarify.intro": "Our assistant needs this information to route your case correctly.",
  "clarify.optional": "You can skip and submit now — an officer will follow up.",
  "clarify.submit": "Submit case",
  "created.title": "Case submitted",
  "created.intro": "Thank you. Your case has been recorded and routed.",
  "created.ref_label": "Your tracking code",
  "created.detected_lang": "Detected language",
  "created.category": "Category",
  "created.department": "Routed to",
  "created.urgency": "Urgency",
  "created.view_status": "View case status",
  "created.approval_note": "This case needs supervisor approval before action — a human will review it.",
  "status.title": "Case status",
  "status.timeline": "Progress",
  "status.track_label": "Tracking code",
  "status.reply_ready": "A reply is ready",
  "status.reply_pending": "An officer is preparing your reply.",
  "status.view_reply": "Read the reply",
  "status.missing_title": "Information still needed",
  "reply.title": "Reply from the council",
  "reply.from": "From",
  "reply.disclaimer": "AI-drafted, reviewed by an officer. Cited from council policy.",
  "reply.citations": "Based on",
  "reply.back": "Back to status",
  "reply.not_ready": "Your reply is not ready yet. Please check back soon.",
};

const ms: Dict = {
  "app.title": "CivicFlow MY",
  "app.tagline": "Perkhidmatan rakyat, dalam bahasa anda.",
  "common.synthetic_banner": "Sistem demo — semua data adalah sintetik. Jangan masukkan butiran peribadi sebenar.",
  "common.ai_disclaimer": "Balasan dirangka oleh AI dan disemak oleh pegawai majlis sebelum dihantar.",
  "common.back": "Kembali",
  "common.next": "Teruskan",
  "common.powered": "Demo MAIC T5 Perkhidmatan Awam & Bandar Pintar",
  "landing.subtitle": "Laporkan masalah atau tanya soalan. Pilih bahasa untuk bermula.",
  "landing.choose_language": "Pilih bahasa anda",
  "landing.continue": "Teruskan",
  "submit.title": "Bagaimana kami boleh membantu?",
  "submit.prompt_label": "Terangkan permintaan anda",
  "submit.placeholder": "cth. Longkang di jalan saya tersumbat dan banjir bila hujan.",
  "submit.hint": "Tulis dalam perkataan anda sendiri. Pembantu kami akan mengesan bahasa dan kategori.",
  "submit.examples_title": "Cuba contoh",
  "submit.example_drain": "Longkang tersumbat / risiko banjir",
  "submit.example_licence": "Soalan lesen perniagaan",
  "submit.example_aid": "Pertanyaan bantuan pendidikan",
  "submit.analyse": "Analisa permintaan saya",
  "media.title": "Tambah foto atau lokasi (pilihan)",
  "media.intro": "Lampiran membantu pegawai bertindak lebih pantas. Demo ini menggunakan lampiran tiruan sahaja.",
  "media.add_photo": "Lampirkan foto tiruan",
  "media.add_location": "Kongsi lokasi tiruan",
  "media.photo_added": "Foto tiruan dilampirkan",
  "media.location_added": "Lokasi tiruan dilampirkan",
  "media.note": "Tiada foto atau GPS sebenar dirakam dalam demo ini.",
  "clarify.title": "Beberapa butiran lagi",
  "clarify.intro": "Pembantu kami memerlukan maklumat ini untuk menghala kes anda dengan betul.",
  "clarify.optional": "Anda boleh langkau dan hantar sekarang — pegawai akan susuli.",
  "clarify.submit": "Hantar kes",
  "created.title": "Kes dihantar",
  "created.intro": "Terima kasih. Kes anda telah direkodkan dan dihala.",
  "created.ref_label": "Kod penjejakan anda",
  "created.detected_lang": "Bahasa dikesan",
  "created.category": "Kategori",
  "created.department": "Dihala ke",
  "created.urgency": "Tahap segera",
  "created.view_status": "Lihat status kes",
  "created.approval_note": "Kes ini memerlukan kelulusan penyelia sebelum tindakan — seorang manusia akan menyemaknya.",
  "status.title": "Status kes",
  "status.timeline": "Kemajuan",
  "status.track_label": "Kod penjejakan",
  "status.reply_ready": "Balasan telah sedia",
  "status.reply_pending": "Pegawai sedang menyediakan balasan anda.",
  "status.view_reply": "Baca balasan",
  "status.missing_title": "Maklumat masih diperlukan",
  "reply.title": "Balasan daripada majlis",
  "reply.from": "Daripada",
  "reply.disclaimer": "Dirangka AI, disemak oleh pegawai. Dipetik daripada dasar majlis.",
  "reply.citations": "Berdasarkan",
  "reply.back": "Kembali ke status",
  "reply.not_ready": "Balasan anda belum sedia. Sila semak semula sebentar lagi.",
};

const zh: Dict = {
  "app.title": "CivicFlow MY",
  "app.tagline": "市民服务，使用您的语言。",
  "common.synthetic_banner": "演示系统 — 所有数据均为合成数据。请勿输入真实个人资料。",
  "common.ai_disclaimer": "回复由 AI 起草，并在发送前由市议会官员审核。",
  "common.back": "返回",
  "common.next": "继续",
  "common.powered": "MAIC T5 公共服务与智慧城市演示",
  "landing.subtitle": "报告问题或提出疑问。请选择语言开始。",
  "landing.choose_language": "选择您的语言",
  "landing.continue": "继续",
  "submit.title": "我们能为您做什么？",
  "submit.prompt_label": "描述您的请求",
  "submit.placeholder": "例如：我家门前的沟渠堵塞，一下雨就淹水。",
  "submit.hint": "请用您自己的话描述。助手会自动检测语言和类别。",
  "submit.examples_title": "试试示例",
  "submit.example_drain": "沟渠堵塞 / 水灾风险",
  "submit.example_licence": "营业执照咨询",
  "submit.example_aid": "教育援助咨询",
  "submit.analyse": "分析我的请求",
  "media.title": "添加照片或位置（可选）",
  "media.intro": "附件有助于官员更快处理。本演示仅使用模拟附件。",
  "media.add_photo": "附加模拟照片",
  "media.add_location": "共享模拟位置",
  "media.photo_added": "已附加模拟照片",
  "media.location_added": "已附加模拟位置",
  "media.note": "本演示不采集真实照片或 GPS。",
  "clarify.title": "还需要一些信息",
  "clarify.intro": "助手需要这些信息以正确转介您的个案。",
  "clarify.optional": "您可以跳过并立即提交 — 官员将跟进。",
  "clarify.submit": "提交个案",
  "created.title": "个案已提交",
  "created.intro": "谢谢。您的个案已记录并转介。",
  "created.ref_label": "您的追踪编号",
  "created.detected_lang": "检测到的语言",
  "created.category": "类别",
  "created.department": "转介至",
  "created.urgency": "紧急程度",
  "created.view_status": "查看个案状态",
  "created.approval_note": "此个案在采取行动前需要主管批准 — 将由人工审核。",
  "status.title": "个案状态",
  "status.timeline": "进度",
  "status.track_label": "追踪编号",
  "status.reply_ready": "回复已就绪",
  "status.reply_pending": "官员正在准备您的回复。",
  "status.view_reply": "阅读回复",
  "status.missing_title": "仍需提供的信息",
  "reply.title": "市议会的回复",
  "reply.from": "来自",
  "reply.disclaimer": "AI 起草，官员审核。引用自市议会政策。",
  "reply.citations": "依据",
  "reply.back": "返回状态",
  "reply.not_ready": "您的回复尚未就绪，请稍后再查看。",
};

const ta: Dict = {
  "app.title": "CivicFlow MY",
  "app.tagline": "உங்கள் மொழியில் குடிமக்கள் சேவைகள்.",
  "common.synthetic_banner": "டெமோ அமைப்பு — அனைத்து தரவுகளும் செயற்கையானவை. உண்மையான தனிப்பட்ட விவரங்களை உள்ளிட வேண்டாம்.",
  "common.ai_disclaimer": "பதில்கள் AI ஆல் வரையப்பட்டு, அனுப்பும் முன் சபை அலுவலரால் சரிபார்க்கப்படுகின்றன.",
  "common.back": "பின்செல்",
  "common.next": "தொடரவும்",
  "common.powered": "MAIC T5 பொதுச் சேவைகள் & ஸ்மார்ட் நகர டெமோ",
  "landing.subtitle": "ஒரு பிரச்சினையைப் புகாரளிக்கவும் அல்லது கேள்வி கேட்கவும். தொடங்க உங்கள் மொழியைத் தேர்வுசெய்க.",
  "landing.choose_language": "உங்கள் மொழியைத் தேர்வுசெய்க",
  "landing.continue": "தொடரவும்",
  "submit.title": "நாங்கள் எவ்வாறு உதவலாம்?",
  "submit.prompt_label": "உங்கள் கோரிக்கையை விவரிக்கவும்",
  "submit.placeholder": "எ.கா. என் தெருவில் உள்ள வடிகால் அடைபட்டு மழை பெய்தால் வெள்ளம் வருகிறது.",
  "submit.hint": "உங்கள் சொந்த வார்த்தைகளில் எழுதுங்கள். எங்கள் உதவியாளர் மொழி மற்றும் வகையைக் கண்டறியும்.",
  "submit.examples_title": "ஒரு உதாரணத்தை முயற்சிக்கவும்",
  "submit.example_drain": "அடைபட்ட வடிகால் / வெள்ள அபாயம்",
  "submit.example_licence": "வணிக உரிமக் கேள்வி",
  "submit.example_aid": "கல்வி உதவி விசாரணை",
  "submit.analyse": "என் கோரிக்கையை பகுப்பாய்வு செய்",
  "media.title": "புகைப்படம் அல்லது இடத்தைச் சேர்க்கவும் (விருப்பத்தேர்வு)",
  "media.intro": "இணைப்புகள் அலுவலர்கள் விரைவாக செயல்பட உதவுகின்றன. இந்த டெமோ போலி இணைப்புகளை மட்டுமே பயன்படுத்துகிறது.",
  "media.add_photo": "போலி புகைப்படத்தை இணைக்கவும்",
  "media.add_location": "போலி இடத்தைப் பகிரவும்",
  "media.photo_added": "போலி புகைப்படம் இணைக்கப்பட்டது",
  "media.location_added": "போலி இடம் இணைக்கப்பட்டது",
  "media.note": "இந்த டெமோவில் உண்மையான புகைப்படங்கள் அல்லது GPS பதிவு செய்யப்படவில்லை.",
  "clarify.title": "இன்னும் சில விவரங்கள்",
  "clarify.intro": "உங்கள் வழக்கைச் சரியாக வழிநடத்த எங்கள் உதவியாளருக்கு இந்தத் தகவல் தேவை.",
  "clarify.optional": "நீங்கள் தவிர்த்து இப்போதே சமர்ப்பிக்கலாம் — ஒரு அலுவலர் தொடர்புகொள்வார்.",
  "clarify.submit": "வழக்கைச் சமர்ப்பிக்கவும்",
  "created.title": "வழக்கு சமர்ப்பிக்கப்பட்டது",
  "created.intro": "நன்றி. உங்கள் வழக்கு பதிவு செய்யப்பட்டு வழிநடத்தப்பட்டது.",
  "created.ref_label": "உங்கள் கண்காணிப்புக் குறியீடு",
  "created.detected_lang": "கண்டறியப்பட்ட மொழி",
  "created.category": "வகை",
  "created.department": "வழிநடத்தப்பட்டது",
  "created.urgency": "அவசரம்",
  "created.view_status": "வழக்கு நிலையைப் பார்க்கவும்",
  "created.approval_note": "இந்த வழக்குக்கு நடவடிக்கைக்கு முன் மேற்பார்வையாளர் ஒப்புதல் தேவை — ஒரு மனிதர் அதை மதிப்பாய்வு செய்வார்.",
  "status.title": "வழக்கு நிலை",
  "status.timeline": "முன்னேற்றம்",
  "status.track_label": "கண்காணிப்புக் குறியீடு",
  "status.reply_ready": "ஒரு பதில் தயாராக உள்ளது",
  "status.reply_pending": "ஒரு அலுவலர் உங்கள் பதிலைத் தயாரிக்கிறார்.",
  "status.view_reply": "பதிலைப் படிக்கவும்",
  "status.missing_title": "இன்னும் தேவையான தகவல்",
  "reply.title": "சபையின் பதில்",
  "reply.from": "அனுப்புநர்",
  "reply.disclaimer": "AI வரைவு, அலுவலரால் சரிபார்க்கப்பட்டது. சபைக் கொள்கையிலிருந்து மேற்கோள்.",
  "reply.citations": "அடிப்படையில்",
  "reply.back": "நிலைக்குத் திரும்பு",
  "reply.not_ready": "உங்கள் பதில் இன்னும் தயாராகவில்லை. சிறிது நேரத்தில் மீண்டும் பார்க்கவும்.",
};

const DICTS: Record<Language, Dict> = { en, ms, zh, ta };

/** Translate a key into `locale`, falling back to English, then the key itself. */
export function t(
  locale: Language,
  key: string,
  vars: Record<string, string | number> = {},
): string {
  const template = DICTS[locale]?.[key] ?? DICTS.en[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (_, name) =>
    name in vars ? String(vars[name]) : `{${name}}`,
  );
}

// ---------------------------------------------------------------------------
// Enum label helpers (citizen-facing, localized)
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<CaseCategory, Record<Language, string>> = {
  drainage: { en: "Drainage & flooding", ms: "Saliran & banjir", zh: "排水与水灾", ta: "வடிகால் & வெள்ளம்" },
  business_licensing: { en: "Business licensing", ms: "Pelesenan perniagaan", zh: "营业执照", ta: "வணிக உரிமம்" },
  education_aid_welfare: { en: "Education aid / welfare", ms: "Bantuan pendidikan / kebajikan", zh: "教育援助 / 福利", ta: "கல்வி உதவி / நலன்" },
  roads_potholes: { en: "Roads & potholes", ms: "Jalan & lubang jalan", zh: "道路与坑洞", ta: "சாலைகள் & பள்ளங்கள்" },
  waste_management: { en: "Waste & cleanliness", ms: "Sisa & kebersihan", zh: "垃圾与清洁", ta: "கழிவு & தூய்மை" },
  streetlight: { en: "Street lighting", ms: "Lampu jalan", zh: "街道照明", ta: "தெரு விளக்கு" },
  general_enquiry: { en: "General enquiry", ms: "Pertanyaan am", zh: "一般咨询", ta: "பொது விசாரணை" },
};

const URGENCY_LABELS: Record<Urgency, Record<Language, string>> = {
  low: { en: "Low", ms: "Rendah", zh: "低", ta: "குறைவு" },
  normal: { en: "Normal", ms: "Biasa", zh: "普通", ta: "சாதாரண" },
  high: { en: "High", ms: "Tinggi", zh: "高", ta: "உயர்" },
  urgent: { en: "Urgent", ms: "Segera", zh: "紧急", ta: "அவசரம்" },
  flood_risk: { en: "Flood-risk review", ms: "Semakan risiko banjir", zh: "水灾风险审查", ta: "வெள்ள அபாய மதிப்பாய்வு" },
};

const STATUS_LABELS: Record<CaseStatus, Record<Language, string>> = {
  draft: { en: "Draft", ms: "Draf", zh: "草稿", ta: "வரைவு" },
  needs_info: { en: "Needs information", ms: "Perlu maklumat", zh: "需要信息", ta: "தகவல் தேவை" },
  submitted: { en: "Submitted", ms: "Dihantar", zh: "已提交", ta: "சமர்ப்பிக்கப்பட்டது" },
  manual_review: { en: "Manual review", ms: "Semakan manual", zh: "人工审核", ta: "கைமுறை ஆய்வு" },
  routed: { en: "Routed to department", ms: "Dihala ke jabatan", zh: "已转介部门", ta: "துறைக்கு வழிநடத்தப்பட்டது" },
  awaiting_supervisor: { en: "Awaiting supervisor", ms: "Menunggu penyelia", zh: "等待主管", ta: "மேற்பார்வையாளர் காத்திருப்பு" },
  in_progress: { en: "In progress", ms: "Dalam tindakan", zh: "处理中", ta: "செயலில்" },
  closed: { en: "Closed", ms: "Selesai", zh: "已结案", ta: "மூடப்பட்டது" },
};

export function categoryLabel(c: CaseCategory, locale: Language = "en"): string {
  return CATEGORY_LABELS[c]?.[locale] ?? CATEGORY_LABELS[c]?.en ?? c;
}

export function urgencyLabel(u: Urgency, locale: Language = "en"): string {
  return URGENCY_LABELS[u]?.[locale] ?? URGENCY_LABELS[u]?.en ?? u;
}

export function statusLabel(s: CaseStatus, locale: Language = "en"): string {
  return STATUS_LABELS[s]?.[locale] ?? STATUS_LABELS[s]?.en ?? s;
}
