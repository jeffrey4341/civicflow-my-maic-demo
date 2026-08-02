import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const screenshotDir = resolve(repoRoot, "output", "playwright", "maic-smoke");
const outputParent = resolve(repoRoot, "output", "demo-video");
const publishedOutputRoot = join(outputParent, "civicflow-real-ui-179s");
const outputRoot = join(outputParent, `.civicflow-real-ui-179s.staging-${process.pid}`);
const audioDir = join(outputRoot, "audio");
const segmentDir = join(outputRoot, "segments");
const scriptDir = join(outputRoot, "script");
const finalDir = join(outputRoot, "video");
const finalVideo = join(finalDir, "civicflow-my-mobile-real-ui-demo-179s.mp4");
const metadataPath = join(outputRoot, "civicflow-my-mobile-real-ui-demo-179s.metadata.json");
const concatListPath = join(segmentDir, "concat.txt");

const tempRoot = process.env.TEMP ?? process.env.TMP ?? "C:\\Windows\\Temp";
const winGetFfmpegDir = process.env.LOCALAPPDATA
  ? join(
      process.env.LOCALAPPDATA,
      "Microsoft",
      "WinGet",
      "Packages",
      "Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe",
      "ffmpeg-8.0.1-full_build",
      "bin",
    )
  : null;
const tempFfmpegPath = join(tempRoot, "civicflow-video-tools", "node_modules", "ffmpeg-static", "ffmpeg.exe");
const tempFfprobePath = join(
  tempRoot,
  "civicflow-video-tools",
  "node_modules",
  "ffprobe-static",
  "bin",
  "win32",
  "x64",
  "ffprobe.exe",
);
const tempPythonPath = join(tempRoot, "civicflow-edge-tts-venv", "Scripts", "python.exe");
const winGetFfmpegPath = winGetFfmpegDir ? join(winGetFfmpegDir, "ffmpeg.exe") : null;
const winGetFfprobePath = winGetFfmpegDir ? join(winGetFfmpegDir, "ffprobe.exe") : null;
const ffmpegPath =
  process.env.FFMPEG_PATH ??
  (existsSync(tempFfmpegPath)
    ? tempFfmpegPath
    : winGetFfmpegPath && existsSync(winGetFfmpegPath)
      ? winGetFfmpegPath
      : "ffmpeg");
const ffprobePath =
  process.env.FFPROBE_PATH ??
  (existsSync(tempFfprobePath)
    ? tempFfprobePath
    : winGetFfprobePath && existsSync(winGetFfprobePath)
      ? winGetFfprobePath
      : "ffprobe");
const pythonPath = process.env.PYTHON ?? (existsSync(tempPythonPath) ? tempPythonPath : "python");
const voice = process.env.CIVICFLOW_TTS_VOICE ?? "en-US-AvaMultilingualNeural";
const rate = process.env.CIVICFLOW_TTS_RATE ?? "+0%";

const W = 1280;
const H = 720;
const FPS = 30;

const sections = [
  {
    id: "01-role-launcher",
    screenshot: "01-role-launcher.png",
    timecode: "0:00-0:14",
    duration: 14,
    title: "A clear path from citizen request to human decision",
    narration:
      "CivicFlow MY is a public-service casework demo for Malaysian councils. This walkthrough uses the real product interface and synthetic data only. Citizens submit requests, officers review recommendations, and supervisors decide high-risk cases.",
    scrollStart: 0,
    scrollEnd: 1,
  },
  {
    id: "02-citizen-services",
    screenshot: "02-citizen-services.png",
    timecode: "0:14-0:31",
    duration: 17,
    title: "Multilingual citizen intake",
    narration:
      "The citizen flow begins with four languages: Bahasa Melayu, English, Chinese, and Tamil. A person writes in their own words or starts from a guided example. The system detects language and service category before submission, without requiring an external model.",
    scrollStart: 0,
    scrollEnd: 1,
  },
  {
    id: "03-officer-queue",
    screenshot: "03-officer-queue.png",
    timecode: "0:31-0:47",
    duration: 16,
    title: "One operational queue across languages and services",
    narration:
      "The officer queue turns mixed-language requests into an actionable workload. Each row shows the original request, a translated reference where needed, the service, route, status, risk, and the next required human action.",
    scrollStart: 0,
    scrollEnd: 1,
  },
  {
    id: "04-drainage-governed-flow",
    screenshot: "04-drainage-governed-flow.png",
    timecode: "0:47-1:10",
    duration: 23,
    title: "Cited routing and a mandatory flood-risk checkpoint",
    narration:
      "Here is the governed Malay drainage flow. Deterministic triage detects Malay, classifies drainage and flooding, retrieves cited policy, and recommends the Engineering Drainage Unit. Flood risk triggers a supervisor checkpoint. The officer reviews the facts and reply; the system never dispatches work or closes the case by itself.",
    scrollStart: 0,
    scrollEnd: 0.48,
  },
  {
    id: "05-licence-follow-up",
    screenshot: "05-licence-follow-up.png",
    timecode: "1:10-1:32",
    duration: 22,
    title: "Chinese licence enquiry asks once for missing details",
    narration:
      "For a Chinese food-stall licence enquiry, the first revision is not treated as complete. CivicFlow identifies missing location, business type, and operating hours, then asks once for the required details. After the citizen supplies them, the officer reviews the updated facts, three cited FAQ sections, routing, and the Chinese reply draft.",
    scrollStart: 0,
    scrollEnd: 0.55,
  },
  {
    id: "06-licence-governed-closure",
    screenshot: "06-licence-governed-closure.png",
    timecode: "1:32-1:52",
    duration: 20,
    title: "Review, send, start, and close stay separate",
    narration:
      "Once the licence case is reviewed, the officer can release the reply and record the work outcome. The citizen sees a Chinese response backed by the same policy citations. Saving a review does not silently send anything: review, send, start work, and close remain separate human actions.",
    scrollStart: 0,
    scrollEnd: 0.42,
  },
  {
    id: "07-citizen-chinese-reply",
    screenshot: "07-citizen-chinese-reply.png",
    timecode: "1:52-2:07",
    duration: 15,
    title: "A multilingual, policy-backed citizen reply",
    narration:
      "The citizen-facing reply keeps the official department and policy references visible in Chinese. It also says this is a demo and not a real licence approval. That distinction is central: AI drafts service guidance; public officers remain accountable for decisions.",
    scrollStart: 0,
    scrollEnd: 1,
  },
  {
    id: "08-welfare-human-outcome",
    screenshot: "08-welfare-human-outcome.png",
    timecode: "2:07-2:27",
    duration: 20,
    title: "Welfare eligibility remains a human outcome",
    narration:
      "Education aid follows a different boundary. CivicFlow retrieves the welfare policy and prepares evidence for review, but it never decides eligibility. The screen records the human welfare outcome separately from automated classification and routing, then preserves the complete case history.",
    scrollStart: 0,
    scrollEnd: 0.47,
  },
  {
    id: "09-approval-history",
    screenshot: "09-approval-history.png",
    timecode: "2:27-2:42",
    duration: 15,
    title: "Documented supervisor decisions for high-risk cases",
    narration:
      "High-risk approvals have their own workspace. Flood-risk recommendations remain blocked until the current officer-reviewed revision receives a documented supervisor decision. The history shows who approved, what was approved, and which revision the decision applies to.",
    scrollStart: 0,
    scrollEnd: 1,
  },
  {
    id: "10-audit-trail",
    screenshot: "10-audit-trail.png",
    timecode: "2:42-2:59",
    duration: 17,
    title: "Append-only evidence for every automated and human step",
    narration:
      "Finally, the append-only audit joins every automated and human event, from submission through routing, approval, replies, and status changes. CivicFlow combines multilingual intake, cited recommendations, explicit human checkpoints, and traceable casework in an offline-ready public demo.",
    scrollStart: 0,
    scrollEnd: 0.3,
  },
];

const targetDuration = sections.reduce((sum, section) => sum + section.duration, 0);

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
  assertChildPath(outputParent, path);
  rmSync(path, { recursive: true, force: true });
  mkdirSync(path, { recursive: true });
}

function assertChildPath(parent, candidate) {
  const child = relative(resolve(parent), resolve(candidate));
  if (!child || child.startsWith("..") || isAbsolute(child)) {
    throw new Error(`Refusing filesystem mutation outside ${parent}: ${candidate}`);
  }
}

function repoPath(path) {
  return relative(repoRoot, path).replaceAll("\\", "/");
}

function publishedPath(stagedPath) {
  return join(publishedOutputRoot, relative(outputRoot, stagedPath));
}

function promoteOutput() {
  const backupRoot = join(outputParent, `.civicflow-real-ui-179s.previous-${process.pid}`);
  assertChildPath(outputParent, publishedOutputRoot);
  assertChildPath(outputParent, outputRoot);
  assertChildPath(outputParent, backupRoot);
  rmSync(backupRoot, { recursive: true, force: true });
  const hadPublishedOutput = existsSync(publishedOutputRoot);
  if (hadPublishedOutput) renameSync(publishedOutputRoot, backupRoot);
  try {
    renameSync(outputRoot, publishedOutputRoot);
  } catch (error) {
    if (hadPublishedOutput && existsSync(backupRoot)) renameSync(backupRoot, publishedOutputRoot);
    throw error;
  }
  rmSync(backupRoot, { recursive: true, force: true });
}

function screenshotPath(section) {
  const path = join(screenshotDir, section.screenshot);
  if (!existsSync(path)) {
    throw new Error(`Missing required real-UI screenshot: ${path}`);
  }
  return path;
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
  run(
    ffmpegPath,
    ["-y", "-v", "error", "-i", mp3Path, "-ar", "48000", "-ac", "1", "-c:a", "pcm_s16le", wavPath],
    { capture: true },
  );
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

function scrollFilter(section) {
  const holdSeconds = 1.25;
  const travelSeconds = Math.max(0.1, section.duration - holdSeconds * 2);
  const progress = `min(max((t-${holdSeconds})/${travelSeconds}\\,0)\\,1)`;
  const y = `(ih-oh)*(${section.scrollStart}+(${section.scrollEnd}-${section.scrollStart})*${progress})`;
  return `scale=${W}:-2:flags=lanczos,loop=loop=-1:size=1:start=0,setpts=N/(${FPS}*TB),crop=${W}:${H}:0:'${y}',setsar=1,fps=${FPS},format=yuv420p`;
}

function makeSegmentVideo(section, sourceImagePath, alignedWavPath) {
  const videoPath = join(segmentDir, `${section.id}.mp4`);
  run(
    ffmpegPath,
    [
      "-y",
      "-v",
      "error",
      "-framerate",
      String(FPS),
      "-i",
      sourceImagePath,
      "-i",
      alignedWavPath,
      "-vf",
      scrollFilter(section),
      "-t",
      String(section.duration),
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
      "-pix_fmt",
      "yuv420p",
      videoPath,
    ],
    { capture: true },
  );
  return videoPath;
}

function concatSegments(paths) {
  const contents = paths.map((path) => `file '${path.replaceAll("\\", "/").replaceAll("'", "'\\''")}'`).join("\n");
  writeFileSync(concatListPath, contents, "utf8");
  run(
    ffmpegPath,
    [
      "-y",
      "-v",
      "error",
      "-fflags",
      "+genpts",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      concatListPath,
      "-t",
      String(targetDuration),
      "-vf",
      `fps=${FPS},trim=duration=${targetDuration},setpts=PTS-STARTPTS,format=yuv420p`,
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
      `aresample=async=1:first_pts=0,atrim=duration=${targetDuration},asetpts=N/SR/TB`,
      "-r",
      String(FPS),
      "-pix_fmt",
      "yuv420p",
      "-video_track_timescale",
      "30000",
      "-movflags",
      "+faststart",
      finalVideo,
    ],
    { capture: true },
  );
}

function probeJson(path) {
  return JSON.parse(
    run(
      ffprobePath,
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration,size:stream=index,codec_type,codec_name,duration,width,height,pix_fmt,r_frame_rate,sample_rate,channels",
        "-of",
        "json",
        path,
      ],
      { capture: true },
    ).stdout,
  );
}

function verifyFinalProbe(finalProbe) {
  const finalDuration = Number(finalProbe.format?.duration);
  const videoStream = finalProbe.streams?.find((stream) => stream.codec_type === "video");
  const audioStream = finalProbe.streams?.find((stream) => stream.codec_type === "audio");
  if (!(finalDuration >= 178.9 && finalDuration < 180)) {
    throw new Error(`Final container duration must be nominally 179s and strictly below 180s; got ${finalDuration}`);
  }
  if (
    videoStream?.codec_name !== "h264"
    || videoStream.width !== W
    || videoStream.height !== H
    || videoStream.pix_fmt !== "yuv420p"
    || videoStream.r_frame_rate !== `${FPS}/1`
  ) {
    throw new Error(`Final video stream must be H.264 ${W}x${H}; got ${JSON.stringify(videoStream)}`);
  }
  if (audioStream?.codec_name !== "aac" || audioStream.sample_rate !== "48000" || audioStream.channels !== 1) {
    throw new Error(`Final audio stream must be AAC 48 kHz mono; got ${JSON.stringify(audioStream)}`);
  }
}

async function main() {
  if (targetDuration !== 179) {
    throw new Error(`Section durations must sum to 179 seconds; got ${targetDuration}`);
  }
  const sourceImages = sections.map((section) => screenshotPath(section));
  if (new Set(sourceImages).size !== 10) {
    throw new Error("The real-UI demo must use ten distinct screenshots");
  }

  ensureCleanDir(outputRoot);
  mkdirSync(audioDir, { recursive: true });
  mkdirSync(segmentDir, { recursive: true });
  mkdirSync(scriptDir, { recursive: true });
  mkdirSync(finalDir, { recursive: true });

  const built = [];
  for (const [index, section] of sections.entries()) {
    const sourceImagePath = sourceImages[index];
    const speech = generateSpeech(section);
    const segmentVideo = makeSegmentVideo(section, sourceImagePath, speech.alignedWavPath);
    built.push({
      id: section.id,
      timecode: section.timecode,
      targetDuration: section.duration,
      title: section.title,
      narration: section.narration,
      sourceImagePath,
      scrollStart: section.scrollStart,
      scrollEnd: section.scrollEnd,
      segmentVideo,
      ...speech,
      segmentDuration: duration(segmentVideo),
    });
  }

  concatSegments(built.map((item) => item.segmentVideo));
  const finalProbe = probeJson(finalVideo);
  verifyFinalProbe(finalProbe);

  const fullNarration = built
    .map((item) => `${item.timecode} | ${item.title}\n${item.narration}\nUI: ${repoPath(item.sourceImagePath)}`)
    .join("\n\n");
  const fullScriptPath = join(scriptDir, "full-english-narration-real-ui-179s.txt");
  writeFileSync(fullScriptPath, fullNarration, "utf8");
  const sha256 = createHash("sha256").update(readFileSync(finalVideo)).digest("hex").toUpperCase();
  const portableSections = built.map((item) => ({
    ...item,
    sourceImagePath: repoPath(item.sourceImagePath),
    segmentVideo: repoPath(publishedPath(item.segmentVideo)),
    textPath: repoPath(publishedPath(item.textPath)),
    mp3Path: repoPath(publishedPath(item.mp3Path)),
    wavPath: repoPath(publishedPath(item.wavPath)),
    alignedWavPath: repoPath(publishedPath(item.alignedWavPath)),
  }));
  writeFileSync(
    metadataPath,
    JSON.stringify(
      {
        artifact: "civicflow_my_mobile_real_ui_demo_179s.v1",
        generatedAt: new Date().toISOString(),
        voice,
        rate,
        method: "ten real Playwright UI captures with paced vertical browsing and section-locked WAV-normalized TTS",
        screenshotDir: repoPath(screenshotDir),
        finalVideo: repoPath(publishedPath(finalVideo)),
        fullScriptPath: repoPath(publishedPath(fullScriptPath)),
        sha256,
        targetDuration,
        finalProbe,
        sections: portableSections,
      },
      null,
      2,
    ),
    "utf8",
  );

  promoteOutput();
  console.log(JSON.stringify({
    finalVideo: publishedPath(finalVideo),
    metadataPath: publishedPath(metadataPath),
    sha256,
    targetDuration,
    finalProbe,
  }, null, 2));
}

main().catch((error) => {
  assertChildPath(outputParent, outputRoot);
  rmSync(outputRoot, { recursive: true, force: true });
  console.error(error);
  process.exitCode = 1;
});
