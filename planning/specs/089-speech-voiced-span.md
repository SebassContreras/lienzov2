# 089 — speech-voiced-span

## Goal
`scene_generate_speech` says where the voice really starts and ends inside its clip, and can skip
the clip's leading silence, so an agent can place one clip per shot without guessing. Verification:
a Kokoro clip returns `speechStart` ≈ 0.4 s and `speechEnd` ≈ `audioDuration` − 0.6 s (measured
below); with `trimSilence: true` the new audio track's `trimOffset` equals `speechStart`; `pnpm test`
and `pnpm typecheck` pass.

## Context (Animator video `ringana-skin-perfection`, 2026-10-31)
- Six Kokoro clips (voice `af_bella`) of 4–7 words each lasted 2.2–4.2 s. `ffmpeg silencedetect`
  (−40 dB, 0.1 s) on two of them: 0.40 s and 0.43 s of silence at the start, 0.61 s and 0.57 s at
  the end. About 1 s of every clip is silence.
- The tool returns only `audioDuration`, measured from the frames (`audio-duration.ts`). Placing
  clips by `audioDuration` made them overlap in a 20 s scene, and two lines were shortened.
- Audio tracks already have `trimOffset` (`src/engine/audio/audio-export.ts`), which skips the
  start of a clip; nothing sets it.
- Subtitle cues are spread over the clip by text length (`speech-alignment.ts`), not from the
  audio, so they include the silence too.

## Principles applied
| Principle | How it shows here |
|---|---|
| 1 KISS / YAGNI | Measure and report; trim only the start, through the existing `trimOffset`; no audio re-encoding. |
| 2 SRP | A pure function finds the voiced span from samples; the tool only reports and writes `trimOffset`. |
| 5 Pure functions | `voicedSpan(samples, sampleRate, threshold)` has no I/O. |
| 9 Research | T001 settles how to get PCM samples from each provider before any design is final. |

## Requirements
- R1: `scene_generate_speech` returns `speechStart` and `speechEnd` (seconds from the clip's
  start): the first and last instant the signal is above a silence threshold (−40 dBFS,
  assumed), for every provider whose audio the tool can decode.
  Partitions: speech from the first sample (`speechStart` 0); leading and trailing silence;
  all-silent clip (both `null`, with a notice); a short pause inside the speech (not a boundary).
  Invariant: 0 ≤ `speechStart` < `speechEnd` ≤ `audioDuration`.
- R2: With `trimSilence: true` (default `false`), the written track gets `trimOffset` =
  `speechStart` (minus a 0.05 s margin, at least 0), and the cues start at `startOffset` instead
  of covering the skipped silence. Without it, nothing changes.
- R3: The tool description, README and `lienzo-usage` explain both fields and the option, and
  that the clip still ends with its trailing silence (harmless when clips overlap only in silence).

### Who it serves
Agents writing one voice clip per shot (Animator's `lienzo-animate` step 3).

### Out of scope
- Cutting the trailing silence (tracks have no end trim) and re-encoding audio.
- Word-level alignment.

### Dependencies
- None.

### Owner split
Agent tasks.

## Design
- D1 (R1) (assumed): get PCM by asking the provider for WAV when it supports it (the local
  adapter sends `response_format`, `local-adapter.ts:157–168`) and reading the samples; keep
  saving the format the caller asked for. T001 confirms per provider; a provider without WAV
  returns no span and a notice.
- D2 (R1): `voicedSpan` = first and last 10 ms window whose RMS is above the threshold.
- D3 (R2): `trimOffset` is written on the new `audioTracks` entry; in `scene.audio` mode it is
  written there too if that field supports it (T001 checks).

### Trade-offs
- D1. Pros: no decoder dependency. Cons: one more request format per call. Mitigation: if T001
  finds the provider can return both in one call, or that MP3 decoding is already available,
  use that instead and strike D1.

## Tasks
- [ ] 089/T001 [agent] Verify: which providers return WAV/PCM, whether a decoder is already in the stack, and whether `scene.audio` takes `trimOffset`; record `verified:` and revise D1/D3 through CHANGES if needed — covers R1, D1, D3
- [ ] 089/T002 [agent] `voicedSpan` with table tests on the R1 partitions (synthetic PCM) — covers R1, D2
- [ ] 089/T003 [agent] Tool returns `speechStart` / `speechEnd`; `trimSilence` writes `trimOffset` and shifts the cues — covers R1, R2
- [ ] 089/T004 [agent] Docs (R3) — covers R3
- [ ] 089/T005 [agent] Verify: Kokoro `af_bella` clip "Tested in a RINGANA study." on a test scene: span within 0.05 s of `ffmpeg silencedetect`; record `verified:` — covers R1
