import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const outputDir = resolve(repoRoot, "outputs", "manual-20260614-civicflow", "video");
const toolTarget = resolve(outputDir, "python-tools");
const rawVideoDir = resolve(outputDir, "raw-video");
const audioSegmentDir = resolve(outputDir, "audio-segments");
const narrationTextPath = resolve(repoRoot, "scripts", "demo", "civicflow_narration.txt");
const narrationAudioPath = resolve(outputDir, "civicflow-my-mobile-narration.mp3");
const finalVideoPath = resolve(outputDir, "civicflow-my-mobile-demo.mp4");
const thumbnailPath = resolve(outputDir, "civicflow-my-mobile-demo-thumb.png");
const metadataPath = resolve(outputDir, "civicflow-my-mobile-demo.metadata.json");
const concatListPath = resolve(audioSegmentDir, "concat.txt");
const baseUrl = process.env.CIVICFLOW_BASE_URL ?? process.env.CIVICFLOW_URL ?? "http://127.0.0.1:3000";
const voice = process.env.CIVICFLOW_TTS_VOICE ?? "en-US-JennyNeural";
const ttsRate = process.env.CIVICFLOW_TTS_RATE ?? "-5%";
const pythonExe = process.env.PYTHON ?? "python";

const DEMO_CASES = {
  drainage: {
    language: "Bahasa Melayu",
    text: "Longkang tersumbat dekat Jalan SS2, bila hujan air naik cepat.",
  },
  licence: {
    language: "\u4e2d\u6587",
    text: "\u6211\u8981\u7533\u8bf7\u5c0f\u98df\u6863\u6267\u7167\uff0c\u9700\u8981\u4ec0\u4e48\u6587\u4ef6\uff1f",
  },
  aid: {
    language: "English",
    text: "Can I apply for education aid for my child?",
  },
};

const NARRATION_SEGMENTS = [
  {
    key: "opening",
    text: [
      "CivicFlow MY Mobile is a multilingual citizen-service AI casework platform for Malaysian public agencies.",
      "It is not a government chatbot.",
      "It is a governed workflow system where AI drafts, humans decide, and every case is auditable.",
      "The screen shows the mobile citizen app and the officer console workflow.",
    ].join(" "),
  },
  {
    key: "malay",
    text: [
      "First, a citizen submits a public-service request in Malay.",
      "The message says that a drain is blocked near Jalan SS2, and that water rises quickly when it rains.",
      "The system detects Malay, classifies the issue as drainage, identifies flood-risk urgency, and prepares the case for public-service routing.",
    ].join(" "),
  },
  {
    key: "sop",
    text: [
      "On the officer side, CivicFlow retrieves the relevant Drainage Response SOP.",
      "It recommends Engineering and the Drainage Unit, shows the flood-risk rationale, and creates an audit trail.",
      "Every recommendation is grounded in synthetic SOP citations.",
      "If there is no reliable citation, the case falls back to manual review.",
    ].join(" "),
  },
  {
    key: "approval",
    text: [
      "Because this is a high-risk flood case, the officer cannot start or close the case directly.",
      "Supervisor approval is required before work can proceed.",
      "After the supervisor records a decision note and approves, the case can move forward.",
      "The approval decision is recorded in the audit timeline.",
    ].join(" "),
  },
  {
    key: "chinese",
    text: [
      "Next, a citizen asks a business licence question in Chinese.",
      "The citizen wants to know what documents are needed for a small food stall licence.",
      "CivicFlow detects Chinese, routes the case to the Licensing Unit, retrieves the Business Licensing FAQ, and identifies missing information such as location, business type, and operating hours.",
      "The case cannot be treated as normal work until the missing information is resolved.",
    ].join(" "),
  },
  {
    key: "education",
    text: [
      "Finally, a citizen asks about education aid for a child.",
      "CivicFlow retrieves the welfare and education policy, prepares a document checklist, and routes the case for officer review.",
      "The AI does not approve eligibility.",
      "It helps officers review the case with evidence.",
    ].join(" "),
  },
  {
    key: "audit",
    text: [
      "Every step is visible in the officer audit view.",
      "Case creation, language detection, classification, retrieval, routing, approval, reply draft, and status changes are all recorded.",
      "This is the public-sector control layer: multilingual intake, SOP-grounded AI, human approval, and audit evidence.",
    ].join(" "),
  },
  {
    key: "closing",
    text: [
      "CivicFlow MY Mobile helps public agencies modernise citizen service while preserving accountability.",
      "AI drafts.",
      "Humans decide.",
      "Every case is traceable.",
    ].join(" "),
  },
];

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
    env: options.env ?? process.env,
  });
  if (result.status !== 0) {
    const detail = options.capture ? `\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}` : "";
    throw new Error(`${command} ${args.join(" ")} failed with exit ${result.status}${detail}`);
  }
  return result;
}

async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch {
    throw new Error(
      "Playwright is required to regenerate the video. Install it for the demo workspace with `npm i -D playwright`.",
    );
  }
}

async function pause(ms) {
  await new Promise((resolveWait) => setTimeout(resolveWait, Math.max(0, Math.round(ms))));
}

async function expectOk(path, init) {
  const res = await fetch(`${baseUrl}${path}`, init);
  if (!res.ok) {
    throw new Error(`${baseUrl}${path} returned HTTP ${res.status}`);
  }
  return res;
}

function ensureTools() {
  mkdirSync(outputDir, { recursive: true });
  mkdirSync(toolTarget, { recursive: true });
  const env = {
    ...process.env,
    PYTHONPATH: [toolTarget, process.env.PYTHONPATH].filter(Boolean).join(";"),
  };
  const probe = spawnSync(
    pythonExe,
    ["-c", "import edge_tts, imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())"],
    { cwd: repoRoot, encoding: "utf8", env },
  );
  if (probe.status === 0) {
    return { env, ffmpegPath: probe.stdout.trim().split(/\r?\n/).at(-1) };
  }

  run(pythonExe, [
    "-m",
    "pip",
    "install",
    "--upgrade",
    "--target",
    toolTarget,
    "edge-tts",
    "imageio-ffmpeg",
  ]);

  const installed = run(
    pythonExe,
    ["-c", "import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())"],
    { capture: true, env },
  );
  return { env, ffmpegPath: installed.stdout.trim().split(/\r?\n/).at(-1) };
}

function ffmpegDurationSeconds(ffmpegPath, filePath) {
  const result = spawnSync(ffmpegPath, ["-hide_banner", "-i", filePath], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const output = `${result.stdout}\n${result.stderr}`;
  const match = output.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!match) {
    throw new Error(`Could not read duration for ${filePath}`);
  }
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
}

function audioSegmentPath(index, key) {
  return resolve(audioSegmentDir, `${String(index + 1).padStart(2, "0")}-${key}.mp3`);
}

function generateNarration(env, ffmpegPath) {
  if (existsSync(audioSegmentDir)) {
    rmSync(audioSegmentDir, { recursive: true, force: true });
  }
  mkdirSync(audioSegmentDir, { recursive: true });
  writeFileSync(narrationTextPath, NARRATION_SEGMENTS.map((segment) => segment.text).join("\n\n"), "utf8");

  const segmentRows = [];
  for (const [index, segment] of NARRATION_SEGMENTS.entries()) {
    const textPath = resolve(audioSegmentDir, `${String(index + 1).padStart(2, "0")}-${segment.key}.txt`);
    const outputPath = audioSegmentPath(index, segment.key);
    writeFileSync(textPath, segment.text, "utf8");

    const pythonCode = `
import asyncio
from pathlib import Path
import edge_tts

text = Path(r"${textPath}").read_text(encoding="utf-8")
output = r"${outputPath}"
voice = "${voice}"
rate = "${ttsRate}"

async def main():
    communicate = edge_tts.Communicate(text, voice=voice, rate=rate)
    await communicate.save(output)

asyncio.run(main())
`;
    run(pythonExe, ["-c", pythonCode], { env });
    segmentRows.push({ ...segment, path: outputPath, duration: ffmpegDurationSeconds(ffmpegPath, outputPath) });
  }

  const concatList = segmentRows
    .map((segment) => `file '${segment.path.replace(/\\/g, "/").replace(/'/g, "'\\''")}'`)
    .join("\n");
  writeFileSync(concatListPath, `${concatList}\n`, "utf8");
  run(ffmpegPath, ["-y", "-f", "concat", "-safe", "0", "-i", concatListPath, "-c", "copy", narrationAudioPath]);

  let cursor = 0;
  const timeline = {};
  for (const segment of segmentRows) {
    timeline[segment.key] = {
      start: cursor,
      duration: segment.duration,
      end: cursor + segment.duration,
    };
    cursor += segment.duration;
  }

  return {
    timeline,
    totalAudioDuration: ffmpegDurationSeconds(ffmpegPath, narrationAudioPath),
    segments: segmentRows.map(({ key, duration, path }) => ({ key, duration, path })),
  };
}

function within(timeline, key, ratio) {
  const segment = timeline[key];
  return segment.start + segment.duration * ratio;
}

async function submitCitizenCase(page, demoCase, timeline) {
  const holdUntil = timeline.holdUntil;
  await page.goto(`${baseUrl}/m`, { waitUntil: "domcontentloaded" });
  await pause(900);
  await page.getByRole("button", { name: demoCase.language }).click();
  await pause(500);
  await holdUntil(timeline.continueAt);
  await page.getByRole("button", { name: /Continue|Teruskan|\u7ee7\u7eed|\u0ba4\u0bca\u0b9f\u0bb0\u0bb5\u0bc1\u0bae\u0bcd/ }).click();
  await pause(700);
  await page.locator("textarea").fill(demoCase.text);
  await holdUntil(timeline.analyseAt);
  await page.getByRole("button", { name: /Analyse my request|Analisa permintaan saya|\u5206\u6790\u6211\u7684\u8bf7\u6c42/ }).click();
  await pause(1600);
  await holdUntil(timeline.submitAt);
  await page.getByRole("button", { name: /Submit case|Hantar kes|\u63d0\u4ea4\u4e2a\u6848/ }).click();
  await page.waitForURL(/\/m\/cases\//, { timeout: 15000 });
  await holdUntil(timeline.doneAt);
}

async function openOfficerCaseFromCitizenPage(page) {
  await page.locator('a[href^="/officer/cases/"]').click();
  await page.waitForURL(/\/officer\/cases\//, { timeout: 15000 });
  await pause(1000);
}

async function recordDemo(chromium, audioTiming) {
  if (existsSync(rawVideoDir)) {
    rmSync(rawVideoDir, { recursive: true, force: true });
  }
  mkdirSync(rawVideoDir, { recursive: true });

  await expectOk("/api/reset", { method: "POST" });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: rawVideoDir, size: { width: 1280, height: 720 } },
  });
  const page = await context.newPage();

  const startedAt = Date.now();
  const waitUntil = async (seconds) => {
    if (typeof seconds !== "number") return;
    const remaining = seconds * 1000 - (Date.now() - startedAt);
    if (remaining > 0) await pause(remaining);
  };

  const { timeline } = audioTiming;

  await page.goto(`${baseUrl}/m`, { waitUntil: "domcontentloaded" });
  await waitUntil(timeline.opening.end);

  await submitCitizenCase(page, DEMO_CASES.drainage, {
    holdUntil: waitUntil,
    continueAt: timeline.malay.start,
    analyseAt: within(timeline, "malay", 0.55),
    submitAt: within(timeline, "malay", 0.82),
    doneAt: timeline.sop.start - 1.5,
  });
  await openOfficerCaseFromCitizenPage(page);
  await waitUntil(timeline.approval.start);

  await page.locator("textarea").fill("Urgent flood-risk response may proceed.");
  await waitUntil(within(timeline, "approval", 0.62));
  await page.getByRole("button", { name: /Approve/ }).click();
  await waitUntil(timeline.chinese.start);

  await submitCitizenCase(page, DEMO_CASES.licence, {
    holdUntil: waitUntil,
    continueAt: timeline.chinese.start + 1.2,
    analyseAt: within(timeline, "chinese", 0.42),
    submitAt: within(timeline, "chinese", 0.62),
    doneAt: within(timeline, "chinese", 0.74),
  });
  await openOfficerCaseFromCitizenPage(page);
  await waitUntil(timeline.education.start);

  await submitCitizenCase(page, DEMO_CASES.aid, {
    holdUntil: waitUntil,
    continueAt: timeline.education.start + 1.2,
    analyseAt: within(timeline, "education", 0.45),
    submitAt: within(timeline, "education", 0.66),
    doneAt: within(timeline, "education", 0.78),
  });
  await openOfficerCaseFromCitizenPage(page);
  await waitUntil(timeline.audit.start);

  await page.goto(`${baseUrl}/officer/audit`, { waitUntil: "domcontentloaded" });
  await waitUntil(timeline.closing.end + 2);

  const video = page.video();
  await context.close();
  await browser.close();

  return video.path();
}

function combineVideo(ffmpegPath, recordedPath, audioTiming) {
  const rawVideoDuration = ffmpegDurationSeconds(ffmpegPath, recordedPath);
  const narrationDuration = ffmpegDurationSeconds(ffmpegPath, narrationAudioPath);
  const startPadDuration = audioTiming.timeline.opening.duration;
  const stopPadDuration = Math.max(0, narrationDuration + 2 - rawVideoDuration - startPadDuration);
  const videoFilter = [
    `tpad=start_mode=clone:start_duration=${startPadDuration.toFixed(3)}:stop_mode=clone:stop_duration=${stopPadDuration.toFixed(3)}`,
    "format=yuv420p",
  ].join(",");

  run(ffmpegPath, [
    "-y",
    "-i",
    recordedPath,
    "-i",
    narrationAudioPath,
    "-vf",
    videoFilter,
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "20",
    "-c:a",
    "aac",
    "-b:a",
    "160k",
    "-movflags",
    "+faststart",
    finalVideoPath,
  ]);

  run(ffmpegPath, [
    "-y",
    "-ss",
    "00:00:05",
    "-i",
    finalVideoPath,
    "-frames:v",
    "1",
    "-update",
    "1",
    thumbnailPath,
  ]);

  return {
    rawVideoDuration,
    narrationDuration,
    startPadDuration,
    stopPadDuration,
    finalTargetDuration: Math.max(narrationDuration + 2, rawVideoDuration + startPadDuration + stopPadDuration),
  };
}

function writeMetadata(recordedPath, ffmpegPath, audioTiming, videoTiming) {
  writeFileSync(
    metadataPath,
    JSON.stringify(
      {
        artifact: "civicflow_my_mobile_demo_video.v2.audio_timeline_locked",
        generatedAt: new Date().toISOString(),
        baseUrl,
        voice,
        ttsRate,
        narrationTextPath,
        narrationAudioPath,
        rawRecordedVideoPath: recordedPath,
        finalVideoPath,
        thumbnailPath,
        ffmpegPath,
        totalAudioDuration: audioTiming.totalAudioDuration,
        timelineSeconds: audioTiming.timeline,
        videoTiming,
        segments: audioTiming.segments,
        routes: ["/m", "/officer", "/officer/approvals", "/officer/audit"],
      },
      null,
      2,
    ),
  );
}

async function main() {
  await expectOk("/m");

  const { chromium } = await loadPlaywright();
  const { env, ffmpegPath } = ensureTools();
  const audioTiming = generateNarration(env, ffmpegPath);
  const recordedPath = await recordDemo(chromium, audioTiming);
  const videoTiming = combineVideo(ffmpegPath, recordedPath, audioTiming);
  writeMetadata(recordedPath, ffmpegPath, audioTiming, videoTiming);

  const files = readdirSync(outputDir).sort();
  console.log(JSON.stringify({ finalVideoPath, metadataPath, thumbnailPath, totalAudioDuration: audioTiming.totalAudioDuration, files }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
