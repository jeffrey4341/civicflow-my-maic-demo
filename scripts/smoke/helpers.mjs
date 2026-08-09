import { spawn } from "node:child_process";
import { createServer } from "node:net";

const NEXT_READY_PATTERN = /\bReady in\s+\d+(?:\.\d+)?\s*(?:ms|s)\b/i;
const ANSI_ESCAPE_PATTERN = /\u001b\[[0-?]*[ -\/]*[@-~]/g;

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
  let readySettled = false;
  let settleReady;
  let outputBuffer = "";
  const ready = new Promise((resolve) => { settleReady = resolve; });
  const server = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", command, "--hostname", "127.0.0.1", "--port", String(port)],
    { cwd, stdio: ["ignore", "pipe", "pipe"] },
  );

  const finishReady = (result) => {
    if (readySettled) return;
    readySettled = true;
    settleReady(result);
  };
  const observeOutput = (chunk, stream) => {
    stream.write(`[next] ${chunk}`);
    outputBuffer = `${outputBuffer}${chunk}`.replace(ANSI_ESCAPE_PATTERN, "").slice(-8_192);
    if (NEXT_READY_PATTERN.test(outputBuffer)) finishReady({ ok: true });
  };

  server.once("error", (error) => {
    launchError = error;
    finishReady({ ok: false, error });
  });
  server.once("exit", (code, signal) => {
    finishReady({
      ok: false,
      error: new Error(`Next ${command} process exited before its ready signal (code ${code ?? "none"}, signal ${signal ?? "none"}).`),
    });
  });
  server.stdout.on("data", (chunk) => observeOutput(chunk, process.stdout));
  server.stderr.on("data", (chunk) => observeOutput(chunk, process.stderr));
  return { server, ready, getLaunchError: () => launchError };
}

function childHasExited(server) {
  return server.exitCode !== null || server.signalCode !== null;
}

function waitForReadySignal(ready, timeoutMs, label) {
  return new Promise((resolve) => {
    const timer = setTimeout(
      () => resolve({ ok: false, error: new Error(`${label} did not emit a ready signal.`) }),
      timeoutMs,
    );
    ready.then((result) => {
      clearTimeout(timer);
      resolve(result);
    });
  });
}

export async function waitForServer({ baseUrl, pathname, server, ready, getLaunchError = () => null, label = "Server" }) {
  const deadline = Date.now() + 45_000;
  if (server) {
    if (!ready) throw new Error(`${label} is missing its child-owned ready signal.`);
    const remaining = Math.max(0, deadline - Date.now());
    const readyResult = await waitForReadySignal(ready, remaining, label);
    if (!readyResult.ok) throw readyResult.error;
    if (getLaunchError()) throw getLaunchError();
    if (childHasExited(server)) {
      throw new Error(`${label} exited immediately after its ready signal (code ${server.exitCode ?? "none"}, signal ${server.signalCode ?? "none"}).`);
    }
  }

  while (Date.now() < deadline) {
    if (getLaunchError()) throw getLaunchError();
    if (server && childHasExited(server)) {
      throw new Error(`${label} exited early (code ${server.exitCode ?? "none"}, signal ${server.signalCode ?? "none"}).`);
    }
    let response = null;
    try {
      response = await fetch(`${baseUrl}${pathname}`);
    } catch {
      // The server is still starting.
    }
    if (response?.ok) {
      if (server && childHasExited(server)) {
        throw new Error(`${label} exited before ownership could be confirmed.`);
      }
      return;
    }
    await sleep(500);
  }
  throw new Error(`${label} did not become ready at ${baseUrl}`);
}

function waitForChildExit(server, timeoutMs) {
  if (childHasExited(server)) return Promise.resolve(true);
  return new Promise((resolve) => {
    let settled = false;
    let timer;
    const finish = (exited) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      server.off("exit", onExit);
      resolve(exited);
    };
    const onExit = () => finish(true);
    server.once("exit", onExit);
    timer = setTimeout(() => finish(childHasExited(server)), timeoutMs);
    if (childHasExited(server)) finish(true);
  });
}

function runTaskkill(pid) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };
    const killer = spawn("taskkill", ["/pid", String(pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
    killer.once("error", (error) => finish({ code: null, error }));
    killer.once("exit", (code) => finish({ code, error: null }));
  });
}

export async function stopServer(server) {
  if (!server?.pid || childHasExited(server)) return;
  if (process.platform === "win32") {
    if (childHasExited(server)) return;
    const result = await runTaskkill(server.pid);
    if (result.error && !childHasExited(server)) {
      throw new Error(`Could not stop owned server process ${server.pid}: ${result.error.message}`);
    }
    if (result.code !== 0 && !childHasExited(server)) {
      throw new Error(`taskkill failed for owned server process ${server.pid} with exit code ${result.code}.`);
    }
    if (!(await waitForChildExit(server, 5_000))) {
      throw new Error(`Owned server process ${server.pid} did not exit after taskkill.`);
    }
    return;
  }

  if (!server.kill("SIGTERM") && !childHasExited(server)) {
    throw new Error(`Could not send SIGTERM to owned server process ${server.pid}.`);
  }
  if (await waitForChildExit(server, 3_000)) return;
  if (!server.kill("SIGKILL") && !childHasExited(server)) {
    throw new Error(`Could not send SIGKILL to owned server process ${server.pid}.`);
  }
  if (!(await waitForChildExit(server, 3_000))) {
    throw new Error(`Owned server process ${server.pid} did not exit after SIGKILL.`);
  }
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

export function matchesResourceConsole(message, {
  baseUrl,
  pathname,
  status,
  statusText,
}) {
  if (message.type() !== "error") return false;
  const expectedText = `Failed to load resource: the server responded with a status of ${status} (${statusText})`;
  if (message.text() !== expectedText) return false;
  try {
    const location = new URL(message.location().url);
    return location.origin === new URL(baseUrl).origin && location.pathname === pathname;
  } catch {
    return false;
  }
}

export function isExpectedNextRequestAbort(request) {
  if (request.failure()?.errorText !== "net::ERR_ABORTED") return false;
  try {
    const url = new URL(request.url());
    // Cloudflare Browser Insights can abort its best-effort beacon during navigation.
    if (request.method() === "POST") return url.pathname === "/cdn-cgi/rum";
    if (request.method() !== "GET") return false;
    return url.searchParams.has("_rsc")
      || (url.pathname.startsWith("/_next/static/webpack/") && url.pathname.endsWith(".hot-update.js"));
  } catch {
    return false;
  }
}

export function watchBrowser(page, {
  baseUrl,
  isExpectedConsoleMessage = () => false,
  isExpectedResponse = () => false,
  isExpectedRequestFailure = () => false,
} = {}) {
  const failures = [];
  const origin = new URL(baseUrl).origin;
  const sameOrigin = (url) => {
    try { return new URL(url).origin === origin; } catch { return false; }
  };

  page.on("pageerror", (error) => failures.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (["warning", "error"].includes(message.type()) && !isExpectedConsoleMessage(message)) {
      failures.push(`console ${message.type()}: ${message.text()}`);
    }
  });
  page.on("requestfailed", (request) => {
    if (sameOrigin(request.url()) && !isExpectedRequestFailure(request)) {
      failures.push(`request failed: ${request.method()} ${request.url()} (${request.failure()?.errorText ?? "unknown error"})`);
    }
  });
  page.on("response", (response) => {
    if (!sameOrigin(response.url()) || response.status() < 400) return;
    if (isExpectedResponse(response)) return;
    failures.push(`HTTP ${response.status()}: ${response.request().method()} ${response.url()}`);
  });

  return () => assert(failures.length === 0, failures.join("\n"));
}
