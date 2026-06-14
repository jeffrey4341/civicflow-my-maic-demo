import { NextResponse } from "next/server";
import { retrievePolicies } from "@/lib/rag/retrieve";
import { CASE_CATEGORIES, type CaseCategory } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Policy/SOP search used by the officer SOP-citation panel. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  if (!q.trim()) return NextResponse.json([]);
  const cat = url.searchParams.get("category") as CaseCategory | null;
  const category = cat && CASE_CATEGORIES.includes(cat) ? cat : undefined;
  return NextResponse.json(retrievePolicies(q, { category, topK: 4, minConfidence: 0.2 }));
}
