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
      if (request.url().startsWith(baseUrl)) failures.push(`request failed: ${request.url()}`);
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
    await page.getByRole("tab", { name: /new request/i }).waitFor();
    await page.getByRole("tab", { name: /track a case/i }).waitFor();
    assert((await page.getByText(/officer view/i).count()) === 0, "citizen route leaks an officer link");
    assert((await page.getByText(/mock photo|attach mock/i).count()) === 0, "citizen route exposes fake media controls");

    await page.getByRole("button", { name: /english/i }).click();
    await page.getByLabel(/describe your request/i).fill("我要申请小食档执照，需要什么文件？");
    await page.getByRole("button", { name: /review request/i }).click();
    await page.getByText(/we detected.*中文/i).waitFor();
    await page.getByRole("button", { name: /keep english/i }).click();
    await page.getByRole("button", { name: /submit request/i }).click();
    await page.waitForURL(/\/m\/cases\/CF-/);
    await page.getByRole("heading", { level: 1, name: /information needed/i }).waitFor();

    await page.getByLabel(/where will the business operate/i).fill("Synthetic Market A");
    await page.getByLabel(/what type of business/i).fill("Synthetic food stall");
    await page.getByLabel(/what are.*intended operating hours/i).fill("09:00 to 17:00");
    await page.getByRole("button", { name: /send details/i }).click();
    await page.getByText(/assigned to/i).waitFor();
    assert((await page.getByText(/officer view/i).count()) === 0, "tracking route leaks an officer link");

    await page.setViewportSize({ width: 320, height: 700 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert(overflow <= 1, `320px citizen view overflows horizontally by ${overflow}px`);
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
