import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { chromium } from "playwright";

const port = 3012;
const baseUrl = `http://127.0.0.1:${port}`;
const sectionOrder = [
  "Next required action",
  "Officer review",
  "Supervisor decision",
  "Citizen reply",
  "Start or close",
  "Audit trail",
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function assertPortAvailable() {
  await new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", () => reject(new Error(`Port ${port} is already in use; refusing to attach to a server this smoke did not start.`)));
    probe.once("listening", () => probe.close(resolve));
    probe.listen(port, "127.0.0.1");
  });
}

async function waitForServer(server, getLaunchError) {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    if (getLaunchError()) throw getLaunchError();
    if (server.exitCode !== null) throw new Error(`Next dev server exited early with code ${server.exitCode}.`);
    try {
      const response = await fetch(`${baseUrl}/officer`);
      if (response.ok) return;
    } catch {
      // Next is still starting.
    }
    await sleep(500);
  }
  throw new Error(`Officer smoke server did not become ready at ${baseUrl}`);
}

async function stopServer(server) {
  if (!server?.pid || server.exitCode !== null) return;
  if (process.platform === "win32") {
    await new Promise((resolve) => {
      const killer = spawn("taskkill", ["/pid", String(server.pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true,
      });
      killer.once("error", resolve);
      killer.once("exit", resolve);
    });
    return;
  }
  const exited = once(server, "exit");
  server.kill("SIGTERM");
  await Promise.race([exited, sleep(3_000)]);
  if (server.exitCode === null) server.kill("SIGKILL");
}

async function requestJson(method, pathname, body) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`${method} ${pathname} returned non-JSON: ${text.slice(0, 160)}`);
  }
  if (!response.ok) throw new Error(`${method} ${pathname} failed with ${response.status}: ${text.slice(0, 240)}`);
  return json;
}

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

async function main() {
  await assertPortAvailable();
  let launchError = null;
  const server = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", String(port)],
    { cwd: process.cwd(), stdio: ["ignore", "pipe", "pipe"] },
  );
  server.once("error", (error) => { launchError = error; });
  server.stdout.on("data", (chunk) => process.stdout.write(`[next] ${chunk}`));
  server.stderr.on("data", (chunk) => process.stderr.write(`[next] ${chunk}`));

  let browser = null;
  try {
    await waitForServer(server, () => launchError);
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

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    page.setDefaultTimeout(12_000);
    const browserFailures = [];
    const sameOrigin = (url) => {
      try {
        return new URL(url).origin === baseUrl;
      } catch {
        return false;
      }
    };
    const assertBrowserHealthy = () => assert(browserFailures.length === 0, browserFailures.join("\n"));

    page.on("pageerror", (error) => browserFailures.push(`pageerror: ${error.message}`));
    page.on("console", (message) => {
      if (["warning", "error"].includes(message.type())) {
        browserFailures.push(`console ${message.type()}: ${message.text()}`);
      }
    });
    page.on("requestfailed", (request) => {
      const url = new URL(request.url());
      const failure = request.failure()?.errorText ?? "unknown error";
      const cancelledAppRouterRefresh = request.method() === "GET"
        && url.searchParams.has("_rsc")
        && failure === "net::ERR_ABORTED";
      if (sameOrigin(request.url()) && !cancelledAppRouterRefresh) {
        browserFailures.push(`request failed: ${request.method()} ${request.url()} (${failure})`);
      }
    });
    page.on("response", (response) => {
      if (sameOrigin(response.url()) && response.status() >= 400) {
        browserFailures.push(`HTTP ${response.status()}: ${response.request().method()} ${response.url()}`);
      }
    });

    await page.goto(`${baseUrl}/officer`, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: "Case queue", exact: true }).waitFor();
    const search = page.getByRole("textbox", { name: "Search cases", exact: true });
    await search.waitFor();
    assert((await page.getByText(closedCase.citizen_ref, { exact: true }).count()) === 0, `Closed case ${closedCase.citizen_ref} is visible in the default queue.`);
    await page.getByText("Next action", { exact: true }).first().waitFor();
    assertBrowserHealthy();

    await search.fill(created.citizen_ref);
    const caseLink = page.getByRole("link").filter({ hasText: created.citizen_ref }).first();
    await caseLink.waitFor();
    await Promise.all([
      page.waitForURL(`${baseUrl}/officer/cases/${created.case_id}`),
      caseLink.click(),
    ]);
    await assertHeadingOrder(page);

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
    await performApiAction(page, `/api/cases/${created.case_id}/review`, () =>
      reviewSection.getByRole("button", { name: "Save officer review", exact: true }).click());
    await settleServerRefresh(page);
    let current = await requestJson("GET", `/api/cases/${created.case_id}`);
    assert(current.officer_review?.triage_revision === current.triage_revision, "Officer review was not saved for the current revision.");

    const releaseReply = page.getByRole("button", { name: "Release reply", exact: true });
    await releaseReply.waitFor();
    await performApiAction(page, `/api/cases/${created.case_id}/reply`, () => releaseReply.click());
    await settleServerRefresh(page);
    current = await requestJson("GET", `/api/cases/${created.case_id}`);
    assert(current.reply_draft?.status === "sent", "Citizen reply was not released.");

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
