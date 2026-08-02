import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import {
  assert,
  assertPortAvailable,
  isExpectedNextRequestAbort,
  rawRequest as rawRequestAt,
  requestJson as requestJsonAt,
  startNextServer,
  stopServer,
  waitForServer,
  watchBrowser,
} from "./helpers.mjs";

const root = process.cwd();
const port = Number(process.env.CIVICFLOW_SMOKE_PORT || 3012);
const baseUrl = process.env.CIVICFLOW_BASE_URL || `http://127.0.0.1:${port}`;
const startServer = process.env.CIVICFLOW_SMOKE_START_SERVER !== "0" && !process.env.CIVICFLOW_BASE_URL;
const screenshotParent = path.join(root, "output", "playwright");
const publishedScreenshotDir = path.join(screenshotParent, "maic-smoke");
const screenshotDir = path.join(screenshotParent, `.maic-smoke.staging-${process.pid}`);

const CASE_TEXT = {
  drainage: "Longkang tersumbat dekat Jalan SS2, bila hujan air naik cepat.",
  licence: "\u6211\u8981\u7533\u8bf7\u5c0f\u98df\u6863\u6267\u7167\uff0c\u9700\u8981\u4ec0\u4e48\u6587\u4ef6\uff1f",
  welfare: "Can I apply for education aid for my child?",
  unknown: "QWERTY zzzz unrelated synthetic demo text.",
};
const LICENCE_REPLY_ZH = "\u5e02\u8bae\u4f1a\u6267\u7167\u5355\u4f4d\u5df2\u5ba1\u6838\u6b64\u6a21\u62df\u7533\u8bf7\u3002\u8bf7\u4fdd\u7559\u8ffd\u8e2a\u7f16\u53f7\uff1b\u672c\u56de\u590d\u4e0d\u4ee3\u8868\u771f\u5b9e\u6267\u7167\u6279\u51c6\u3002";

const rawRequest = (method, endpoint, body) => rawRequestAt(baseUrl, method, endpoint, body);
const requestJson = (method, endpoint, body) => requestJsonAt(baseUrl, method, endpoint, body);

async function submitCase({ text, language, locationText, answers }) {
  return requestJson("POST", "/api/cases", {
    text,
    language,
    location_text: locationText,
    answers,
    media_refs: [],
    source_channel: "web",
  });
}

function reviewPayload(c, overrides = {}) {
  return {
    triage_revision: c.triage_revision,
    officer: "Officer Tan (demo)",
    note: "Reviewed the synthetic request, routing, policy evidence, and citizen reply.",
    citizen_language: c.citizen_language,
    category: c.category,
    routing: { department: c.department, unit: c.unit },
    citation_keys: c.citations.map(({ source_doc, section }) => ({ source_doc, section })),
    reply_body: "Officer-reviewed synthetic citizen reply for this demo case.",
    reply_body_en: "Officer-reviewed synthetic citizen reply for this demo case.",
    resolution: "proceed",
    welfare_outcome: null,
    ...overrides,
  };
}

async function expectVisibleText(page, text, label) {
  await page.getByText(text, { exact: false }).first().waitFor({ timeout: 15_000 });
  console.log(`ok: ${label}`);
}

function assertChildPath(parent, candidate) {
  const child = path.relative(path.resolve(parent), path.resolve(candidate));
  assert(child && !child.startsWith("..") && !path.isAbsolute(child), `Refusing filesystem mutation outside ${parent}: ${candidate}`);
}

async function promoteScreenshots() {
  const backupDir = path.join(screenshotParent, `.maic-smoke.previous-${process.pid}`);
  for (const candidate of [publishedScreenshotDir, screenshotDir, backupDir]) assertChildPath(screenshotParent, candidate);
  await fs.rm(backupDir, { recursive: true, force: true });
  let hadPublishedScreenshots = false;
  try {
    await fs.rename(publishedScreenshotDir, backupDir);
    hadPublishedScreenshots = true;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  try {
    await fs.rename(screenshotDir, publishedScreenshotDir);
  } catch (error) {
    if (hadPublishedScreenshots) await fs.rename(backupDir, publishedScreenshotDir);
    throw error;
  }
  await fs.rm(backupDir, { recursive: true, force: true });
}

async function main() {
  assertChildPath(screenshotParent, screenshotDir);
  await fs.rm(screenshotDir, { recursive: true, force: true });
  await fs.mkdir(screenshotDir, { recursive: true });
  let screenshotsPromoted = false;
  let server = null;
  let serverReady = null;
  let getLaunchError = () => null;
  let browser = null;

  if (startServer) {
    await assertPortAvailable(port);
    ({ server, ready: serverReady, getLaunchError } = startNextServer("start", port, root));
  }

  try {
    await waitForServer({ baseUrl, pathname: "/m", server, ready: serverReady, getLaunchError, label: "Production server" });
    const reset = await requestJson("POST", "/api/reset");
    assert(reset.ok === true, "POST /api/reset did not return ok=true.");

    const rejectedPii = await rawRequest("POST", "/api/cases", {
      text: "My name is Ahmad bin Ali and a blocked drain needs attention.",
      language: "en",
      location_text: "12 Jalan Ampang Kuala Lumpur",
      media_refs: [],
      source_channel: "web",
    });
    assert(rejectedPii.response.status === 422, `Realistic personal data should return 422, got ${rejectedPii.response.status}.`);
    assert(rejectedPii.json?.code === "synthetic_data_only", "PII rejection did not use the synthetic-data-only boundary code.");

    let drainage = await submitCase({
      text: CASE_TEXT.drainage,
      language: "ms",
      locationText: "Jalan Demo, Taman Demo",
      answers: { location: "Jalan Demo, Taman Demo" },
    });
    assert(drainage.status === "awaiting_supervisor", `Flood-risk drainage should await a supervisor, got ${drainage.status}.`);
    assert(drainage.approval_task_id, "Flood-risk drainage did not create an approval task.");
    assert(drainage.citations.length > 0, "Flood-risk drainage has no policy citation.");

    const deniedStart = await rawRequest("POST", `/api/cases/${drainage.case_id}/status`, {
      triage_revision: drainage.triage_revision,
      status: "in_progress",
      officer: "Smoke Officer (demo)",
    });
    assert(deniedStart.response.status === 400, `Pre-review flood-risk start should return 400, got ${deniedStart.response.status}.`);
    assert(!String(deniedStart.json?.error ?? "").includes("stale_triage_revision"), "Denied start only exercised the stale-revision guard.");

    const deniedPendingClose = await rawRequest(
      "POST",
      `/api/cases/${drainage.case_id}/review`,
      reviewPayload(drainage, {
        resolution: "close_no_action",
        note: "Attempt to close before a supervisor decision.",
      }),
    );
    assert(deniedPendingClose.response.status === 400, `Pending high-risk close-no-action should return 400, got ${deniedPendingClose.response.status}.`);
    assert(/supervisor.*decision/i.test(String(deniedPendingClose.json?.error ?? "")), "Pending high-risk close did not fail on the supervisor-decision gate.");

    drainage = await requestJson("POST", `/api/cases/${drainage.case_id}/review`, reviewPayload(drainage));
    assert(drainage.officer_review?.triage_revision === drainage.triage_revision, "Drainage officer review is not current.");
    const approval = await requestJson("POST", `/api/approvals/${drainage.approval_task_id}`, {
      triage_revision: drainage.triage_revision,
      decision: "approved",
      decided_by: "Supervisor Lim (demo)",
      decided_role: "supervisor",
      note: "Approved after reviewing the synthetic flood-risk evidence.",
    });
    assert(approval.status === "approved", "Drainage supervisor task was not approved.");
    assert(approval.triage_revision === drainage.triage_revision, "Supervisor decision was recorded against the wrong revision.");
    assert(approval.decision_by === "Supervisor Lim (demo)", "Supervisor decision actor was not preserved.");
    assert(approval.decision_note === "Approved after reviewing the synthetic flood-risk evidence.", "Supervisor decision note was not preserved.");
    assert(approval.evidence.some((citation) => citation.doc_title === "Drainage Response SOP"), "Supervisor decision lost its policy evidence.");
    drainage = await requestJson("GET", `/api/cases/${drainage.case_id}`);
    assert(drainage.status === "routed", `Approval should leave drainage routed, got ${drainage.status}.`);
    const deniedUnreleasedStart = await rawRequest("POST", `/api/cases/${drainage.case_id}/status`, {
      triage_revision: drainage.triage_revision,
      status: "in_progress",
      officer: "Officer Tan (demo)",
    });
    assert(deniedUnreleasedStart.response.status === 400, `Unreleased-reply start should return 400, got ${deniedUnreleasedStart.response.status}.`);
    assert(/reply must be sent/i.test(String(deniedUnreleasedStart.json?.error ?? "")), "Unreleased-reply start did not fail on the citizen-reply gate.");
    drainage = await requestJson("POST", `/api/cases/${drainage.case_id}/reply`, {
      triage_revision: drainage.triage_revision,
      officer: "Officer Tan (demo)",
    });
    assert(drainage.reply_draft?.status === "sent", "Drainage reply was not released.");
    drainage = await requestJson("POST", `/api/cases/${drainage.case_id}/status`, {
      triage_revision: drainage.triage_revision,
      status: "in_progress",
      officer: "Officer Tan (demo)",
    });
    assert(drainage.status === "in_progress", "Approved drainage did not start through the explicit work action.");
    drainage = await requestJson("POST", `/api/cases/${drainage.case_id}/status`, {
      triage_revision: drainage.triage_revision,
      status: "closed",
      officer: "Officer Tan (demo)",
      note: "Synthetic drainage service action completed.",
    });
    assert(drainage.status === "closed", "Drainage case did not close after explicit work and a closure note.");
    const deniedClosedMutation = await rawRequest("POST", `/api/cases/${drainage.case_id}/status`, {
      triage_revision: drainage.triage_revision,
      status: "in_progress",
      officer: "Officer Tan (demo)",
    });
    assert(deniedClosedMutation.response.status === 400, `Closed-case mutation should return 400, got ${deniedClosedMutation.response.status}.`);
    assert(/immutable/i.test(String(deniedClosedMutation.json?.error ?? "")), "Closed-case mutation did not fail on immutability.");

    let licence = await submitCase({ text: CASE_TEXT.licence, language: "zh" });
    assert(licence.status === "needs_info", `Incomplete licence case should need information, got ${licence.status}.`);
    const missingFields = new Set(licence.missing_info.filter((item) => item.required && !item.satisfied).map((item) => item.field));
    for (const field of ["location", "business_type", "operating_hours"]) {
      assert(missingFields.has(field), `Licence case is missing the required ${field} follow-up.`);
    }
    const originalLicenceText = licence.original_text;
    const licenceRevision = licence.triage_revision;
    licence = await requestJson("PATCH", `/api/cases/${licence.citizen_ref}`, {
      triage_revision: licence.triage_revision,
      answers: {
        location: "Synthetic Market A",
        business_type: "Synthetic food stall",
        operating_hours: "09:00 to 17:00",
      },
    });
    assert(licence.status === "routed", `Completed licence follow-up should route, got ${licence.status}.`);
    assert(licence.triage_revision === licenceRevision + 1, "Licence follow-up did not increment the triage revision exactly once.");
    assert(licence.original_text === originalLicenceText, "Structured licence details changed the citizen's original text.");

    let welfare = await submitCase({
      text: CASE_TEXT.welfare,
      language: "en",
      locationText: "Synthetic Neighbourhood",
    });
    assert(welfare.officer_review_only === true, "Welfare case is not marked for human-only eligibility review.");
    welfare = await requestJson("POST", `/api/cases/${welfare.case_id}/review`, reviewPayload(welfare, { welfare_outcome: "eligible" }));
    assert(welfare.officer_review?.welfare_outcome === "eligible", "Welfare review did not record the human outcome.");
    assert(welfare.approval_task_id === null, "Welfare eligibility was incorrectly converted into an automated supervisor task.");
    assert(welfare.status === "routed", `Welfare review should not auto-start or auto-close, got ${welfare.status}.`);
    assert(welfare.reply_draft?.status === "approved", "Welfare reply should be approved but not auto-released.");
    welfare = await requestJson("POST", `/api/cases/${welfare.case_id}/reply`, {
      triage_revision: welfare.triage_revision,
      officer: "Officer Tan (demo)",
    });
    welfare = await requestJson("POST", `/api/cases/${welfare.case_id}/status`, {
      triage_revision: welfare.triage_revision,
      status: "in_progress",
      officer: "Officer Tan (demo)",
    });
    welfare = await requestJson("POST", `/api/cases/${welfare.case_id}/status`, {
      triage_revision: welfare.triage_revision,
      status: "closed",
      officer: "Officer Tan (demo)",
      note: "Human welfare review completed for this synthetic case.",
    });
    assert(welfare.status === "closed", "Welfare case did not close after the human outcome, released reply, start, and closure note.");

    const unknown = await submitCase({ text: CASE_TEXT.unknown, language: "en" });
    assert(unknown.status === "manual_review", `Unknown request should fall back to manual review, got ${unknown.status}.`);
    assert(unknown.manual_review_reason, "Unknown request entered manual review without a recorded reason.");

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    page.setDefaultTimeout(15_000);
    const assertBrowserHealthy = watchBrowser(page, {
      baseUrl,
      isExpectedRequestFailure: isExpectedNextRequestAbort,
    });

    await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
    await expectVisibleText(page, "A clear path from citizen request to human decision.", "role launcher renders");
    await page.screenshot({ path: path.join(screenshotDir, "01-role-launcher.png"), fullPage: true });
    assertBrowserHealthy();

    await page.goto(`${baseUrl}/m`, { waitUntil: "networkidle" });
    await page.getByRole("tab", { name: "New request", exact: true }).waitFor();
    await page.getByRole("tab", { name: "Track a case", exact: true }).waitFor();
    await page.screenshot({ path: path.join(screenshotDir, "02-citizen-services.png"), fullPage: true });
    assertBrowserHealthy();

    await page.goto(`${baseUrl}/officer`, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: "Case queue", exact: true }).waitFor();
    await expectVisibleText(page, licence.citizen_ref, "licence case appears in active queue");
    assert(await page.getByText(drainage.citizen_ref, { exact: false }).count() === 0, "Closed drainage case leaked into the default active queue.");
    await page.screenshot({ path: path.join(screenshotDir, "03-officer-queue.png"), fullPage: true });
    assertBrowserHealthy();

    await page.goto(`${baseUrl}/officer/cases/${drainage.case_id}`, { waitUntil: "networkidle" });
    await expectVisibleText(page, "No further action", "closed drainage shows the read-only next action");
    await expectVisibleText(page, "Governance checks", "case governance receipt renders");
    await expectVisibleText(page, "Drainage Response SOP", "drainage policy evidence renders");
    await expectVisibleText(page, "drainage_response_sop.md", "drainage evidence preserves its source document");
    await expectVisibleText(page, "confidence", "drainage evidence preserves its confidence");
    await expectVisibleText(page, "Reply sent to the citizen", "drainage reply release is visible");
    await page.screenshot({ path: path.join(screenshotDir, "04-drainage-governed-flow.png"), fullPage: true });
    assertBrowserHealthy();

    await page.goto(`${baseUrl}/officer/cases/${licence.case_id}`, { waitUntil: "networkidle" });
    await expectVisibleText(page, "Complete officer review", "completed licence follow-up returns to officer review");
    await expectVisibleText(page, "Business Licensing FAQ", "licence policy evidence renders");
    await page.screenshot({ path: path.join(screenshotDir, "05-licence-follow-up.png"), fullPage: true });
    assertBrowserHealthy();

    licence = await requestJson("POST", `/api/cases/${licence.case_id}/review`, reviewPayload(licence, {
      reply_body: LICENCE_REPLY_ZH,
      reply_body_en: "The council licensing unit reviewed this synthetic application. Keep the tracking code; this reply is not a real licence approval.",
    }));
    assert(licence.reply_draft?.language === "zh", "Licence review did not preserve the citizen's Chinese language.");
    licence = await requestJson("POST", `/api/cases/${licence.case_id}/reply`, {
      triage_revision: licence.triage_revision,
      officer: "Officer Tan (demo)",
    });
    licence = await requestJson("POST", `/api/cases/${licence.case_id}/status`, {
      triage_revision: licence.triage_revision,
      status: "in_progress",
      officer: "Officer Tan (demo)",
    });
    licence = await requestJson("POST", `/api/cases/${licence.case_id}/status`, {
      triage_revision: licence.triage_revision,
      status: "closed",
      officer: "Officer Tan (demo)",
      note: "Synthetic licence guidance completed after officer review.",
    });
    assert(licence.status === "closed", "Chinese licence case did not complete the reviewed reply, work, and closure flow.");

    const audit = await requestJson("GET", "/api/audit");
    assert(audit.some((event) => event.case_id === drainage.case_id && event.event_type === "status.held"), "Held flood-risk start was not recorded in the audit trail.");
    assert(audit.some((event) => event.case_id === drainage.case_id && event.event_type === "status.changed" && event.payload?.to_status === "closed"), "Drainage closure was not recorded in the audit trail.");
    assert(audit.some((event) => event.case_id === welfare.case_id && event.event_type === "status.changed" && event.payload?.to_status === "closed"), "Welfare closure was not recorded in the audit trail.");
    assert(audit.some((event) => event.case_id === licence.case_id && event.event_type === "status.changed" && event.payload?.to_status === "closed"), "Chinese licence closure was not recorded in the audit trail.");

    await page.goto(`${baseUrl}/officer/cases/${licence.case_id}`, { waitUntil: "networkidle" });
    await expectVisibleText(page, "No further action", "closed licence case is read-only");
    await expectVisibleText(page, "Sent by officer", "licence governance receipt records reply release");
    await page.screenshot({ path: path.join(screenshotDir, "06-licence-governed-closure.png"), fullPage: true });
    assertBrowserHealthy();

    await page.goto(`${baseUrl}/m/cases/${licence.citizen_ref}`, { waitUntil: "networkidle" });
    await expectVisibleText(page, "\u5e02\u8bae\u4f1a\u5df2\u5411\u60a8\u53d1\u9001\u56de\u590d", "citizen sees the Chinese reply-ready state");
    await page.getByRole("link", { name: "\u9605\u8bfb\u56de\u590d", exact: true }).click();
    await expectVisibleText(page, LICENCE_REPLY_ZH, "citizen sees the officer-reviewed Chinese reply");
    await page.screenshot({ path: path.join(screenshotDir, "07-citizen-chinese-reply.png"), fullPage: true });
    assertBrowserHealthy();

    await page.goto(`${baseUrl}/officer/cases/${welfare.case_id}`, { waitUntil: "networkidle" });
    await expectVisibleText(page, "No further action", "closed welfare case remains visibly human-decided");
    await expectVisibleText(page, "Eligible after officer review", "closed welfare case preserves the human outcome");
    await page.screenshot({ path: path.join(screenshotDir, "08-welfare-human-outcome.png"), fullPage: true });
    assertBrowserHealthy();

    await page.goto(`${baseUrl}/officer/approvals`, { waitUntil: "networkidle" });
    await expectVisibleText(page, "Supervisor approvals", "approval workspace renders");
    const approvalHistory = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Decision history", exact: true }),
    }).first();
    const drainageDecision = approvalHistory.locator("li").filter({ hasText: drainage.citizen_ref }).first();
    await drainageDecision.getByText(`Revision ${drainage.triage_revision}`, { exact: true }).waitFor();
    await drainageDecision.getByText("by Supervisor Lim (demo)", { exact: true }).waitFor();
    await drainageDecision.getByText("Approved after reviewing the synthetic flood-risk evidence.", { exact: true }).waitFor();
    await drainageDecision.getByText(approval.evidence[0].doc_title, { exact: false }).first().waitFor();
    await drainageDecision.getByText(approval.evidence[0].section, { exact: false }).waitFor();
    await drainageDecision.getByText(`confidence ${approval.evidence[0].confidence.toFixed(2)}`, { exact: false }).first().waitFor();
    console.log("ok: drainage supervisor decision preserves revision, actor, note, and linked evidence");
    await page.screenshot({ path: path.join(screenshotDir, "09-approval-history.png"), fullPage: true });
    assertBrowserHealthy();

    await page.goto(`${baseUrl}/officer/audit`, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: "Audit trail", exact: true }).waitFor();
    await expectVisibleText(page, "status.held", "held transition audit is visible");
    const licenceClosureRow = page.getByRole("row")
      .filter({ hasText: licence.citizen_ref })
      .filter({ hasText: "status.changed" })
      .filter({ hasText: 'Status changed to "closed".' })
      .first();
    await licenceClosureRow.waitFor();
    console.log("ok: licence closure row is visible in the audit trail");
    await page.screenshot({ path: path.join(screenshotDir, "10-audit-trail.png"), fullPage: true });
    assertBrowserHealthy();

    await promoteScreenshots();
    screenshotsPromoted = true;
    console.log(`MAIC e2e smoke passed: 4 canonical cases, closure and immutability gates, and 10 rendered views at ${baseUrl}`);
    console.log(`Screenshots: ${publishedScreenshotDir}`);
  } finally {
    if (browser) await browser.close();
    if (server) await stopServer(server);
    if (!screenshotsPromoted) {
      assertChildPath(screenshotParent, screenshotDir);
      await fs.rm(screenshotDir, { recursive: true, force: true });
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
