/**
 * Missing-information detection.
 *
 * For each category we declare the fields the council needs. A *required* unmet
 * field puts the case into `needs_info` (the citizen sees a clarification
 * screen). *Optional* fields (e.g. the welfare document checklist) are surfaced
 * but do not block submission — they appear in the citizen reply.
 */

import type { CaseCategory, Language, MissingInfoItem } from "@/lib/types";

type Questions = Record<Language, string>;

interface FieldSpec {
  field: string;
  label: string;
  required: boolean;
  questions: Questions;
  satisfied: (text: string, location: string) => boolean;
}

function hasLocation(text: string, location: string): boolean {
  if (location.trim().length > 0) return true;
  return /jalan|lorong|taman|street|road|\bnear\b|dekat|seksyen|section|ss\s?\d|路|街|区|附近/i.test(
    text,
  );
}

const hasBusinessType = (text: string): boolean =>
  /(cooked food|nasi|mee|drinks|beverage|minuman|retail|runcit|grocery|kedai|clothes|pakaian|熟食|饮料|杂货|零售|服装)/i.test(
    text,
  );

const hasOperatingHours = (text: string): boolean =>
  /(\d{1,2}\s?(am|pm))|(\d{1,2}[:.]\d{2})|pagi|petang|malam|\bjam\b|operating hours|waktu operasi|营业时间|\d{1,2}\s?点|\d{1,2}\s?时/i.test(
    text,
  );

const never = (): boolean => false;

const LOCATION_FIELD: FieldSpec = {
  field: "location",
  label: "Location",
  required: true,
  questions: {
    en: "Where exactly is this (address or nearest landmark)?",
    ms: "Di manakah lokasi tepatnya (alamat atau mercu tanda berhampiran)?",
    zh: "具体位置在哪里（地址或最近的地标）？",
    ta: "இது சரியாக எங்கே (முகவரி அல்லது அருகிலுள்ள அடையாளம்)?",
  },
  satisfied: (text, location) => hasLocation(text, location),
};

const CATEGORY_FIELDS: Record<CaseCategory, FieldSpec[]> = {
  drainage: [
    LOCATION_FIELD,
    {
      field: "water_enters_building",
      label: "Water entering premises?",
      required: false,
      questions: {
        en: "Does the water enter any home or shop?",
        ms: "Adakah air masuk ke mana-mana rumah atau kedai?",
        zh: "积水是否进入任何住家或店铺？",
        ta: "தண்ணீர் ஏதேனும் வீடு அல்லது கடைக்குள் நுழைகிறதா?",
      },
      satisfied: never,
    },
    {
      field: "worst_time",
      label: "When is it worst?",
      required: false,
      questions: {
        en: "When is it worst (for example, during heavy rain)?",
        ms: "Bila keadaan paling teruk (contohnya semasa hujan lebat)?",
        zh: "什么时候最严重（例如大雨时）？",
        ta: "எப்போது மிக மோசமாக உள்ளது (எ.கா. கனமழையின் போது)?",
      },
      satisfied: never,
    },
  ],
  business_licensing: [
    {
      field: "location",
      label: "Business location",
      required: true,
      questions: {
        en: "Where will the business operate (address or area)?",
        ms: "Di manakah perniagaan akan beroperasi (alamat atau kawasan)?",
        zh: "您的生意将在何处经营（地址或地区）？",
        ta: "உங்கள் வணிகம் எங்கு இயங்கும் (முகவரி அல்லது பகுதி)?",
      },
      satisfied: (text, location) => hasLocation(text, location),
    },
    {
      field: "business_type",
      label: "Business type",
      required: true,
      questions: {
        en: "What type of business is it (e.g. cooked food, drinks, retail)?",
        ms: "Apakah jenis perniagaan (cth. makanan dimasak, minuman, runcit)?",
        zh: "这是什么类型的生意（例如熟食、饮料、零售）？",
        ta: "இது எந்த வகை வணிகம் (எ.கா. சமைத்த உணவு, பானங்கள், சில்லறை)?",
      },
      satisfied: (text) => hasBusinessType(text),
    },
    {
      field: "operating_hours",
      label: "Operating hours",
      required: true,
      questions: {
        en: "What are your intended operating hours?",
        ms: "Apakah waktu operasi yang dicadangkan?",
        zh: "您打算的营业时间是？",
        ta: "உங்கள் இயக்க நேரம் என்ன?",
      },
      satisfied: (text) => hasOperatingHours(text),
    },
  ],
  education_aid_welfare: [
    {
      field: "child_birth_cert",
      label: "Child's birth certificate",
      required: false,
      questions: {
        en: "Please prepare the child's birth certificate (do not upload real documents in this demo).",
        ms: "Sila sediakan sijil kelahiran anak (jangan muat naik dokumen sebenar dalam demo ini).",
        zh: "请准备孩子的出生证明（本演示请勿上传真实文件）。",
        ta: "குழந்தையின் பிறப்புச் சான்றிதழைத் தயார் செய்யவும் (இந்த டெமோவில் உண்மையான ஆவணங்களைப் பதிவேற்ற வேண்டாம்).",
      },
      satisfied: never,
    },
    {
      field: "school_enrolment",
      label: "Proof of school enrolment",
      required: false,
      questions: {
        en: "Please prepare proof of the child's current school enrolment.",
        ms: "Sila sediakan bukti pendaftaran sekolah semasa anak.",
        zh: "请准备孩子本年度的在学证明。",
        ta: "குழந்தையின் தற்போதைய பள்ளி சேர்க்கை சான்றைத் தயார் செய்யவும்.",
      },
      satisfied: never,
    },
    {
      field: "income_proof",
      label: "Household income evidence",
      required: false,
      questions: {
        en: "Please prepare household income evidence (e.g. payslip or income declaration).",
        ms: "Sila sediakan bukti pendapatan isi rumah (cth. slip gaji atau pengisytiharan pendapatan).",
        zh: "请准备家庭收入证明（例如薪资单或收入声明）。",
        ta: "வீட்டு வருமான ஆதாரத்தைத் தயார் செய்யவும் (எ.கா. சம்பளச் சீட்டு அல்லது வருமான அறிக்கை).",
      },
      satisfied: never,
    },
  ],
  roads_potholes: [LOCATION_FIELD],
  waste_management: [LOCATION_FIELD],
  streetlight: [LOCATION_FIELD],
  general_enquiry: [],
};

/** Detect missing info for a case. Returns localized clarifying questions. */
export function detectMissingInfo(
  category: CaseCategory,
  text: string,
  location: string,
  language: Language,
): MissingInfoItem[] {
  const specs = CATEGORY_FIELDS[category] ?? [];
  return specs.map((spec) => {
    const satisfied = spec.satisfied(text, location);
    return {
      field: spec.field,
      label: spec.label,
      question_en: spec.questions.en,
      question_localized: spec.questions[language] ?? spec.questions.en,
      required: spec.required,
      satisfied,
    };
  });
}

/** True when the case is blocked on a required, unmet field. */
export function hasBlockingGaps(items: MissingInfoItem[]): boolean {
  return items.some((i) => i.required && !i.satisfied);
}
