/** Small shared helpers: id/ref/time generation. Server-side only. */

import { randomUUID } from "node:crypto";

/** Stable-prefixed short id, e.g. "case_a1b2c3d4". */
export function newId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

const REF_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no ambiguous chars

/** Friendly citizen-facing tracking code, e.g. "CF-7K2M9Q". */
export function citizenRef(): string {
  let out = "";
  const bytes = randomUUID().replace(/-/g, "");
  for (let i = 0; i < 6; i += 1) {
    const n = parseInt(bytes.slice(i * 2, i * 2 + 2), 16);
    out += REF_ALPHABET[n % REF_ALPHABET.length];
  }
  return `CF-${out}`;
}

/** ISO timestamp (UTC). */
export function nowIso(): string {
  return new Date().toISOString();
}

/** Clamp a number into [min, max]. */
export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/** Round to 2 decimals (for confidence display). */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
