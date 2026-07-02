# English Video Rebuild - 2026-06-15

## Verdict

**PASS.** The recommended all-English demo video is now the 3-minute timed Edge Ava rebuild. It was regenerated after the first-slide overlap concern and the later audio/visual drift concern.

## Reason

The user supplied an exact 0:00-3:00 demo script. Earlier rebuilds improved the voice and cue locking, but the final requested output needed to follow the original 3-minute timecodes exactly.

This version locks every major script section to its supplied time window and forces the final MP4 to the 180-second script duration.

## Current Recommended Output

- Final MP4: `outputs/manual-20260615-civicflow-video-timed/video/civicflow-my-mobile-demo-edge-ava-3min-timed.mp4`
- Metadata: `outputs/manual-20260615-civicflow-video-timed/civicflow-my-mobile-demo-edge-ava-3min-timed.metadata.json`
- Full English narration: `outputs/manual-20260615-civicflow-video-timed/script/full-english-narration-timed.txt`
- Voice: Edge Neural TTS `en-US-AvaMultilingualNeural`
- Render script: `scripts/demo/render_timed_civicflow_video.mjs`

## Method

1. Split the user-supplied demo script into the eight original timecoded sections.
2. Generate Edge Neural TTS audio for each section.
3. Convert each TTS MP3 into WAV before measuring duration.
4. Pad, trim, or tempo-adjust each section audio to the exact section duration.
5. Generate one visual frame per section with non-overlapping layout.
6. Build one MP4 segment per section with duration locked to the script.
7. Concatenate and re-encode the final MP4 with a 180-second target duration.

## Inputs And Tools

- Voice: Edge Neural TTS `en-US-AvaMultilingualNeural`
- Temporary encoder tools: `ffmpeg-static` and `ffprobe-static` under the user temp directory
- Temporary TTS tool: `edge-tts` under a user temp Python virtual environment
- Temporary image tool: ImageMagick for SVG-to-PNG frame rendering

These tools were not added as project dependencies.

## Encoding Result

| Stream | Codec | Duration |
| --- | --- | --- |
| Video | H.264, 1280x720 | `180.066016` seconds |
| Audio | AAC mono, 48000 Hz | `180.067000` seconds |
| Container | MP4 | `180.067000` seconds |

Final MP4 size: `4,421,122` bytes.

The final audio/video difference is approximately `0.001` seconds at the tail of the container. The final container duration is within normal MP4 timestamp rounding of the 180-second target.

## Section Timing

Each source section segment matched the user-supplied script window:

| Section | Script window | Target | Aligned audio | Segment |
| --- | --- | ---: | ---: | ---: |
| `01-opening` | `0:00-0:15` | `15` | `15` | `15` |
| `02-malay-drainage` | `0:15-0:45` | `30` | `30` | `30` |
| `03-sop-rag-routing` | `0:45-1:15` | `30` | `30` | `30` |
| `04-approval-gate` | `1:15-1:45` | `30` | `30` | `30` |
| `05-chinese-licence` | `1:45-2:10` | `25` | `25` | `25` |
| `06-education-welfare` | `2:10-2:35` | `25` | `25` | `25` |
| `07-audit-safety` | `2:35-2:55` | `20` | `20` | `20` |
| `08-closing` | `2:55-3:00` | `5` | `5` | `5` |

## Verification

- Render command completed: `node scripts/demo/render_timed_civicflow_video.mjs`
- `ffprobe` confirmed one H.264 video stream and one AAC audio stream.
- `ffmpeg -v error -i ... -f null -` decoded the full final MP4 successfully with `DECODE_FULL_VIDEO_OK`.
- Sample frames were extracted at `00:00:05`, `00:00:50`, `00:01:50`, `00:02:40`, and `00:02:58`.
- Visual inspection confirmed the opening side-by-side frame no longer overlaps, the SOP citation panel no longer overlaps the badge, the Chinese query frame renders correctly, and the late audit/closing frames are not black or mislaid.

## Superseded Outputs

Earlier outputs remain on disk for audit history but are no longer recommended:

- `outputs/manual-20260615-civicflow-video/video/civicflow-my-mobile-demo-english-edge-ava.mp4`
- `outputs/manual-20260615-civicflow-video-synced/video/civicflow-my-mobile-demo-edge-ava-synced.mp4`
- `outputs/manual-20260615-civicflow-video-cue-locked/video/civicflow-my-mobile-demo-edge-ava-cue-locked.mp4`

## Notes

- This pass only rebuilt media outputs and documentation.
- No application source behavior, RAG logic, approval flow, routing logic, or audit behavior was changed.
- The closing narration is locked to the user-supplied `2:55-3:00` time window, so that short section is tempo-adjusted more aggressively than the rest of the video.
- The video uses synthetic demo content only and makes no production-readiness claim.
