import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const outputRoot = resolve(repoRoot, "outputs", "manual-20260615-civicflow-video-cue-locked");
const frameDir = join(outputRoot, "frames");
const audioDir = join(outputRoot, "audio");
const segmentDir = join(outputRoot, "segments");
const scriptDir = join(outputRoot, "script");
const finalDir = join(outputRoot, "video");
const finalVideo = join(finalDir, "civicflow-my-mobile-demo-edge-ava-cue-locked.mp4");
const metadataPath = join(outputRoot, "civicflow-my-mobile-demo-edge-ava-cue-locked.metadata.json");
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

const cues = [
  {
    id: "01-platform",
    eyebrow: "OPENING",
    title: "CivicFlow MY Mobile",
    narration:
      "CivicFlow MY Mobile is a multilingual citizen-service AI casework platform for Malaysian public agencies.",
    badge: "Citizen-service workflow",
    cards: [
      ["Citizen mobile", "Multilingual intake"],
      ["Officer console", "Routing, approvals, replies, and audit"],
      ["Governance", "AI drafts. Humans decide."],
    ],
  },
  {
    id: "02-not-chatbot",
    eyebrow: "GOVERNANCE BOUNDARY",
    title: "Not a government chatbot",
    narration:
      "It is a governed workflow system where artificial intelligence drafts recommendations, human officers make decisions, and every case is auditable.",
    badge: "Drafts only",
    cards: [
      ["AI role", "Detect, classify, retrieve, recommend, and draft"],
      ["Human role", "Approve, route, review, and close"],
      ["Audit role", "Record every state change"],
    ],
  },
  {
    id: "03-side-by-side",
    eyebrow: "DEMO VIEW",
    title: "Citizen app and officer console",
    narration: "The demo shows the citizen mobile app and the officer console working together.",
    badge: "Two coordinated surfaces",
    cards: [
      ["Mobile", "Citizen request submitted"],
      ["Console", "Officer sees evidence and workflow state"],
      ["Timeline", "Case history stays traceable"],
    ],
  },
  {
    id: "04-drainage-input",
    eyebrow: "ACT 1 - MALAY DRAINAGE CASE",
    title: "Blocked drain report",
    narration: "First, a resident reports a blocked drain near Jalan SS2.",
    quote: "Blocked drain near Jalan SS2. When it rains, water rises quickly.",
    badge: "Citizen intake",
    cards: [
      ["Source", "Mobile citizen request"],
      ["Language", "Malay detected"],
      ["Risk clue", "Water rises quickly during rain"],
    ],
  },
  {
    id: "05-drainage-classification",
    eyebrow: "AI CLASSIFICATION",
    title: "Drainage and flood-risk urgency",
    narration:
      "The system detects Malay, classifies the case as drainage, and flags flood-risk urgency.",
    badge: "Flood-risk review",
    cards: [
      ["Language", "Malay"],
      ["Category", "Drainage"],
      ["Urgency", "Flood risk"],
    ],
  },
  {
    id: "06-drainage-sop",
    eyebrow: "SOP RAG",
    title: "Drainage Response SOP retrieved",
    narration: "On the officer side, CivicFlow retrieves the synthetic Drainage Response SOP.",
    badge: "Citation attached",
    cards: [
      ["Source", "Drainage Response SOP"],
      ["Section", "Urgency classification"],
      ["Evidence", "Flood-risk rationale"],
    ],
  },
  {
    id: "07-drainage-routing",
    eyebrow: "ROUTING RECOMMENDATION",
    title: "Engineering and Drainage Unit",
    narration:
      "It recommends Engineering and the Drainage Unit, with the flood-risk rationale and citation attached.",
    badge: "Recommendation only",
    cards: [
      ["Department", "Engineering"],
      ["Unit", "Drainage Unit"],
      ["Control", "Officer confirms or overrides"],
    ],
  },
  {
    id: "08-approval-block",
    eyebrow: "HUMAN CHECKPOINT",
    title: "High-risk action is blocked",
    narration:
      "Because this is a high-risk flood case, the officer cannot start or close it directly.",
    badge: "Awaiting supervisor",
    cards: [
      ["Blocked", "No direct start"],
      ["Blocked", "No direct close"],
      ["Reason", "Public-safety risk"],
    ],
  },
  {
    id: "09-approval-decision",
    eyebrow: "SUPERVISOR APPROVAL",
    title: "Decision note recorded",
    narration:
      "A supervisor records a decision note and approves the case before work can proceed.",
    badge: "Approved by human",
    cards: [
      ["Decision note", "Required"],
      ["Approval", "Supervisor action"],
      ["Audit", "Approval event logged"],
    ],
  },
  {
    id: "10-licence-query",
    eyebrow: "ACT 2 - BUSINESS LICENCE",
    title: "Food-stall licence question",
    narration: "Next, a citizen asks about documents for a small food-stall licence.",
    quote: "What documents are needed for a small food-stall licence?",
    badge: "Citizen enquiry",
    cards: [
      ["Language", "Chinese detected"],
      ["Topic", "Business licence"],
      ["Workflow", "Needs information"],
    ],
  },
  {
    id: "11-licence-routing",
    eyebrow: "LICENSING WORKFLOW",
    title: "Business Licensing FAQ retrieved",
    narration:
      "CivicFlow routes the case to the Licensing Unit and retrieves the synthetic Business Licensing FAQ.",
    badge: "FAQ citation attached",
    cards: [
      ["Department", "Licensing Unit"],
      ["Source", "Business Licensing FAQ"],
      ["Purpose", "Clarify required documents"],
    ],
  },
  {
    id: "12-licence-missing-info",
    eyebrow: "MISSING INFORMATION",
    title: "Clarification before normal work",
    narration:
      "The case is marked needs information: location, business type, and operating hours are missing.",
    badge: "Needs information",
    cards: [
      ["Missing", "Business location"],
      ["Missing", "Business type"],
      ["Missing", "Operating hours"],
    ],
  },
  {
    id: "13-education-query",
    eyebrow: "ACT 3 - EDUCATION AID",
    title: "Education aid question",
    narration: "Finally, a citizen asks about education aid for a child.",
    quote: "Can I apply for education aid for my child?",
    badge: "Officer review",
    cards: [
      ["Language", "English"],
      ["Category", "Education and welfare aid"],
      ["Boundary", "No automatic eligibility decision"],
    ],
  },
  {
    id: "14-education-checklist",
    eyebrow: "POLICY RETRIEVAL",
    title: "Checklist prepared with evidence",
    narration:
      "CivicFlow retrieves the welfare and education policy and prepares a document checklist for officer review.",
    badge: "Policy citation attached",
    cards: [
      ["Source", "Welfare Education Aid Policy"],
      ["Checklist", "Child and household details"],
      ["Review", "Officer evidence review"],
    ],
  },
  {
    id: "15-no-auto-approval",
    eyebrow: "ELIGIBILITY CONTROL",
    title: "AI does not approve eligibility",
    narration:
      "The AI does not approve eligibility. It only helps officers review the case with evidence.",
    badge: "Human decision required",
    cards: [
      ["AI output", "Draft and checklist"],
      ["Officer action", "Review and decide"],
      ["Audit", "Decision remains traceable"],
    ],
  },
  {
    id: "16-audit-events",
    eyebrow: "AUDIT VIEW",
    title: "Every step is visible",
    narration:
      "The audit view shows case creation, language detection, classification, retrieval, routing, approval, reply drafting, and status changes.",
    badge: "Append-only timeline",
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
    id: "17-control-layer",
    eyebrow: "PUBLIC-SECTOR CONTROL LAYER",
    title: "Grounded AI with human approval",
    narration:
      "This is the public-sector control layer: multilingual intake, SOP-grounded AI, human approval, and traceable evidence.",
    badge: "Accountability by design",
    cards: [
      ["Intake", "Multilingual"],
      ["AI", "SOP-grounded"],
      ["Control", "Human approval and audit evidence"],
    ],
  },
  {
    id: "18-modernise",
    eyebrow: "CLOSING",
    title: "Modern service, preserved accountability",
    narration:
      "CivicFlow MY Mobile helps public agencies modernise citizen service while preserving accountability.",
    badge: "Synthetic demo artifact",
    cards: [
      ["Modernise", "Faster casework"],
      ["Preserve", "Human responsibility"],
      ["Trace", "Auditable evidence"],
    ],
  },
  {
    id: "19-closing-line",
    eyebrow: "CLOSING",
    title: "AI drafts. Humans decide. Every case is traceable.",
    narration: "AI drafts. Humans decide. Every case is traceable.",
    badge: "CivicFlow MY Mobile",
    cards: [
      ["Draft", "AI recommends"],
      ["Decide", "Humans approve"],
      ["Trace", "Audit records every step"],
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
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="#0f172a" stroke="#263b5e" stroke-width="1.2"/>
    <rect x="${x}" y="${y}" width="6" height="${h}" rx="3" fill="${accent}"/>
    ${textBlock(title, x + 24, y + 38, { size: 18, fill: "#ffffff", weight: 700, maxChars: 32, maxLines: 1 })}
    ${textBlock(body, x + 24, y + 76, { size: 18, fill: "#cbd5e1", maxChars: 34, maxLines: 3 })}
  `;
}

function renderCueSvg(cue) {
  const colors = ["#06b6d4", "#22c55e", "#f59e0b"];
  const cardMarkup = (cue.cards ?? [])
    .map(([title, body], index) => card(76 + index * 380, 442, 344, 126, title, body, colors[index % colors.length]))
    .join("\n");
  const timelineMarkup = (cue.timeline ?? [])
    .map((event, index) => {
      const x = index < 4 ? 126 : 666;
      const y = 348 + (index % 4) * 54;
      return `
        <circle cx="${x}" cy="${y - 6}" r="7" fill="${colors[index % colors.length]}"/>
        ${textBlock(event, x + 28, y, { size: 20, fill: "#e5e7eb", weight: 700, maxChars: 28, maxLines: 1 })}
      `;
    })
    .join("\n");
  const quoteMarkup = cue.quote
    ? `
      <rect x="76" y="318" width="1128" height="74" rx="16" fill="#111827" stroke="#334155"/>
      ${textBlock(cue.quote, 104, 364, { size: 24, fill: "#ffffff", weight: 650, maxChars: 84, maxLines: 1 })}
    `
    : "";
  const middleMarkup = timelineMarkup
    ? `<rect x="76" y="304" width="1128" height="264" rx="18" fill="#090f1a" stroke="#263b5e"/>${timelineMarkup}`
    : `${quoteMarkup}${cardMarkup}`;

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
  <rect x="44" y="34" width="1192" height="132" rx="22" fill="#07111f" stroke="#1f3858"/>
  ${textBlock(cue.eyebrow, 76, 68, { size: 17, fill: "#67e8f9", weight: 800, maxChars: 50, maxLines: 1 })}
  ${textBlock(cue.title, 76, 118, { size: 36, fill: "#ffffff", weight: 800, maxChars: 50, maxLines: 2, lineHeight: 40 })}
  <rect x="76" y="200" width="1128" height="78" rx="16" fill="#0f172a" stroke="#263b5e"/>
  ${textBlock(cue.narration, 104, 232, { size: 20, fill: "#dbeafe", maxChars: 102, maxLines: 2, lineHeight: 28 })}
  <rect x="76" y="304" width="366" height="44" rx="22" fill="#082f49" stroke="#0ea5e9"/>
  ${textBlock(cue.badge, 104, 333, { size: 17, fill: "#e0f2fe", weight: 800, maxChars: 34, maxLines: 1 })}
  ${middleMarkup}
  <rect x="76" y="622" width="1128" height="42" rx="14" fill="#082f49" stroke="#0ea5e9"/>
  ${textBlock("Synthetic demo data only. AI drafts recommendations; humans make decisions.", 104, 649, {
    size: 17,
    fill: "#e0f2fe",
    maxChars: 96,
    maxLines: 1,
  })}
  <text x="76" y="692" font-size="15" fill="#64748b" font-family="Segoe UI, Arial, sans-serif">CivicFlow MY Mobile - Public hackathon demo - Cue-locked Edge Ava narration</text>
</svg>
`;
}

function renderFrame(cue) {
  const svgPath = join(frameDir, `${cue.id}.svg`);
  const pngPath = join(frameDir, `${cue.id}.png`);
  writeFileSync(svgPath, renderCueSvg(cue), "utf8");
  run(magickPath, [svgPath, pngPath], { capture: true });
  return { svgPath, pngPath };
}

function generateSpeech(cue) {
  const textPath = join(scriptDir, `${cue.id}.txt`);
  const mp3Path = join(audioDir, `${cue.id}.mp3`);
  const wavPath = join(audioDir, `${cue.id}.wav`);
  writeFileSync(textPath, cue.narration, "utf8");
  const code = `
import asyncio
from pathlib import Path
import edge_tts

text = Path(r"${textPath}").read_text(encoding="utf-8")
output = r"${mp3Path}"

async def main():
    await edge_tts.Communicate(text, voice="${voice}", rate="${rate}").save(output)

asyncio.run(main())
`;
  run(pythonPath, ["-c", code], { capture: true });
  run(ffmpegPath, ["-y", "-v", "error", "-i", mp3Path, "-ar", "48000", "-ac", "1", "-c:a", "pcm_s16le", wavPath], {
    capture: true,
  });
  return { textPath, mp3Path, wavPath };
}

function duration(path) {
  const out = run(
    ffprobePath,
    ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", path],
    { capture: true },
  ).stdout.trim();
  return Number(out);
}

function makeSegmentVideo(cue, pngPath, wavPath) {
  const videoPath = join(segmentDir, `${cue.id}.mp4`);
  run(ffmpegPath, [
    "-y",
    "-loop",
    "1",
    "-framerate",
    "30",
    "-i",
    pngPath,
    "-i",
    wavPath,
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
    "-ar",
    "48000",
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
    "-fflags",
    "+genpts",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    concatListPath,
    "-avoid_negative_ts",
    "make_zero",
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
    "-ar",
    "48000",
    "-af",
    "aresample=async=1:first_pts=0",
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
        "format=duration,size:stream=index,codec_type,codec_name,duration,width,height,sample_rate",
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
  for (const cue of cues) {
    const { pngPath } = renderFrame(cue);
    const { textPath, mp3Path, wavPath } = generateSpeech(cue);
    const segmentVideo = makeSegmentVideo(cue, pngPath, wavPath);
    built.push({
      id: cue.id,
      title: cue.title,
      narration: cue.narration,
      textPath,
      mp3Path,
      wavPath,
      pngPath,
      segmentVideo,
      wavDuration: duration(wavPath),
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
        artifact: "civicflow_my_mobile_cue_locked_edge_ava_video.v1",
        generatedAt: new Date().toISOString(),
        voice,
        rate,
        method: "cue-locked narration and visuals with WAV-normalized TTS",
        finalVideo,
        fullScriptPath,
        finalProbe,
        cues: built,
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
