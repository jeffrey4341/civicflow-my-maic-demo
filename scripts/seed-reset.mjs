#!/usr/bin/env node
/**
 * Re-seed the running demo to a clean state.
 * Requires the dev server to be running (`npm run dev`).
 * Usage: npm run seed:reset   [CIVICFLOW_URL=http://localhost:3000]
 */
const base = process.env.CIVICFLOW_URL || "http://localhost:3000";

try {
  const res = await fetch(`${base}/api/reset`, { method: "POST" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  console.log(`✓ Demo reset — ${data.seeded_cases} seed cases loaded at ${base}`);
} catch (err) {
  console.error(`✗ Could not reach ${base}/api/reset (${err.message}).`);
  console.error("  Start the app first with `npm run dev`, then run `npm run seed:reset`.");
  process.exit(1);
}
