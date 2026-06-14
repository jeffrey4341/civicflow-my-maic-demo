/**
 * Policy corpus loader.
 *
 * Reads the synthetic markdown policies in data/policies, splits each document
 * into citable sections by its `##` headings, and tokenises the text for
 * retrieval. Results are cached for the process lifetime.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface PolicyChunk {
  source_doc: string; // filename, e.g. "drainage_response_sop.md"
  doc_title: string; // "Drainage Response SOP"
  section: string; // heading text
  text: string; // section body (without markdown noise)
  tokens: string[]; // lower-cased word tokens for scoring
}

const POLICY_DIR = join(process.cwd(), "data", "policies");

let CACHE: PolicyChunk[] | null = null;

/** Tokenise text into lower-cased word tokens. Keeps CJK characters as units. */
export function tokenize(text: string): string[] {
  const lower = text.toLowerCase();
  // Latin/number words
  const words: string[] = lower.match(/[a-z0-9À-ɏ]+/g) ?? [];
  // CJK characters (each ideograph is a meaningful unit for crude matching)
  const cjk: string[] = lower.match(/[一-鿿]/g) ?? [];
  // Tamil clusters
  const tamil: string[] = lower.match(/[஀-௿]+/g) ?? [];
  return [...words, ...cjk, ...tamil].filter((token) => token.length > 1 || cjk.includes(token));
}

function titleFromMarkdown(md: string, fallback: string): string {
  const m = md.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : fallback;
}

/** Strip markdown blockquotes/bold/table pipes to a readable snippet text. */
function cleanText(s: string): string {
  return s
    .replace(/^>.*$/gm, "") // drop blockquote disclaimer lines
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .replace(/\|/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitSections(md: string, sourceDoc: string, docTitle: string): PolicyChunk[] {
  const lines = md.split(/\r?\n/);
  const chunks: PolicyChunk[] = [];
  let current: { section: string; buf: string[] } = { section: "Overview", buf: [] };

  const flush = () => {
    const text = cleanText(current.buf.join("\n"));
    if (text.length > 0) {
      chunks.push({
        source_doc: sourceDoc,
        doc_title: docTitle,
        section: current.section,
        text,
        tokens: tokenize(`${current.section} ${text}`),
      });
    }
  };

  for (const line of lines) {
    const h2 = line.match(/^##\s+(.+)$/);
    if (h2) {
      flush();
      current = { section: h2[1].trim(), buf: [] };
    } else if (/^#\s+/.test(line)) {
      // top-level title — skip (already captured as docTitle)
    } else {
      current.buf.push(line);
    }
  }
  flush();
  return chunks;
}

/** Load and cache all policy chunks. */
export function loadPolicyChunks(): PolicyChunk[] {
  if (CACHE) return CACHE;
  const chunks: PolicyChunk[] = [];
  let files: string[] = [];
  try {
    files = readdirSync(POLICY_DIR).filter((f) => f.endsWith(".md"));
  } catch {
    files = [];
  }
  for (const file of files.sort()) {
    const md = readFileSync(join(POLICY_DIR, file), "utf8");
    const docTitle = titleFromMarkdown(md, file.replace(/\.md$/, ""));
    chunks.push(...splitSections(md, file, docTitle));
  }
  CACHE = chunks;
  return chunks;
}

/** Test/Dev helper: clear the cache so reloaded policies are re-read. */
export function clearPolicyCache(): void {
  CACHE = null;
}
