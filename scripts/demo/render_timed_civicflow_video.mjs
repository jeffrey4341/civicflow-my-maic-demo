import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const outputRoot = resolve(repoRoot, "outputs", "manual-20260615-civicflow-video-timed");
const frameDir = join(outputRoot, "frames");
const audioDir = join(outputRoot, "audio");
const segmentDir = join(outputRoot, "segments");
const scriptDir = join(outputRoot, "script");
const finalDir = join(outputRoot, "video");
const finalVideo = join(finalDir, "civicflow-my-mobile-demo-edge-ava-3min-timed.mp4");
const metadataPath = join(outputRoot, "civicflow-my-mobile-demo-edge-ava-3min-timed.metadata.json");
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

const sections = [
  {
    id: "01-opening",
    timecode: "0:00-0:15",
    duration: 15,
    eyebrow: "OPENING",
    title: "CivicFlow MY Mobile",
    visualText:
      "Governed workflow for Malaysian public agencies: AI drafts, humans decide, every case is auditable.",
    narration:
      "CivicFlow MY Mobile is a multilingual citizen-service AI casework platform for Malaysian public agencies. It is not a government chatbot. It is a governed workflow system where AI drafts, humans decide and every case is auditable.",
    badge: "Citizen app + officer console",
    quote: null,
    cards: [
      ["Citizen mobile app", "Multilingual service intake"],
      ["Officer console", "Routing, approvals, replies, and audit"],
      ["Governance", "AI drafts. Humans decide."],
    ],
  },
  {
    id: "02-malay-drainage",
    timecode: "0:15-0:45",
    duration: 30,
    eyebrow: "ACT 1 - MALAY BLOCKED-DRAIN COMPLAINT",
    title: "Malay intake with flood-risk urgency",
    visualText:
      "Malay blocked-drain report: language detected, drainage classified, flood-risk urgency identified.",
    narration:
      "First, a citizen submits a public-service request in Malay. The system detects Malay, classifies this as a drainage and flood-risk case, and prepares it for public-service routing.",
    badge: "Citizen mobile flow",
    quote: "Longkang tersumbat dekat Jalan SS2, bila hujan air naik cepat.",
    cards: [
      ["Language", "Malay detected"],
      ["Classification", "Drainage case"],
      ["Urgency", "Flood-risk identified"],
    ],
  },
  {
    id: "03-sop-rag-routing",
    timecode: "0:45-1:15",
    duration: 30,
    eyebrow: "SOP RAG + ROUTING",
    title: "SOP-grounded routing recommendation",
    visualText:
      "Officer console retrieves Drainage Response SOP, recommends Engineering / Drainage Unit, and logs the rationale.",
    narration:
      "On the officer side, CivicFlow retrieves the relevant Drainage Response SOP, recommends Engineering and the Drainage Unit, shows the flood-risk rationale and creates an audit trail. Every recommendation is grounded in synthetic SOP citations. If there is no reliable citation, the case falls back to manual review.",
    badge: "Officer console",
    quote: "Citation: Drainage Response SOP - flood-risk urgency and response routing.",
    cards: [
      ["RAG source", "Drainage Response SOP"],
      ["Department", "Engineering / Drainage Unit"],
      ["Guardrail", "Citation or manual review"],
    ],
  },
  {
    id: "04-approval-gate",
    timecode: "1:15-1:45",
    duration: 30,
    eyebrow: "APPROVAL GATE",
    title: "Supervisor approval before work proceeds",
    visualText:
      "High-risk flood case: start and close are blocked until supervisor approval is recorded.",
    narration:
      "Because this is a high-risk flood case, the officer cannot start or close the case directly. Supervisor approval is required before work can proceed. After the supervisor records a decision note, the case can move forward. The approval decision is recorded in the audit timeline.",
    badge: "Human checkpoint",
    quote: "Blocked buttons: Start work and Close case are disabled until supervisor approval.",
    cards: [
      ["Officer action", "Blocked for high risk"],
      ["Supervisor note", "Decision note entered"],
      ["Audit", "Approval event recorded"],
    ],
  },
  {
    id: "05-chinese-licence",
    timecode: "1:45-2:10",
    duration: 25,
    eyebrow: "ACT 2 - CHINESE BUSINESS LICENCE QUERY",
    title: "Business licence needs information",
    visualText:
      "Chinese licence query: route to Licensing Unit, cite FAQ, and request missing location, type, and hours.",
    narration:
      "Next, a citizen asks a business licence question in Chinese. CivicFlow detects Chinese, routes the case to the Licensing Unit, retrieves the Business Licensing FAQ and identifies missing information such as location, business type and operating hours. The case cannot be treated as normal work until the missing information is resolved.",
    badge: "Needs information",
    quote:
      "\u6211\u8981\u7533\u8bf7\u5c0f\u98df\u6863\u6267\u7167\uff0c\u9700\u8981\u4ec0\u4e48\u6587\u4ef6\uff1f",
    cards: [
      ["Language", "Chinese detected"],
      ["Routing", "Licensing Unit"],
      ["Missing info", "Location, type, hours"],
    ],
  },
  {
    id: "06-education-welfare",
    timecode: "2:10-2:35",
    duration: 25,
    eyebrow: "ACT 3 - ENGLISH EDUCATION / WELFARE AID",
    title: "Officer review, not auto-approval",
    visualText:
      "Education aid query: retrieve welfare policy, prepare checklist, and keep eligibility with officers.",
    narration:
      "Finally, a citizen asks about education aid. CivicFlow retrieves the welfare and education policy, prepares a document checklist and routes the case for officer review. The AI does not approve eligibility. It helps officers review the case with evidence.",
    badge: "Eligibility control",
    quote: "Can I apply for education aid for my child?",
    cards: [
      ["Policy", "Welfare and education policy"],
      ["Checklist", "Documents prepared for review"],
      ["Boundary", "No automatic eligibility approval"],
    ],
  },
  {
    id: "07-audit-safety",
    timecode: "2:35-2:55",
    duration: 20,
    eyebrow: "AUDIT AND SAFETY",
    title: "Every step is visible",
    visualText:
      "Audit view shows creation, detection, classification, retrieval, routing, approval, draft, and status changes.",
    narration:
      "Every step is visible: case creation, language detection, classification, retrieval, routing, approval, reply draft and status changes. This is the public-sector control layer: multilingual intake, SOP-grounded AI, human approval and audit evidence.",
    badge: "Open /officer/audit",
    timeline: [
      "case.creation",
      "language.detected",
      "classification.completed",
      "sop.retrieved",
      "routing.recommended",
      "approval.recorded",
      "reply.drafted",
      "status.changed",
    ],
  },
  {
    id: "08-closing",
    timecode: "2:55-3:00",
    duration: 5,
    eyebrow: "CLOSING",
    title: "AI drafts. Humans decide. Every case is traceable.",
    visualText: "Modernise citizen service while preserving accountability.",
    narration:
      "CivicFlow MY Mobile helps public agencies modernise citizen service while preserving accountability. AI drafts. Humans decide. Every case is traceable.",
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
  return `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" font-weight="${weight}" font-family="Segoe UI, Microsoft YaHei, Arial, sans-serif">${lines
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

function renderSectionSvg(section) {
  const colors = ["#06b6d4", "#22c55e", "#f59e0b"];
  const cardMarkup = (section.cards ?? [])
    .map(([title, body], index) => card(76 + index * 380, 444, 344, 126, title, body, colors[index % colors.length]))
    .join("\n");
  const timelineMarkup = (section.timeline ?? [])
    .map((event, index) => {
      const x = index < 4 ? 126 : 666;
      const y = 388 + (index % 4) * 42;
      return `
        <circle cx="${x}" cy="${y - 6}" r="7" fill="${colors[index % colors.length]}"/>
        ${textBlock(event, x + 28, y, { size: 20, fill: "#e5e7eb", weight: 700, maxChars: 30, maxLines: 1 })}
      `;
    })
    .join("\n");
  const quoteMarkup = section.quote
    ? `
      <rect x="76" y="358" width="1128" height="76" rx="16" fill="#111827" stroke="#334155"/>
      ${textBlock(section.quote, 104, 403, { size: section.id === "05-chinese-licence" ? 22 : 23, fill: "#ffffff", weight: 650, maxChars: 86, maxLines: 1 })}
    `
    : "";
  const middleMarkup = timelineMarkup
    ? `<rect x="76" y="358" width="1128" height="212" rx="18" fill="#090f1a" stroke="#263b5e"/>${timelineMarkup}`
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
  ${textBlock(section.eyebrow, 76, 68, { size: 17, fill: "#67e8f9", weight: 800, maxChars: 60, maxLines: 1 })}
  ${textBlock(section.title, 76, 118, { size: 35, fill: "#ffffff", weight: 800, maxChars: 52, maxLines: 2, lineHeight: 39 })}
  <rect x="76" y="200" width="1128" height="78" rx="16" fill="#0f172a" stroke="#263b5e"/>
  ${textBlock(section.visualText ?? section.narration, 104, 232, { size: 19, fill: "#dbeafe", maxChars: 112, maxLines: 2, lineHeight: 27 })}
  <rect x="76" y="304" width="366" height="44" rx="22" fill="#082f49" stroke="#0ea5e9"/>
  ${textBlock(section.badge, 104, 333, { size: 17, fill: "#e0f2fe", weight: 800, maxChars: 34, maxLines: 1 })}
  ${middleMarkup}
  <rect x="76" y="622" width="1128" height="42" rx="14" fill="#082f49" stroke="#0ea5e9"/>
  ${textBlock(`${section.timecode} - exact 3-minute demo alignment`, 104, 649, {
    size: 17,
    fill: "#e0f2fe",
    maxChars: 70,
    maxLines: 1,
  })}
  <text x="76" y="692" font-size="15" fill="#64748b" font-family="Segoe UI, Arial, sans-serif">CivicFlow MY Mobile - Edge Ava TTS - timed to the supplied 3-minute script</text>
</svg>
`;
}

function renderFrame(section) {
  const svgPath = join(frameDir, `${section.id}.svg`);
  const pngPath = join(frameDir, `${section.id}.png`);
  writeFileSync(svgPath, renderSectionSvg(section), "utf8");
  run(magickPath, [svgPath, pngPath], { capture: true });
  return { svgPath, pngPath };
}

function generateSpeech(section) {
  const textPath = join(scriptDir, `${section.id}.txt`);
  const mp3Path = join(audioDir, `${section.id}.mp3`);
  const wavPath = join(audioDir, `${section.id}.raw.wav`);
  const alignedWavPath = join(audioDir, `${section.id}.aligned-${section.duration}s.wav`);
  writeFileSync(textPath, section.narration, "utf8");
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
  const rawDuration = duration(wavPath);
  const filters = [];
  if (rawDuration > section.duration - 0.1) {
    const targetSpeechDuration = Math.max(0.5, section.duration - 0.08);
    filters.push(...atempoFilters(rawDuration / targetSpeechDuration));
  }
  filters.push(`apad=pad_dur=${section.duration}`);
  filters.push(`atrim=0:${section.duration}`);
  filters.push("asetpts=N/SR/TB");
  run(
    ffmpegPath,
    [
      "-y",
      "-v",
      "error",
      "-i",
      wavPath,
      "-af",
      filters.join(","),
      "-ar",
      "48000",
      "-ac",
      "1",
      "-c:a",
      "pcm_s16le",
      alignedWavPath,
    ],
    { capture: true },
  );
  return { textPath, mp3Path, wavPath, alignedWavPath, rawDuration, alignedDuration: duration(alignedWavPath) };
}

function atempoFilters(factor) {
  const filters = [];
  let remaining = factor;
  while (remaining > 2) {
    filters.push("atempo=2");
    remaining /= 2;
  }
  while (remaining < 0.5) {
    filters.push("atempo=0.5");
    remaining /= 0.5;
  }
  filters.push(`atempo=${remaining.toFixed(6)}`);
  return filters;
}

function duration(path) {
  const out = run(
    ffprobePath,
    ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", path],
    { capture: true },
  ).stdout.trim();
  return Number(out);
}

function makeSegmentVideo(section, pngPath, alignedWavPath) {
  const videoPath = join(segmentDir, `${section.id}.mp4`);
  run(ffmpegPath, [
    "-y",
    "-loop",
    "1",
    "-framerate",
    "30",
    "-i",
    pngPath,
    "-i",
    alignedWavPath,
    "-t",
    String(section.duration),
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
    "-t",
    String(sections.reduce((sum, section) => sum + section.duration, 0)),
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
  for (const section of sections) {
    const { pngPath } = renderFrame(section);
    const speech = generateSpeech(section);
    const segmentVideo = makeSegmentVideo(section, pngPath, speech.alignedWavPath);
    built.push({
      id: section.id,
      timecode: section.timecode,
      targetDuration: section.duration,
      title: section.title,
      narration: section.narration,
      pngPath,
      segmentVideo,
      ...speech,
      segmentDuration: duration(segmentVideo),
    });
  }

  concatSegments(built.map((item) => item.segmentVideo));
  const finalProbe = probeJson(finalVideo);
  const fullNarration = built.map((item) => `${item.timecode}\n${item.narration}`).join("\n\n");
  const fullScriptPath = join(scriptDir, "full-english-narration-timed.txt");
  writeFileSync(fullScriptPath, fullNarration, "utf8");
  writeFileSync(
    metadataPath,
    JSON.stringify(
      {
        artifact: "civicflow_my_mobile_edge_ava_3min_timed_video.v1",
        generatedAt: new Date().toISOString(),
        voice,
        rate,
        method: "section-locked to supplied 3-minute script with WAV-normalized TTS",
        finalVideo,
        fullScriptPath,
        targetDuration: sections.reduce((sum, section) => sum + section.duration, 0),
        finalProbe,
        sections: built,
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
