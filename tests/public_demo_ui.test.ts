import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("public demo UI guardrails", () => {
  it("keeps citizen mobile zoomable and form controls programmatically labelled", () => {
    const layout = read("src/app/layout.tsx");
    const citizen = read("src/app/m/page.tsx");

    expect(layout).not.toContain("maximumScale");
    expect(citizen).toContain('htmlFor="citizen-request"');
    expect(citizen).toContain('id="citizen-request"');
    expect(citizen).toContain("htmlFor={`missing-${m.field}`}");
    expect(citizen).toContain("id={`missing-${m.field}`}");
  });

  it("shows language text labels instead of national flag icons", () => {
    expect(read("src/lib/i18n.ts")).not.toContain("LANGUAGE_FLAGS");
    expect(read("src/app/m/page.tsx")).not.toContain("LANGUAGE_FLAGS");
    expect(read("src/app/officer/page.tsx")).not.toContain("LANGUAGE_FLAGS");
  });

  it("keeps audit actors and AI reply disclaimer readable without color-only labels", () => {
    const ui = read("src/components/ui.tsx");
    const reply = read("src/app/m/cases/[id]/reply/page.tsx");

    expect(ui).toContain("ActorBadge");
    expect(ui).toContain("AI Agent");
    expect(reply).toContain("text-xs");
    expect(reply).toContain("text-slate-600");
    expect(reply).not.toContain("text-[10px] text-slate-400");
  });

  it("keeps officer navigation visible on mobile and tables horizontally scrollable", () => {
    const layout = read("src/app/officer/layout.tsx");
    const queue = read("src/app/officer/page.tsx");
    const audit = read("src/app/officer/audit/page.tsx");

    expect(layout).not.toContain("hidden items-center gap-4");
    expect(queue).toContain("overflow-x-auto");
    expect(audit).toContain("overflow-x-auto");
  });
});
