import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";

export function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function assertPortAvailable(port) {
  await new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", () => reject(new Error(`Port ${port} is already in use; refusing to attach to a server this smoke did not start.`)));
    probe.once("listening", () => probe.close(resolve));
    probe.listen(port, "127.0.0.1");
  });
}

export function startNextServer(command, port, cwd = process.cwd()) {
  let launchError = null;
  const server = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", command, "--hostname", "127.0.0.1", "--port", String(port)],
    { cwd, stdio: ["ignore", "pipe", "pipe"] },
  );
  server.once("error", (error) => { launchError = error; });
  server.stdout.on("data", (chunk) => process.stdout.write(`[next] ${chunk}`));
  server.stderr.on("data", (chunk) => process.stderr.write(`[next] ${chunk}`));
  return { server, getLaunchError: () => launchError };
}

export async function waitForServer({ baseUrl, pathname, server, getLaunchError = () => null, label = "Server" }) {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    if (getLaunchError()) throw getLaunchError();
    if (server?.exitCode != null) throw new Error(`${label} exited early with code ${server.exitCode}.`);
    try {
      const response = await fetch(`${baseUrl}${pathname}`);
      if (response.ok) return;
    } catch {
      // The server is still starting.
    }
    await sleep(500);
  }
  throw new Error(`${label} did not become ready at ${baseUrl}`);
}

export async function stopServer(server) {
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

export async function rawRequest(baseUrl, method, endpoint, body) {
  const response = await fetch(`${baseUrl}${endpoint}`, {
    method,
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`${method} ${endpoint} returned non-JSON: ${text.slice(0, 160)}`);
  }
  return { response, json, text };
}

export async function requestJson(baseUrl, method, endpoint, body) {
  const result = await rawRequest(baseUrl, method, endpoint, body);
  if (!result.response.ok) {
    throw new Error(`${method} ${endpoint} failed with ${result.response.status}: ${result.text.slice(0, 240)}`);
  }
  return result.json;
}

export function watchBrowser(page, {
  baseUrl,
  isExpectedConsoleMessage = () => false,
  isExpectedResponse = () => false,
  isExpectedRequestFailure = () => false,
} = {}) {
  const failures = [];
  const consoleMessages = [];
  const expectedConsoleErrors = new Map();
  let consoleCursor = 0;
  const origin = new URL(baseUrl).origin;
  const sameOrigin = (url) => {
    try { return new URL(url).origin === origin; } catch { return false; }
  };

  page.on("pageerror", (error) => failures.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (["warning", "error"].includes(message.type()) && !isExpectedConsoleMessage(message)) {
      consoleMessages.push({ type: message.type(), text: message.text() });
    }
  });
  page.on("requestfailed", (request) => {
    if (sameOrigin(request.url()) && !isExpectedRequestFailure(request)) {
      failures.push(`request failed: ${request.method()} ${request.url()} (${request.failure()?.errorText ?? "unknown error"})`);
    }
  });
  page.on("response", (response) => {
    if (!sameOrigin(response.url()) || response.status() < 400) return;
    if (isExpectedResponse(response)) {
      const message = `Failed to load resource: the server responded with a status of ${response.status()} (${response.statusText()})`;
      expectedConsoleErrors.set(message, (expectedConsoleErrors.get(message) ?? 0) + 1);
      return;
    }
    failures.push(`HTTP ${response.status()}: ${response.request().method()} ${response.url()}`);
  });

  return () => {
    while (consoleCursor < consoleMessages.length) {
      const message = consoleMessages[consoleCursor++];
      const allowance = expectedConsoleErrors.get(message.text) ?? 0;
      if (message.type === "error" && allowance > 0) {
        expectedConsoleErrors.set(message.text, allowance - 1);
      } else {
        failures.push(`console ${message.type}: ${message.text}`);
      }
    }
    expectedConsoleErrors.clear();
    assert(failures.length === 0, failures.join("\n"));
  };
}
