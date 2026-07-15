import { spawn } from "node:child_process";
import { chromium } from "playwright";

const port = Number(process.env.CIVICFLOW_CITIZEN_SMOKE_PORT || 3013);
const baseUrl = process.env.CIVICFLOW_CITIZEN_BASE_URL || `http://127.0.0.1:${port}`;
const startServer = !process.env.CIVICFLOW_CITIZEN_BASE_URL;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer() {
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/m`);
      if (response.ok) return;
    } catch {
      // The dev server is still starting.
    }
    await sleep(500);
  }
  throw new Error(`Citizen smoke server did not become ready at ${baseUrl}`);
}

async function main() {
  let server = null;
  if (startServer) {
    server = spawn(
      process.execPath,
      ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", String(port)],
      { cwd: process.cwd(), stdio: ["ignore", "pipe", "pipe"] },
    );
    server.stdout.on("data", (chunk) => process.stdout.write(`[next] ${chunk}`));
    server.stderr.on("data", (chunk) => process.stderr.write(`[next] ${chunk}`));
  }

  let browser = null;
  try {
    await waitForServer();
    await fetch(`${baseUrl}/api/reset`, { method: "POST" });
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const failures = [];
    page.on("pageerror", (error) => failures.push(`pageerror: ${error.message}`));
    page.on("console", (message) => {
      if (["error", "warning"].includes(message.type())) {
        failures.push(`console ${message.type()}: ${message.text()}`);
      }
    });
    page.on("requestfailed", (request) => {
      const url = new URL(request.url());
      const failure = request.failure()?.errorText ?? "unknown error";
      const cancelledRsc = request.method() === "GET"
        && url.searchParams.has("_rsc")
        && failure === "net::ERR_ABORTED";
      if (request.url().startsWith(baseUrl) && !cancelledRsc) {
        failures.push(`request failed: ${request.method()} ${request.url()} (${failure})`);
      }
    });
    page.on("response", (response) => {
      if (response.url().startsWith(baseUrl) && response.status() >= 400) {
        failures.push(`HTTP ${response.status()}: ${response.url()}`);
      }
    });

    await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
    await page.getByRole("link", { name: /citizen services/i }).waitFor();
    await page.getByRole("link", { name: /officer workspace/i }).waitFor();

    await page.goto(`${baseUrl}/m`, { waitUntil: "networkidle" });
    const viewportMeta = await page.locator('meta[name="viewport"]').getAttribute("content");
    assert(!/maximum-scale|user-scalable\s*=\s*no/i.test(viewportMeta ?? ""), "citizen viewport disables zoom");
    const newRequestTab = page.getByRole("tab", { name: /new request/i });
    const trackCaseTab = page.getByRole("tab", { name: /track a case/i });
    await newRequestTab.waitFor();
    await trackCaseTab.waitFor();
    assert(await newRequestTab.getAttribute("aria-controls") === "citizen-panel-new", "New request tab is not associated with its panel");
    assert(await trackCaseTab.getAttribute("aria-controls") === "citizen-panel-track", "Track tab is not associated with its panel");
    const newRequestPanel = page.locator("#citizen-panel-new");
    const trackCasePanel = page.locator("#citizen-panel-track");
    assert(await newRequestPanel.count() === 1 && await trackCasePanel.count() === 1, "Both tab panels must remain associated in the DOM");
    assert(await newRequestPanel.isVisible() && await trackCasePanel.isHidden(), "New request panel is not the initial active panel");
    await newRequestTab.focus();
    await newRequestTab.press("ArrowRight");
    assert(await trackCaseTab.getAttribute("aria-selected") === "true", "ArrowRight did not activate the Track tab");
    assert(await trackCaseTab.evaluate((element) => document.activeElement === element), "ArrowRight did not move focus to the Track tab");
    assert(await trackCasePanel.isVisible() && await newRequestPanel.isHidden(), "Track panel did not become the active panel");
    await trackCaseTab.press("Home");
    assert(await newRequestTab.getAttribute("aria-selected") === "true", "Home did not activate the first tab");
    await newRequestTab.press("End");
    assert(await trackCaseTab.getAttribute("aria-selected") === "true", "End did not activate the last tab");
    await trackCaseTab.press("ArrowLeft");
    assert(await newRequestTab.getAttribute("aria-selected") === "true", "ArrowLeft did not return to the New request tab");
    assert((await page.locator('a[href^="/officer"]').count()) === 0, "citizen route leaks an officer link");
    assert((await page.getByText(/mock photo|attach mock/i).count()) === 0, "citizen route exposes fake media controls");

    await page.setViewportSize({ width: 320, height: 700 });
    const composeOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert(composeOverflow <= 1, `320px compose view overflows horizontally by ${composeOverflow}px`);
    await page.getByRole("button", { name: /english/i }).click();
    await page.getByLabel(/describe your request/i).fill("我要申请小食档执照，需要什么文件？");
    await page.getByRole("button", { name: /review request/i }).click();
    const reviewHeading = page.getByRole("heading", { level: 2, name: /review your request/i });
    await reviewHeading.waitFor();
    assert(await reviewHeading.evaluate((element) => document.activeElement === element), "Review heading did not receive focus after analysis");
    assert(await reviewHeading.evaluate((element) => {
      const style = getComputedStyle(element);
      return style.outlineStyle !== "none" || style.boxShadow !== "none";
    }), "Focused review heading has no visible focus indicator");
    await page.getByText(/we detected.*中文/i).waitFor();
    const reviewOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert(reviewOverflow <= 1, `320px language review overflows horizontally by ${reviewOverflow}px`);
    await trackCaseTab.click();
    await newRequestTab.click();
    assert(await newRequestTab.evaluate((element) => document.activeElement === element), "Returning to the review tab moved focus away from the selected tab");
    await page.getByRole("button", { name: /keep english/i }).click();
    await page.getByRole("button", { name: /submit request/i }).click();
    await page.waitForURL(/\/m\/cases\/CF-/);
    await page.getByRole("heading", { level: 1, name: /information needed/i }).waitFor();
    const followUpOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert(followUpOverflow <= 1, `320px needs-info follow-up overflows horizontally by ${followUpOverflow}px`);

    await page.getByLabel(/where will the business operate/i).fill("Synthetic Market A");
    await page.getByLabel(/what type of business/i).fill("Synthetic food stall");
    await page.getByLabel(/what are.*intended operating hours/i).fill("09:00 to 17:00");
    await page.getByRole("button", { name: /send details/i }).click();
    await page.getByText(/assigned to/i).waitFor();
    assert((await page.locator('a[href^="/officer"]').count()) === 0, "tracking route leaks an officer link");

    const citizenRef = decodeURIComponent(new URL(page.url()).pathname.split("/").filter(Boolean).at(-1));
    await page.goto(`${baseUrl}/m`, { waitUntil: "networkidle" });
    const homeOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert(homeOverflow <= 1, `320px citizen home overflows horizontally by ${homeOverflow}px`);
    await page.getByRole("tab", { name: /track a case/i }).click();
    await page.getByRole("tabpanel", { name: /track a case/i }).waitFor();
    await page.getByLabel(/tracking code/i).fill(citizenRef.toLowerCase());
    await Promise.all([
      page.waitForURL(`${baseUrl}/m/cases/${citizenRef}`),
      page.getByRole("button", { name: /view case status/i }).click(),
    ]);
    await page.getByText(citizenRef, { exact: true }).first().waitFor();
    assert((await page.locator('a[href^="/officer"]').count()) === 0, "Track flow exposes an officer link");
    const trackingOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert(trackingOverflow <= 1, `320px tracked case overflows horizontally by ${trackingOverflow}px`);
    assert(failures.length === 0, failures.join("\n"));
    console.log("Citizen UI smoke passed");
  } finally {
    if (browser) await browser.close();
    if (server) {
      server.kill("SIGTERM");
      await sleep(800);
      if (!server.killed) server.kill("SIGKILL");
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
