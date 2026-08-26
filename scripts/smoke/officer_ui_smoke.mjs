import { chromium } from "playwright";
import {
  assert,
  assertPortAvailable,
  isExpectedNextRequestAbort,
  requestJson as requestJsonAt,
  startNextServer,
  stopServer,
  waitForServer,
  watchBrowser,
} from "./helpers.mjs";

const port = 3012;
const baseUrl = `http://127.0.0.1:${port}`;
const nextCommand = process.env.CIVICFLOW_SMOKE_NEXT_COMMAND ?? "dev";
const sectionOrder = [
  "Next required action",
  "Officer review",
  "Supervisor decision",
  "Citizen reply",
  "Start or close",
  "Governance checks",
  "Audit trail",
];

const requestJson = (method, pathname, body) => requestJsonAt(baseUrl, method, pathname, body);

async function performApiAction(page, pathname, action) {
  const [response] = await Promise.all([
    page.waitForResponse((candidate) => {
      const url = new URL(candidate.url());
      return url.origin === baseUrl && url.pathname === pathname && candidate.request().method() === "POST";
    }),
    action(),
  ]);
  assert(response.ok(), `POST ${pathname} failed with ${response.status()}.`);
}

async function settleServerRefresh(page) {
  // App Router schedules router.refresh() just after the mutation resolves.
  // Let that refresh start, then require the page to return to network idle
  // before the next action so navigation requests are never cancelled by us.
  await page.waitForTimeout(150);
  await page.waitForLoadState("networkidle");
}

async function assertHeadingOrder(page) {
  const headings = (await page.getByRole("heading").allTextContents()).map((text) => text.trim());
  let previous = -1;
  for (const expected of sectionOrder) {
    const index = headings.findIndex((text, candidate) => candidate > previous && text === expected);
    assert(index > previous, `Expected section heading "${expected}" after "${sectionOrder[sectionOrder.indexOf(expected) - 1] ?? "case header"}". Found: ${headings.join(" | ")}`);
    previous = index;
  }
}

async function assertAuditSearch(page, query, visibleText) {
  await page.goto(`${baseUrl}/officer/audit?q=${encodeURIComponent(query)}`, { waitUntil: "networkidle" });
  await page.getByText(`Results for “${query}”`, { exact: true }).waitFor();
  const rows = page.locator("tbody tr:has(td:not([colspan]))");
  await rows.first().waitFor();
  const rowCount = await rows.count();
  await page.getByText(`${rowCount} event${rowCount === 1 ? "" : "s"}.`, { exact: true }).waitFor();
  await page.getByRole("row").filter({ hasText: visibleText }).first().waitFor();
}

async function main() {
  await assertPortAvailable(port);
  const { server, ready, getLaunchError } = startNextServer(nextCommand, port);

  let browser = null;
  try {
    await waitForServer({ baseUrl, pathname: "/officer", server, ready, getLaunchError, label: `Next ${nextCommand} server` });
    const reset = await requestJson("POST", "/api/reset");
    assert(reset.ok === true, "POST /api/reset did not return ok=true.");

    const seededCases = await requestJson("GET", "/api/cases");
    const closedCase = seededCases.find((item) => item.status === "closed");
    assert(closedCase, "Reset data must include a closed case for the default queue-filter check.");

    const created = await requestJson("POST", "/api/cases", {
      text: "I need a business licence for a synthetic food stall at Synthetic Market A, open 09:00 to 17:00.",
      language: "en",
      location_text: "Synthetic Market A",
      answers: {
        location: "Synthetic Market A",
        business_type: "Synthetic food stall",
        operating_hours: "09:00 to 17:00",
      },
      source_channel: "web",
    });
    assert(created.category === "business_licensing", "Smoke case was not classified as business licensing.");
    assert(created.status === "routed", `Complete business-licensing case should be routed, got ${created.status}.`);
    assert(created.citations.length > 0, "Complete business-licensing case must have current citations.");
    assert(Number.isInteger(created.triage_revision), "Created case did not include a valid triage revision.");

    const unreviewedFlood = await requestJson("POST", "/api/cases", {
      text: "Longkang tersumbat dekat Jalan SS2, bila hujan air naik cepat.",
      language: "ms",
      source_channel: "web",
    });
    assert(unreviewedFlood.status === "awaiting_supervisor", `Flood-risk case should be gated, got ${unreviewedFlood.status}.`);
    assert(unreviewedFlood.officer_review === null, "Fresh flood-risk case unexpectedly has an officer review.");

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    page.setDefaultTimeout(12_000);
    const assertBrowserHealthy = watchBrowser(page, {
      baseUrl,
      isExpectedConsoleMessage: (message) => {
        const text = message.text();
        return message.type() === "warning"
          && text.startsWith(`The resource ${baseUrl}/_next/static/css/app/layout.css?v=`)
          && text.endsWith(" was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.");
      },
      isExpectedRequestFailure: isExpectedNextRequestAbort,
    });

    await page.goto(`${baseUrl}/officer`, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: "Case queue", exact: true }).waitFor();
    const skipLink = page.getByRole("link", { name: "Skip to main content", exact: true });
    assert(await skipLink.getAttribute("href") === "#main-content", "Officer skip link does not target the main content");
    const brandBox = await page.getByRole("link", { name: /CivicFlow MY/ }).boundingBox();
    assert((brandBox?.height ?? 0) >= 44, `Officer brand target is shorter than 44px (${brandBox?.height ?? 0}px)`);
    await page.getByRole("button", { name: "Reset synthetic demo", exact: true }).waitFor();
    assert(await page.locator(".border-l-4").count() === 0, "Officer queue still renders a decorative border-l-4 callout");
    const search = page.getByRole("textbox", { name: "Search cases", exact: true });
    await search.waitFor();
    assert((await page.getByText(closedCase.citizen_ref, { exact: true }).count()) === 0, `Closed case ${closedCase.citizen_ref} is visible in the default queue.`);
    await page.getByText("Next action", { exact: true }).first().waitFor();
    assertBrowserHealthy();

    await search.fill(unreviewedFlood.citizen_ref);
    await page.getByRole("button", { name: "Needs approval", exact: true }).click();
    assert((await page.getByText(unreviewedFlood.citizen_ref, { exact: true }).count()) === 0, "Unreviewed case is presented as ready for supervisor approval.");
    await page.getByRole("button", { name: "Needs review", exact: true }).click();
    await page.getByText(unreviewedFlood.citizen_ref, { exact: true }).waitFor();
    await page.getByText("Officer review required", { exact: true }).waitFor();

    await page.goto(`${baseUrl}/officer/approvals`, { waitUntil: "networkidle" });
    const waitingReviewSection = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Waiting for officer review", exact: true }),
    }).first();
    const pendingDecisionSection = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Pending decisions", exact: true }),
    }).first();
    await waitingReviewSection.getByText(unreviewedFlood.citizen_ref, { exact: true }).waitFor();
    assert((await pendingDecisionSection.getByText(unreviewedFlood.citizen_ref, { exact: true }).count()) === 0, "Unreviewed case appears under Pending decisions.");
    assert((await waitingReviewSection.getByRole("button", { name: "Approve request", exact: true }).count()) === 0, "Waiting-for-review item exposes a supervisor decision action.");

    const reviewedFlood = await requestJson("POST", `/api/cases/${unreviewedFlood.case_id}/review`, {
      triage_revision: unreviewedFlood.triage_revision,
      officer: "Officer Tan (demo)",
      note: "Reviewed the synthetic flood-risk request and policy evidence.",
      citizen_language: unreviewedFlood.citizen_language,
      category: unreviewedFlood.category,
      routing: { department: unreviewedFlood.department, unit: unreviewedFlood.unit },
      citation_keys: unreviewedFlood.citations.map(({ source_doc, section }) => ({ source_doc, section })),
      reply_body: unreviewedFlood.reply_draft.body,
      reply_body_en: unreviewedFlood.reply_draft.body_en,
      resolution: "proceed",
      welfare_outcome: null,
    });
    assert(reviewedFlood.officer_review?.triage_revision === reviewedFlood.triage_revision, "Flood-risk officer review was not saved.");
    await page.reload({ waitUntil: "networkidle" });
    const pendingArticle = pendingDecisionSection.locator("article").filter({ hasText: unreviewedFlood.citizen_ref }).first();
    await pendingArticle.getByText(unreviewedFlood.citizen_ref, { exact: true }).waitFor();
    await pendingArticle.getByRole("heading", { name: "Policy evidence", exact: true }).waitFor();
    await pendingArticle.getByText("Drainage Response SOP", { exact: false }).first().waitFor();
    await pendingArticle.getByText(/confidence \d\.\d{2}/).first().waitFor();
    assert((await waitingReviewSection.getByText(unreviewedFlood.citizen_ref, { exact: true }).count()) === 0, "Reviewed case remains in the waiting-for-review group.");

    await page.goto(`${baseUrl}/officer`, { waitUntil: "networkidle" });
    await search.fill(created.citizen_ref);
    const caseLink = page.getByRole("link").filter({ hasText: created.citizen_ref }).first();
    await caseLink.waitFor();
    await caseLink.focus();
    assert(await caseLink.evaluate((element) => {
      const style = getComputedStyle(element);
      return style.outlineStyle !== "none" || style.boxShadow !== "none";
    }), "Focused queue row has no visible high-contrast indicator");
    await Promise.all([
      page.waitForURL(`${baseUrl}/officer/cases/${created.case_id}`),
      caseLink.click(),
    ]);
    await assertHeadingOrder(page);
    assert(await page.locator(".border-l-4").count() === 0, "Officer case detail still renders a decorative border-l-4 callout");
    const englishReference = page.getByText("English reference", { exact: true }).last();
    const referenceBox = await englishReference.boundingBox();
    assert((referenceBox?.height ?? 0) >= 44, `English reference target is shorter than 44px (${referenceBox?.height ?? 0}px)`);

    const reviewSection = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Officer review", exact: true }),
    }).first();
    const resolution = reviewSection.getByLabel("Resolution", { exact: true });
    const category = reviewSection.getByLabel("Confirmed category", { exact: true });
    const language = reviewSection.getByLabel("Confirmed language", { exact: true });
    const department = reviewSection.getByLabel("Confirmed department", { exact: true });
    const unit = reviewSection.getByLabel("Confirmed unit", { exact: true });
    const note = reviewSection.getByLabel("Review note", { exact: true });
    for (const field of [resolution, category, language, department, unit, note]) await field.waitFor();

    assert(await category.inputValue() === created.category, "Confirmed category does not match the current case revision.");
    assert(await language.inputValue() === created.citizen_language, "Confirmed language does not match the current case revision.");
    assert(await department.inputValue() === created.department, "Confirmed department does not match the current case revision.");
    assert(await unit.inputValue() === created.unit, "Confirmed unit does not match the current case revision.");
    const citationChoices = reviewSection.getByRole("checkbox", { name: /^Use citation:/ });
    assert(await citationChoices.count() === created.citations.length, "Officer review does not expose every current citation.");
    for (const checkbox of await citationChoices.all()) {
      assert(await checkbox.isChecked(), "A current policy citation is not selected by default.");
    }

    await resolution.selectOption("proceed");
    await note.fill("Reviewed against the current synthetic request and cited policy.");
    const policySearch = reviewSection.getByRole("searchbox", { name: "Search policy evidence", exact: true });
    await policySearch.fill(created.category);
    await Promise.all([
      page.waitForResponse((response) => response.url().includes("/api/policies/search?") && response.status() === 200),
      policySearch.press("Enter"),
    ]);
    assert((await requestJson("GET", `/api/cases/${created.case_id}`)).officer_review === null, "Pressing Enter in policy search submitted the officer review.");
    await performApiAction(page, `/api/cases/${created.case_id}/review`, () =>
      reviewSection.getByRole("button", { name: "Save officer review", exact: true }).click());
    await settleServerRefresh(page);
    let current = await requestJson("GET", `/api/cases/${created.case_id}`);
    assert(current.officer_review?.triage_revision === current.triage_revision, "Officer review was not saved for the current revision.");
    await page.getByText("Send the reviewed reply", { exact: true }).waitFor();
    assert(await page.getByText("Release control", { exact: true }).count() === 0, "Officer reply control still uses Release copy");

    const releaseReply = page.getByRole("button", { name: "Send reply to citizen", exact: true });
    await releaseReply.waitFor();
    await performApiAction(page, `/api/cases/${created.case_id}/reply`, () => releaseReply.click());
    await settleServerRefresh(page);
    current = await requestJson("GET", `/api/cases/${created.case_id}`);
    assert(current.reply_draft?.status === "sent", "Citizen reply was not released.");
    await page.getByText("Sent", { exact: true }).first().waitFor();

    const startWork = page.getByRole("button", { name: "Start work", exact: true });
    await startWork.waitFor();
    await performApiAction(page, `/api/cases/${created.case_id}/status`, () => startWork.click());
    await settleServerRefresh(page);
    current = await requestJson("GET", `/api/cases/${created.case_id}`);
    assert(current.status === "in_progress", `Start work left case in ${current.status}.`);

    const closureNote = page.getByRole("textbox", { name: "Closure note", exact: true });
    await closureNote.waitFor();
    await closureNote.fill("Synthetic service work completed and verified for the demo.");
    await performApiAction(page, `/api/cases/${created.case_id}/status`, () =>
      page.getByRole("button", { name: "Close case", exact: true }).click());
    await settleServerRefresh(page);
    current = await requestJson("GET", `/api/cases/${created.case_id}`);
    assert(current.status === "closed", `Close case left case in ${current.status}.`);
    await page.getByText("Closed", { exact: true }).first().waitFor();

    const auditEvents = await requestJson("GET", "/api/audit");
    const auditEvent = auditEvents.find((event) => event.case_id === created.case_id && typeof event.payload?.triage_revision === "number");
    assert(auditEvent, "The completed smoke case is missing its audit event.");
    await page.goto(`${baseUrl}/officer/audit`, { waitUntil: "networkidle" });
    const auditEventRow = page.getByRole("row")
      .filter({ hasText: created.citizen_ref })
      .filter({ hasText: auditEvent.summary })
      .first();
    await auditEventRow.waitFor();
    const dateLabel = (await auditEventRow.locator("time").textContent())?.trim();
    const revisionLabel = (await auditEventRow.getByText(/^Revision \d+$/, { exact: true }).textContent())?.trim();
    assert(dateLabel && revisionLabel, "Audit event does not expose the expected date and revision labels.");
    const auditQueries = [
      auditEvent.event_type,
      auditEvent.actor,
      auditEvent.actor_label,
      auditEvent.summary,
      created.case_id,
      created.citizen_ref,
      dateLabel,
      revisionLabel,
    ];
    for (const query of auditQueries) {
      await assertAuditSearch(page, query, auditEvent.summary);
    }

    await page.goto(`${baseUrl}/officer/audit?q=a&q=b`, { waitUntil: "networkidle" });
    await page.getByText("Results for “a”", { exact: true }).waitFor();

    await page.goto(`${baseUrl}/officer/audit`, { waitUntil: "networkidle" });
    const auditSearch = page.getByRole("searchbox", { name: "Search audit events", exact: true });
    await auditSearch.fill(created.citizen_ref);
    await auditSearch.press("Enter");
    await page.getByText(`Results for “${created.citizen_ref}”`, { exact: true }).waitFor();
    assert(await page.getByRole("row").filter({ hasText: created.citizen_ref }).count() > 0, "Audit search did not retain matching case events.");
    await auditSearch.fill("no matching synthetic audit event");
    await auditSearch.press("Enter");
    await page.getByText("No audit events match this search.", { exact: true }).waitFor();
    await page.getByRole("link", { name: "Clear search", exact: true }).click();
    await page.waitForLoadState("networkidle");
    await page.getByText("All recorded events", { exact: true }).waitFor();
    await page.setViewportSize({ width: 320, height: 700 });
    const auditRegion = page.getByRole("region", { name: "Audit events table", exact: true });
    await auditRegion.waitFor();
    assert(await auditRegion.getAttribute("tabindex") === "0", "Audit table region is not keyboard focusable");
    await auditRegion.focus();
    assert(await auditRegion.evaluate((element) => {
      const style = getComputedStyle(element);
      return style.outlineStyle !== "none" || style.boxShadow !== "none";
    }), "Focused audit table region has no visible focus indicator");
    const auditCanScroll = await auditRegion.evaluate((element) => {
      element.scrollLeft = 0;
      return element.scrollWidth > element.clientWidth;
    });
    assert(auditCanScroll, "Audit table region does not expose its overflow content");
    await auditRegion.press("ArrowRight");
    await page.waitForTimeout(100);
    assert(await auditRegion.evaluate((element) => element.scrollLeft > 0), "ArrowRight does not provide keyboard access to hidden audit columns");
    await page.getByText("Scroll horizontally to view all audit columns.", { exact: true }).waitFor();
    const auditOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert(auditOverflow <= 1, `320px audit view overflows the page by ${auditOverflow}px`);
    assert(await page.locator(".border-l-4").count() === 0, "Audit view still renders a decorative border-l-4 callout");
    assertBrowserHealthy();

    console.log(`Officer UI smoke passed at ${baseUrl}`);
  } finally {
    if (browser) await browser.close();
    await stopServer(server);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
