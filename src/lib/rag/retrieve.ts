/**
 * Hybrid policy retrieval (keyword + lightweight TF-IDF "embedding stub").
 *
 * No external embedding service is required: we build a TF-IDF vector for the
 * query and each policy chunk and rank by cosine similarity, blended with a
 * direct keyword-overlap signal and an optional category document boost. This is
 * deterministic and runs fully offline, satisfying "every recommendation has a
 * citation or a manual-review fallback".
 */

import type { CaseCategory, PolicyCitation } from "@/lib/types";
import { clamp, round2 } from "@/lib/util";
import { loadPolicyChunks, tokenize, type PolicyChunk } from "@/lib/rag/policies";

/** Category -> policy documents that should be preferred for that category. */
const CATEGORY_DOCS: Record<CaseCategory, string[]> = {
  drainage: ["drainage_response_sop.md", "department_routing_rules.md"],
  business_licensing: ["business_licensing_faq.md", "department_routing_rules.md"],
  education_aid_welfare: ["welfare_education_aid_policy.md", "department_routing_rules.md"],
  roads_potholes: ["council_service_charter.md", "department_routing_rules.md"],
  waste_management: ["council_service_charter.md", "department_routing_rules.md"],
  streetlight: ["council_service_charter.md", "department_routing_rules.md"],
  general_enquiry: ["council_service_charter.md", "department_routing_rules.md"],
};

interface Idf {
  map: Map<string, number>;
  total: number;
}

let IDF: Idf | null = null;

function buildIdf(chunks: PolicyChunk[]): Idf {
  const df = new Map<string, number>();
  for (const chunk of chunks) {
    for (const term of new Set(chunk.tokens)) {
      df.set(term, (df.get(term) ?? 0) + 1);
    }
  }
  const total = chunks.length || 1;
  const map = new Map<string, number>();
  for (const [term, freq] of df) {
    map.set(term, Math.log((total + 1) / (freq + 1)) + 1);
  }
  return { map, total };
}

function idfFor(chunks: PolicyChunk[]): Idf {
  if (!IDF || IDF.total !== chunks.length) IDF = buildIdf(chunks);
  return IDF;
}

function tfMap(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
  return tf;
}

function tfidfVector(tokens: string[], idf: Idf): Map<string, number> {
  const tf = tfMap(tokens);
  const vec = new Map<string, number>();
  for (const [term, count] of tf) {
    vec.set(term, count * (idf.map.get(term) ?? Math.log(idf.total + 1)));
  }
  return vec;
}

function cosine(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  for (const [term, w] of a) {
    const bw = b.get(term);
    if (bw) dot += w * bw;
  }
  let na = 0;
  for (const w of a.values()) na += w * w;
  let nb = 0;
  for (const w of b.values()) nb += w * w;
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/** Pick the most query-relevant sentence as the citation snippet. */
function bestSnippet(text: string, queryTokens: Set<string>): string {
  const sentences = text.split(/(?<=[.!?。])\s+/).filter((s) => s.trim().length > 0);
  let best = sentences[0] ?? text;
  let bestScore = -1;
  for (const s of sentences) {
    const toks = new Set(tokenize(s));
    let score = 0;
    for (const q of queryTokens) if (toks.has(q)) score += 1;
    if (score > bestScore) {
      bestScore = score;
      best = s;
    }
  }
  const trimmed = best.trim();
  return trimmed.length > 220 ? `${trimmed.slice(0, 217)}…` : trimmed;
}

export interface RetrieveOptions {
  category?: CaseCategory;
  /** Extra keyword hints (e.g. category synonyms) to strengthen the query. */
  hints?: string[];
  topK?: number;
  /** Minimum confidence to include a citation. */
  minConfidence?: number;
}

/**
 * Retrieve the best policy citations for a query.
 * Returns at most `topK` citations sorted by confidence (highest first).
 */
export function retrievePolicies(
  query: string,
  opts: RetrieveOptions = {},
): PolicyCitation[] {
  const { category, hints = [], topK = 3, minConfidence = 0.3 } = opts;
  const chunks = loadPolicyChunks();
  if (chunks.length === 0) return [];

  const idf = idfFor(chunks);
  const queryTokens = tokenize(`${query} ${hints.join(" ")}`);
  const querySet = new Set(queryTokens);
  const qVec = tfidfVector(queryTokens, idf);
  const preferred = category ? new Set(CATEGORY_DOCS[category]) : new Set<string>();

  const scored = chunks.map((chunk) => {
    const cVec = tfidfVector(chunk.tokens, idf);
    const sim = cosine(qVec, cVec);

    // Direct keyword overlap as a second signal.
    let overlap = 0;
    const chunkSet = new Set(chunk.tokens);
    for (const q of querySet) if (chunkSet.has(q)) overlap += 1;
    const overlapScore = overlap / Math.max(6, querySet.size);

    const docBoost = preferred.has(chunk.source_doc) ? 0.15 : 0;
    const raw = 0.6 * sim + 0.4 * overlapScore + docBoost;
    const confidence = round2(clamp(raw, 0, 1));

    return { chunk, confidence };
  });

  scored.sort((a, b) => b.confidence - a.confidence);

  const out: PolicyCitation[] = [];
  for (const { chunk, confidence } of scored) {
    if (confidence < minConfidence) continue;
    out.push({
      source_doc: chunk.source_doc,
      doc_title: chunk.doc_title,
      section: chunk.section,
      snippet: bestSnippet(chunk.text, querySet),
      confidence,
    });
    if (out.length >= topK) break;
  }
  return out;
}
