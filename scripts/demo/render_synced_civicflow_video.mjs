import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const outputRoot = resolve(repoRoot, "outputs", "manual-20260615-civicflow-video-synced");
const frameDir = join(outputRoot, "frames");
const audioDir = join(outputRoot, "audio");
const segmentDir = join(outputRoot, "segments");
const scriptDir = join(outputRoot, "script");
const finalDir = join(outputRoot, "video");
const finalVideo = join(finalDir, "civicflow-my-mobile-demo-edge-ava-synced.mp4");
const metadataPath = join(outputRoot, "civicflow-my-mobile-demo-edge-ava-synced.metadata.json");
const concatListPath = join(segmentDir, "concat.txt");

const tempRoot = process.env.TEMP ?? process.env.TMP ?? "C:\\Windows\\Temp";
const ffmpegPath =
  process.env.FFMPEG_PATH ??
  require(join(tempRoot, "civicflow-video-tools", "node_modules", "ffmpeg-static"));
const ffprobePath =
  process.env.FFPROBE_PATH ??
  require(join(tempRoot, "civicflow-video-tools", "node_modules", "ffprobe-static")).path;
const pythonPath =
  process.env.PYTHON ??
  join(tempRoot, "civicflow-edge-tts-venv", "Scripts", "python.exe");
const magickPath = process.env.MAGICK_PATH ?? "magick";
const voice = process.env.CIVICFLOW_TTS_VOICE ?? "en-US-AvaMultilingualNeural";
const rate = process.env.CIVICFLOW_TTS_RATE ?? "+0%";

const W = 1280;
const H = 720;

const segments = [
  {
    id: "01-opening",
    layout: "opening",
    eyebrow: "CIVICFLOW MY MOBILE",
    title: "Governed citizen-service casework",
    visualSummary:
      "Mobile citizen intake and an officer console show multilingual service requests, human decisions, and full auditability.",
    narration:
      "CivicFlow MY Mobile is a multilingual citizen-service casework demo for Malaysian public agencies. It is not a government chatbot. It is a governed workflow layer where artificial intelligence drafts recommendations, human officers make decisions, and every case is auditable.",
    panels: [
      { title: "Citizen mobile", body: "Multilingual service intake" },
      { title: "Officer console", body: "Routing, approval, replies, and audit" },
      { title: "Governance", body: "AI drafts. Humans decide." },
    ],
    footer: "Synthetic demo data only. No real citizens, no real policies, no production claim.",
  },
  {
    id: "02-malay-intake",
    eyebrow: "ACT 1 - MALAY DRAINAGE CASE",
    title: "Blocked drain reported as flood risk",
    visualSummary:
      "Malay blocked-drain report: language detected, drainage classified, flood risk flagged, and routing prepared.",
    narration:
      "First, a citizen submits a blocked drain complaint in Malay. CivicFlow detects the language, classifies the issue as drainage, identifies flood-risk urgency, and prepares the case for public-service routing.",
    request: "A resident reports a blocked drain near Jalan SS2. When it rains, water rises quickly.",
    status: "Flood-risk review",
    panels: [
      { title: "Language", body: "Malay detected" },
      { title: "Category", body: "Drainage and flooding" },
      { title: "Department", body: "Engineering - Drainage Unit" },
    ],
  },
  {
    id: "03-rag-routing",
    eyebrow: "SOP RAG + ROUTING",
    title: "Recommendation grounded in cited policy",
    visualSummary:
      "Drainage SOP evidence supports the routing recommendation and the flood-risk rationale.",
    narration:
      "On the officer side, the system retrieves the relevant synthetic Drainage Response SOP. It recommends the Engineering department and the Drainage Unit, shows the flood-risk rationale, and creates an audit trail. Every recommendation is grounded in cited policy evidence.",
    citation: {
      title: "Drainage Response SOP",
      section: "Urgency Classification",
      body: "Flood-risk: water rising quickly during rain or possible public-safety impact.",
    },
    panels: [
      { title: "Routing", body: "Engineering / Drainage Unit" },
      { title: "Evidence", body: "SOP citation attached" },
      { title: "Audit", body: "Retrieval and routing logged" },
    ],
  },
  {
    id: "04-approval-gate",
    eyebrow: "HUMAN CHECKPOINT",
    title: "Supervisor approval before work proceeds",
    visualSummary: "High-risk drainage case: supervisor approval is required before work can proceed.",
    narration:
      "Because the drainage case has public-safety risk, the officer cannot simply start or close the work. A supervisor approval gate is required. The supervisor records a decision note, then approves the case. Only after that human decision can the case move forward.",
    status: "Supervisor gate approved",
    panels: [
      { title: "Blocked action", body: "No direct start or close before approval" },
      { title: "Supervisor note", body: "Decision recorded by a human" },
      { title: "Audit event", body: "Approval and status change logged" },
    ],
  },
  {
    id: "05-licence-needs-info",
    eyebrow: "ACT 2 - BUSINESS LICENCE",
    title: "Clarification before normal work",
    visualSummary:
      "Business licence query: Licensing Unit routing plus missing details to collect before normal work.",
    narration:
      "Next, a citizen asks what documents are needed for a small food-stall licence. CivicFlow routes the case to the Licensing Unit and retrieves the synthetic Business Licensing FAQ. Instead of guessing, the system identifies three missing details: business location, business type, and operating hours.",
    status: "Needs information",
    panels: [
      { title: "Citation", body: "Business Licensing FAQ" },
      { title: "Missing detail", body: "Business location" },
      { title: "Missing detail", body: "Business type and operating hours" },
    ],
  },
  {
    id: "06-education-review",
    eyebrow: "ACT 3 - EDUCATION AID",
    title: "Officer review, not auto-approval",
    visualSummary:
      "Education aid query: document checklist prepared for officer review; no automatic eligibility approval.",
    narration:
      "Finally, a citizen asks about education aid for a child. CivicFlow retrieves the welfare and education policy, prepares a document checklist, and routes the case to the Community and Welfare department for officer review. The AI does not approve eligibility. The decision remains with a human officer.",
    status: "Routed to officer review",
    panels: [
      { title: "Citation", body: "Welfare Education Aid Policy" },
      { title: "Checklist", body: "Birth certificate, enrolment, income evidence" },
      { title: "Boundary", body: "No automatic eligibility decision" },
    ],
  },
  {
    id: "07-audit",
    eyebrow: "AUDIT AND SAFETY",
    title: "Every step is visible",
    visualSummary:
      "The audit timeline shows creation, detection, classification, retrieval, routing, approval, reply draft, and status changes.",
    narration:
      "The audit view shows the full control layer: case creation, language detection, classification, retrieval, routing, approval, reply drafting, and status changes. This is the purpose of CivicFlow MY Mobile: multilingual intake, SOP-grounded AI, human approval, and traceable public-sector evidence.",
    timeline: [
      "case.created",
      "language.detected",
      "classification.completed",
      "sop.retrieved",
      "routing.recommended",
      "approval.approved",
      "reply.drafted",
      "status.changed",
    ],
  },
  {
    id: "08-closing",
    eyebrow: "CLOSING",
    title: "AI drafts. Humans decide. Every case is traceable.",
    visualSummary:
      "CivicFlow MY Mobile modernises citizen service while preserving public-sector accountability.",
    narration:
      "CivicFlow MY Mobile helps public agencies modernise citizen service while preserving accountability. Artificial intelligence drafts, humans decide, and every case is traceable.",
    panels: [
      { title: "Multilingual intake", body: "Citizens submit in their language" },
      { title: "SOP-grounded AI", body: "Recommendations carry citations" },
      { title: "Human control", body: "Approval, eligibility, and closure stay with people" },
    ],
  },
];

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: options.encoding ?? "utf8",
    stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
    windowsHide: true,
  });
  if (result.status !== 0) {
    const detail = options.capture ? `\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}` : "";
    throw new Error(`${command} ${args.join(" ")} failed with exit ${result.status}${detail}`);
  }
  return result;
}

function ensureCleanDir(path) {
  rmSync(path, { recursive: true, force: true });
  mkdirSync(path, { recursive: true });
}

function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function wrapText(text, maxChars) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function textBlock(text, x, y, opts = {}) {
  const size = opts.size ?? 24;
  const fill = opts.fill ?? "#dbeafe";
  const weight = opts.weight ?? 400;
  const maxChars = opts.maxChars ?? 44;
  const lineHeight = opts.lineHeight ?? Math.round(size * 1.35);
  const lines = wrapText(text, maxChars).slice(0, opts.maxLines ?? 5);
  return `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" font-weight="${weight}" font-family="Segoe UI, Arial, sans-serif">${lines
    .map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : lineHeight}">${esc(line)}</tspan>`)
    .join("")}</text>`;
}

function card(x, y, w, h, title, body, accent = "#16a3b8") {
  return `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="#0f172a" stroke="#263b5e" stroke-width="1.2"/>
    <rect x="${x}" y="${y}" width="6" height="${h}" rx="3" fill="${accent}"/>
    ${textBlock(title, x + 24, y + 40, { size: 18, fill: "#ffffff", weight: 700, maxChars: 30, maxLines: 1 })}
    ${textBlock(body, x + 24, y + 76, { size: 18, fill: "#cbd5e1", maxChars: 34, maxLines: 3 })}
  `;
}

function renderOpeningSvg(segment) {
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#020617"/>
      <stop offset="0.55" stop-color="#071b2d"/>
      <stop offset="1" stop-color="#0f172a"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.22" cy="0.15" r="0.8">
      <stop offset="0" stop-color="#0e7490" stop-opacity="0.28"/>
      <stop offset="1" stop-color="#0e7490" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  ${textBlock(segment.eyebrow, 76, 78, { size: 18, fill: "#67e8f9", weight: 800, maxChars: 50, maxLines: 1 })}
  ${textBlock(segment.title, 76, 142, { size: 46, fill: "#ffffff", weight: 800, maxChars: 42, maxLines: 1 })}
  <rect x="76" y="196" width="1128" height="74" rx="16" fill="#0f172a" stroke="#263b5e"/>
  ${textBlock(segment.visualSummary, 104, 228, { size: 20, fill: "#dbeafe", maxChars: 104, maxLines: 2, lineHeight: 28 })}
  ${card(76, 328, 532, 140, "Citizen mobile", "Multilingual service intake", "#06b6d4")}
  ${card(672, 328, 532, 140, "Officer console", "Routing, approvals, reply drafts, and audit evidence", "#22c55e")}
  <rect x="76" y="512" width="1128" height="72" rx="18" fill="#111827" stroke="#334155"/>
  ${textBlock("Governance boundary", 104, 546, { size: 19, fill: "#ffffff", weight: 700, maxChars: 40, maxLines: 1 })}
  ${textBlock("AI drafts recommendations. Human officers decide. Every case is traceable.", 104, 574, {
    size: 18,
    fill: "#cbd5e1",
    maxChars: 90,
    maxLines: 1,
  })}
  <rect x="76" y="622" width="1128" height="42" rx="14" fill="#082f49" stroke="#0ea5e9"/>
  ${textBlock(segment.footer, 104, 649, { size: 17, fill: "#e0f2fe", maxChars: 94, maxLines: 1 })}
  <text x="76" y="692" font-size="15" fill="#64748b" font-family="Segoe UI, Arial, sans-serif">CivicFlow MY Mobile - Public hackathon demo - Synthetic data only</text>
</svg>
`;
}

function renderSvg(segment) {
  if (segment.layout === "opening") {
    return renderOpeningSvg(segment);
  }

  const panelCards = (segment.panels ?? [])
    .map((panel, index) => card(76 + index * 380, 430, 344, 128, panel.title, panel.body, ["#06b6d4", "#22c55e", "#f59e0b"][index % 3]))
    .join("\n");
  const timeline = (segment.timeline ?? [])
    .map((event, index) => {
      const y = 300 + index * 34;
      return `
        <circle cx="130" cy="${y - 6}" r="6" fill="${index % 2 === 0 ? "#06b6d4" : "#22c55e"}"/>
        ${textBlock(event, 154, y, { size: 18, fill: "#e5e7eb", weight: 700, maxChars: 34, maxLines: 1 })}
      `;
    })
    .join("\n");
  const request = segment.request
    ? `
      <rect x="78" y="292" width="1124" height="104" rx="18" fill="#111827" stroke="#334155"/>
      ${textBlock("Citizen request", 104, 326, { size: 17, fill: "#38bdf8", weight: 700, maxChars: 30, maxLines: 1 })}
      ${textBlock(segment.request, 104, 362, { size: 23, fill: "#f8fafc", maxChars: 78, maxLines: 2 })}
    `
    : "";
  const citation = segment.citation
    ? `
      <rect x="78" y="286" width="1124" height="126" rx="18" fill="#111827" stroke="#334155"/>
      ${textBlock(segment.citation.title, 104, 322, { size: 20, fill: "#ffffff", weight: 700, maxChars: 44, maxLines: 1 })}
      ${textBlock(`Section: ${segment.citation.section}`, 104, 356, { size: 18, fill: "#67e8f9", maxChars: 60, maxLines: 1 })}
      ${textBlock(segment.citation.body, 104, 390, { size: 19, fill: "#cbd5e1", maxChars: 86, maxLines: 2 })}
    `
    : "";
  const status = segment.status
    ? `<rect x="78" y="270" width="360" height="46" rx="23" fill="#082f49" stroke="#0ea5e9"/>\n${textBlock(segment.status, 104, 300, { size: 18, fill: "#e0f2fe", weight: 700, maxChars: 32, maxLines: 1 })}`
    : "";

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#020617"/>
      <stop offset="0.55" stop-color="#071b2d"/>
      <stop offset="1" stop-color="#0f172a"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.22" cy="0.15" r="0.8">
      <stop offset="0" stop-color="#0e7490" stop-opacity="0.28"/>
      <stop offset="1" stop-color="#0e7490" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <rect x="44" y="36" width="1192" height="92" rx="22" fill="#07111f" stroke="#1f3858"/>
  ${textBlock(segment.eyebrow, 76, 68, { size: 17, fill: "#67e8f9", weight: 800, maxChars: 50, maxLines: 1 })}
  ${textBlock(segment.title, 76, 112, { size: 38, fill: "#ffffff", weight: 800, maxChars: 48, maxLines: 2, lineHeight: 42 })}
  <rect x="76" y="168" width="1128" height="74" rx="16" fill="#0f172a" stroke="#263b5e"/>
  ${textBlock(segment.visualSummary ?? segment.narration, 102, 202, { size: 20, fill: "#cbd5e1", maxChars: 108, maxLines: 2, lineHeight: 28 })}
  ${status}
  ${request}
  ${citation}
  ${timeline ? `<rect x="78" y="276" width="520" height="330" rx="18" fill="#090f1a" stroke="#263b5e"/>${timeline}` : ""}
  ${panelCards}
  ${
    segment.footer
      ? `<rect x="76" y="594" width="1128" height="54" rx="16" fill="#082f49" stroke="#0ea5e9"/>${textBlock(segment.footer, 104, 628, {
          size: 18,
          fill: "#e0f2fe",
          maxChars: 92,
          maxLines: 1,
        })}`
      : ""
  }
  <text x="76" y="680" font-size="15" fill="#64748b" font-family="Segoe UI, Arial, sans-serif">CivicFlow MY Mobile - Public hackathon demo - Synthetic data only</text>
</svg>
`;
}

function renderFrame(segment) {
  const svgPath = join(frameDir, `${segment.id}.svg`);
  const pngPath = join(frameDir, `${segment.id}.png`);
  writeFileSync(svgPath, renderSvg(segment), "utf8");
  run(magickPath, [svgPath, pngPath], { capture: true });
  return { svgPath, pngPath };
}

function generateSpeech(segment) {
  const textPath = join(scriptDir, `${segment.id}.txt`);
  const audioPath = join(audioDir, `${segment.id}.mp3`);
  writeFileSync(textPath, segment.narration, "utf8");
  const code = `
import asyncio
from pathlib import Path
import edge_tts

text = Path(r"${textPath}").read_text(encoding="utf-8")
output = r"${audioPath}"

async def main():
    await edge_tts.Communicate(text, voice="${voice}", rate="${rate}").save(output)

asyncio.run(main())
`;
  run(pythonPath, ["-c", code], { capture: true });
  return { textPath, audioPath };
}

function duration(path) {
  const out = run(
    ffprobePath,
    ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", path],
    { capture: true },
  ).stdout.trim();
  return Number(out);
}

function makeSegmentVideo(segment, pngPath, audioPath) {
  const videoPath = join(segmentDir, `${segment.id}.mp4`);
  run(ffmpegPath, [
    "-y",
    "-loop",
    "1",
    "-framerate",
    "30",
    "-i",
    pngPath,
    "-i",
    audioPath,
    "-c:v",
    "libx264",
    "-tune",
    "stillimage",
    "-preset",
    "veryfast",
    "-crf",
    "18",
    "-c:a",
    "aac",
    "-b:a",
    "160k",
    "-pix_fmt",
    "yuv420p",
    "-shortest",
    videoPath,
  ]);
  return videoPath;
}

function concatSegments(paths) {
  const contents = paths.map((path) => `file '${path.replaceAll("\\", "/").replaceAll("'", "'\\''")}'`).join("\n");
  writeFileSync(concatListPath, contents, "utf8");
  run(ffmpegPath, [
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    concatListPath,
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "18",
    "-c:a",
    "aac",
    "-b:a",
    "160k",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    finalVideo,
  ]);
}

function probeJson(path) {
  return JSON.parse(
    run(
      ffprobePath,
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration,size:stream=index,codec_type,codec_name,duration,width,height",
        "-of",
        "json",
        path,
      ],
      { capture: true },
    ).stdout,
  );
}

async function main() {
  ensureCleanDir(outputRoot);
  mkdirSync(frameDir, { recursive: true });
  mkdirSync(audioDir, { recursive: true });
  mkdirSync(segmentDir, { recursive: true });
  mkdirSync(scriptDir, { recursive: true });
  mkdirSync(finalDir, { recursive: true });

  const built = [];
  for (const segment of segments) {
    const { pngPath } = renderFrame(segment);
    const { audioPath, textPath } = generateSpeech(segment);
    const segmentVideo = makeSegmentVideo(segment, pngPath, audioPath);
    built.push({
      id: segment.id,
      title: segment.title,
      narration: segment.narration,
      textPath,
      audioPath,
      pngPath,
      segmentVideo,
      audioDuration: duration(audioPath),
      segmentDuration: duration(segmentVideo),
    });
  }

  concatSegments(built.map((item) => item.segmentVideo));
  const finalProbe = probeJson(finalVideo);
  const fullNarration = built.map((item) => item.narration).join("\n\n");
  const fullScriptPath = join(scriptDir, "full-english-narration.txt");
  writeFileSync(fullScriptPath, fullNarration, "utf8");
  writeFileSync(
    metadataPath,
    JSON.stringify(
      {
        artifact: "civicflow_my_mobile_synced_edge_ava_video.v1",
        generatedAt: new Date().toISOString(),
        voice,
        rate,
        method: "segment-locked narration and visuals",
        finalVideo,
        fullScriptPath,
        finalProbe,
        segments: built,
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log(JSON.stringify({ finalVideo, metadataPath, finalProbe }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
