import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const root = process.cwd();
const port = Number(process.env.CIVICFLOW_SMOKE_PORT || 3012);
const baseUrl = process.env.CIVICFLOW_BASE_URL || `http://127.0.0.1:${port}`;
const startServer = process.env.CIVICFLOW_SMOKE_START_SERVER !== "0" && !process.env.CIVICFLOW_BASE_URL;
const screenshotDir = path.join(root, "output", "playwright", "maic-smoke");

const cases = {
  drainage: "Longkang tersumbat dekat Jalan SS2, bila hujan air naik cepat.",
  licence: "\u6211\u8981\u7533\u8bf7\u5c0f\u98df\u6863\u6267\u7167\uff0c\u9700\u8981\u4ec0\u4e48\u6587\u4ef6\uff1f",
  welfare: "Can I apply for education aid for my child?",
  unknown: "QWERTY zzzz unrelated demo text.",
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url) {
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${url}/m`);
      if (res.ok) return;
    } catch {
      // Retry until the production server is ready.
    }
    await sleep(600);
  }
  throw new Error(`Server did not become ready at ${url}`);
}

async function requestJson(method, endpoint, body) {
  const res = await fetch(`${baseUrl}${endpoint}`, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`${method} ${endpoint} returned non-JSON: ${text.slice(0, 160)}`);
  }
  if (!res.ok) {
    throw new Error(`${method} ${endpoint} failed with ${res.status}: ${text.slice(0, 240)}`);
  }
  return json;
}

async function submitCase(text, language = "en") {
  return requestJson("POST", "/api/cases", {
    text,
    language,
    location_text: "Jalan Demo, Taman Demo",
    media_refs: ["photo:smoke-demo.jpg"],
  });
}

async function expectVisibleText(page, text, label) {
  await page.getByText(text, { exact: false }).first().waitFor({ timeout: 12000 });
  console.log(`ok: ${label}`);
}

async function main() {
  await fs.mkdir(screenshotDir, { recursive: true });

  let server = null;
  if (startServer) {
    server = spawn(
      process.execPath,
      ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)],
      { cwd: root, stdio: ["ignore", "pipe", "pipe"] },
    );
    server.stdout.on("data", (chunk) => process.stdout.write(`[next] ${chunk}`));
    server.stderr.on("data", (chunk) => process.stderr.write(`[next] ${chunk}`));
  }

  try {
    await waitForServer(baseUrl);
    const reset = await requestJson("POST", "/api/reset");
    assert(reset.ok === true, "reset endpoint did not return ok=true");

    const drainage = await submitCase(cases.drainage, "ms");
    assert(drainage.status === "awaiting_supervisor", "drainage case must await supervisor");
    assert(drainage.approval_task_id, "drainage case must create approval task");
    assert(drainage.citations.length > 0, "drainage case must include citations");

    const startAttempt = await fetch(`${baseUrl}/api/cases/${drainage.case_id}/status`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "in_progress", officer: "Smoke Officer" }),
    });
    assert(startAttempt.status === 400, "pending flood-risk case should block generic start");

    const licence = await submitCase(cases.licence, "zh");
    assert(licence.status === "needs_info", "licence case must require missing information");
    assert(
      licence.missing_info.some((item) => item.field === "location") &&
        licence.missing_info.some((item) => item.field === "business_type") &&
        licence.missing_info.some((item) => item.field === "operating_hours"),
      "licence case must include required missing fields",
    );

    const welfare = await submitCase(cases.welfare, "en");
    assert(welfare.officer_review_only === true, "welfare case must be officer-review-only");
    const closeAttempt = await fetch(`${baseUrl}/api/cases/${welfare.case_id}/status`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "closed", officer: "Smoke Officer" }),
    });
    assert(closeAttempt.status === 400, "welfare case should block generic closure");

    const unknown = await submitCase(cases.unknown, "en");
    assert(unknown.status === "manual_review", "unknown case must fall back to manual review");

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    page.on("console", (msg) => {
      if (["error", "warning"].includes(msg.type())) {
        console.log(`browser ${msg.type()}: ${msg.text()}`);
      }
    });

    await page.goto(`${baseUrl}/m`, { waitUntil: "networkidle" });
    await expectVisibleText(page, "CivicFlow MY", "citizen mobile route renders");
    await page.screenshot({ path: path.join(screenshotDir, "01-citizen-mobile.png"), fullPage: true });

    await page.goto(`${baseUrl}/officer`, { waitUntil: "networkidle" });
    await expectVisibleText(page, "Case queue", "officer queue renders");
    await expectVisibleText(page, drainage.citizen_ref, "drainage case visible in queue");
    await page.screenshot({ path: path.join(screenshotDir, "02-officer-queue.png"), fullPage: true });

    await page.goto(`${baseUrl}/officer/cases/${drainage.case_id}`, { waitUntil: "networkidle" });
    await expectVisibleText(page, "Supervisor approval required before work can start", "approval blocker visible");
    await expectVisibleText(page, "Drainage Response SOP", "drainage citation visible");
    await page.screenshot({ path: path.join(screenshotDir, "03-drainage-approval-gate.png"), fullPage: true });

    await page.goto(`${baseUrl}/officer/cases/${licence.case_id}`, { waitUntil: "networkidle" });
    await expectVisibleText(page, "Missing information must be resolved", "needs-info blocker visible");
    await expectVisibleText(page, "Business Licensing FAQ", "licensing citation visible");
    await page.screenshot({ path: path.join(screenshotDir, "04-licence-needs-info.png"), fullPage: true });

    await page.goto(`${baseUrl}/officer/cases/${welfare.case_id}`, { waitUntil: "networkidle" });
    await expectVisibleText(page, "Start officer review", "welfare officer-review action visible");
    await expectVisibleText(page, "Welfare Education Aid Policy", "welfare citation visible");
    await page.screenshot({ path: path.join(screenshotDir, "05-welfare-review.png"), fullPage: true });

    await page.goto(`${baseUrl}/officer/audit`, { waitUntil: "networkidle" });
    await expectVisibleText(page, "Audit evidence", "audit route renders");
    await expectVisibleText(page, "status.denied", "denied transition audit visible");
    await page.screenshot({ path: path.join(screenshotDir, "06-audit-evidence.png"), fullPage: true });

    await browser.close();
    console.log(`MAIC e2e smoke passed at ${baseUrl}`);
    console.log(`Screenshots: ${screenshotDir}`);
  } finally {
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
