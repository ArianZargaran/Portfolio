# Hero scene: web encoding (feat/hero-scene, local only)

Prototype and decision for putting the locked painted character on the home
page over the V12 dusk room. Built 2026-11-15 on the shared box. Nothing is
pushed or deployed. Full evidence (crops, screenshots, JSON) is in
`/workspace/hero-encoding-report/`; the pipeline is in `scripts/hero/`.

## Recommendation

**Opaque "baked" crop of the full composite, AV1 in MP4 first, H.264 MP4
fallback, laid over the SSR still with a feathered CSS mask.** Clips are
driven by the shared clock through a typed action registry.

- 576 KB for all three clips in AV1 (760 KB in H.264); the typing loop alone is 325 KB / 435 KB.
- Plays everywhere: AV1 where the browser can decode it, otherwise H.264, chosen by `<source type="…; codecs=…">`.
- No alpha needed: the crop already holds the plate, shadows, screen, spill, character and occluders in the locked order, so the compositing order is exactly the locked one.
- Hardware decode almost everywhere; software AV1 decode costs about 0.3 ms per frame at 12 fps (464x576).
- Measured in headless Chrome 156: main-thread work about 70 ms per 10 s of playback (under 1%), 4.6 MB JS heap, live 0.5 s after load on localhost.

## Locked inputs and checksums

`scripts/hero/verify_locks.py` re-hashed every file listed in the lock records
(1440x900 reference). Result **PASS, 0 mismatches**:

| Lock record                                          |      Files | In locks_now26 | In locks_now27 |
| ---------------------------------------------------- | ---------: | -------------- | -------------- |
| LOCK_PAINTED_CHAR_STILL_POLISH_V5 (still, t958 v5)   |         26 | yes            | yes            |
| LOCK_PAINTED_CHAR_TYPING_LOOP_V5_1 (typing + bounce) |       4136 | yes            | yes            |
| LOCK_PAINTED_CHAR_ACTION_E2_NOD_V3 (E2 nod)          |       1047 | absent (new)   | yes            |
| LOCK_ROOM_M2_V12 (dusk plate)                        | plate hash | yes            | yes            |
| LOCK_D4 (armrest)                                    |         29 | yes            | yes            |

- **E2 state:** LOCKED at 2026-11-15 3:14:51 PM CT (Ari card t959s5300, "Lock the calmer nod as is"). It is in locks_now27.sha (65 entries) and all 1047 files match.
- **Splice proof:** every typing and bounce frame equals plate + per-frame layers + armrest, max diff 0. Every E2 frame equals plate + E2 layers + typing loop frame (120 + i) mod 216 screen/key-spill + armrest, max diff 2.
- The source files were only read. Every derived file is a copy under `/workspace/hero-encoding-report/work/` or in this repo.

## What gets encoded

- **Animated region:** the union over typing, bounce and E2 of the pixels that ever change is x 197–620, y 295–814 (`regions.json`). Pixels outside it never change, which matches the spec's rule that pixels outside the motion zones never change.
- **Crop:** x 176, y 272, 464 x 576, on a 16 px grid. This leaves a static margin of at least 20 px on every side.
- **Reveal:** the clip fades in over 120 ms (ease-out, motion users only). The still's pose and typing frame 0 differ, so the earlier 400 ms crossfade showed a soft double exposure of the hands; at 120 ms it reads as a cut-in. The smoke test freezes the transition and saves crops at 0/25/50/75/100% (`01b_fade_*pct.png`).
- **Feather:** the mask feathers the clip edge over 12 px, inside the static margin. On the live page the ring just outside the clip matches the still with max diff 0, and the feather ring is closer to the locked plate (mean 2.7) than the WebP still is (3.6).
- **Why baked, not alpha + occluder layers:** the PLATEEXACT occluders are per frame (`a_eff = a * ca` off the flag mask), so the backrest and chair base can't be static overlays. Only the armrest is static. Baking keeps the locked order exactly: plate, contact shadow, arm shadow, screen, key spill, character, character spill, backrest, chair base, armrest. The alpha prototypes (E1, F1) put the per-frame stack in the clip and the armrest on top as a static PNG; that also works, but costs more browser support for no visible gain.

## Encoding comparison

PSNR and SSIM are measured against the lossless locked frames on the 464x576
crop. The "animated px" PSNR counts only pixels that ever move. The alpha
options score higher on the whole crop only because their static plate is
exact; on the moving pixels they match the baked crop. Decode cost is
ffmpeg software decode, one thread, best of 3.

| #   | Option (typing loop, 216 frames, 18 s, 464x576)                       |    Size | PSNR dB (crop / animated px) |  SSIM | SW decode ms/frame (1 thread) |
| --- | --------------------------------------------------------------------- | ------: | ---------------------------- | ----: | ----------------------------: |
| A1  | Baked crop, **AV1** (MP4) crf30 g72 · _shipped_                       |  325 KB | 38.33 / 37.09                | 0.968 |                          0.29 |
| A2  | Baked crop, AV1 crf34 g24                                             |  550 KB | 37.78 / 36.52                | 0.962 |                          0.37 |
| A3  | Baked crop, AV1 crf26 g24 (WebM)                                      |  781 KB | 38.27 / 37.05                | 0.967 |                          0.47 |
| B1  | Baked crop, **H.264** High crf20 g72 · _shipped fallback_             |  435 KB | 38.21 / 36.97                | 0.968 |                          0.37 |
| B2  | Baked crop, H.264 crf20 g24                                           |  943 KB | 38.0 / 36.74                 | 0.966 |                           0.5 |
| B3  | Baked crop, H.264 crf24 g24                                           |  663 KB | 37.24 / 35.87                | 0.960 |                          0.46 |
| B4  | Baked crop, H.264 crf16 g24                                           | 1308 KB | 38.44 / 37.29                | 0.970 |                          0.63 |
| C1  | Baked crop, HEVC (hvc1) crf24 g24                                     |  589 KB | 37.54 / 36.4                 | 0.961 |                          0.64 |
| C2  | Baked crop, HEVC crf20 g24                                            |  839 KB | 38.19 / 37.08                | 0.966 |                          0.75 |
| D1  | Baked crop, VP9 (WebM) crf32 g24                                      |  497 KB | 36.88 / 35.7                 | 0.953 |                          0.38 |
| D2  | Baked crop, VP9 crf24 g24                                             |  747 KB | 37.81 / 36.62                | 0.963 |                          0.43 |
| E1  | **VP9 + alpha** (WebM yuva420p) crf32, over plate                     |  375 KB | 41.05 / 36.73                | 0.981 |                          0.48 |
| F1  | H.264 **packed matte** (colour over alpha, 464x1152), WebGL composite |  590 KB | 42.01 / 37.6                 | 0.986 |                          0.61 |
| G1  | Sprite sheets, baked, **WebP** q80 (9 sheets of 6x4)                  | 6198 KB | 35.1 / 34.74                 | 0.938 |            n/a (image decode) |
| G2  | Sprite sheets, alpha, WebP q80                                        | 4146 KB | 39.67 / 35.5                 | 0.977 |            n/a (image decode) |
| H1  | Sprite sheets, baked, **AVIF** q60                                    | 4812 KB | 35.52 / 35.03                | 0.944 |            n/a (image decode) |
| H2  | Sprite sheets, alpha, AVIF q60                                        | 2917 KB | 40.66 / 36.42                | 0.982 |            n/a (image decode) |
| I1  | Animated AVIF with alpha (`<img>`, not clock-controllable)            |  166 KB | 41.68 / 37.1                 | 0.987 |            n/a (image decode) |
| I2  | Animated WebP with alpha (`<img>`)                                    | 3967 KB | 40.22 / 36.05                | 0.980 |            n/a (image decode) |

Shipped clips (`app/scene/hero/media/`, imported by `actions.ts`; Vite
content-hashes them to `/assets/<clip>.<codec>-<hash>.mp4`, served with
`Cache-Control: public, max-age=31536000, immutable` by react-router-serve and
by the `/assets/(.*)` header in `vercel.json`. Build metadata, i.e. source
frames, encoder args and sha256, is in `scripts/hero/hero-media.build.json`
and is not served):

| Clip      | Frames      |        AV1 |      H.264 |
| --------- | ----------- | ---------: | ---------: |
| typing    | 0–215 (216) |     325 KB |     435 KB |
| nod       | 48–121 (74) |     160 KB |     212 KB |
| bounce    | 72–119 (48) |      91 KB |     113 KB |
| **total** |             | **576 KB** | **760 KB** |

Side-by-side 3x crops (source, then each option) for typing f57 (ring
press), typing f200 (Harvey screen) and E2 f77 (nod peak), face, hands and
screen: `/workspace/hero-encoding-report/crops/SIDEBYSIDE_*.png`. At 1x none
of the video options shows visible loss. At 3x the H.264 crf24 and VP9 crf32
grain is a little softer. Sprite sheets at these quality settings are blockier
and 10–20x larger.

### Trade-offs and browser support (Nov 2026)

| Option                    | Support                                                                                                                                      | Alpha         | Clock control                                           | Verdict                                                                                                                    |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| AV1 MP4 (baked)           | Chrome, Edge, Firefox, Opera; Safari only on AV1 hardware (A17 Pro / M3 and later)                                                           | none needed   | `<video>` seek/play                                     | **Primary.** Smallest at equal quality.                                                                                    |
| H.264 MP4 (baked)         | Every browser, hardware decode                                                                                                               | none needed   | same                                                    | **Fallback.** Universal, about 1.3x the AV1 size.                                                                          |
| HEVC MP4 (baked)          | Safari; Chrome/Edge with hardware; Firefox partial                                                                                           | none needed   | same                                                    | Not needed: AV1 + H.264 cover it.                                                                                          |
| VP9 WebM (baked)          | Chrome, Edge, Firefox, Safari 14.1+                                                                                                          | none needed   | same                                                    | Bigger than AV1 at the same quality.                                                                                       |
| VP9 alpha WebM            | Chrome, Edge, Firefox. **Safari renders no alpha** (needs HEVC-with-alpha .mov, which this ffmpeg can't encode; it needs Apple VideoToolbox) | real          | same                                                    | Would need a second, Apple-only asset. Rejected.                                                                           |
| AV1 with alpha            | Tooling: ffmpeg 7.1 here has no yuva input for libaom or SVT-AV1. Browsers don't decode AV1 alpha in `<video>`                               | n/a           | n/a                                                     | Not possible as video.                                                                                                     |
| H.264 packed matte        | Every browser, but needs WebGL (or canvas) per frame to merge the matte                                                                      | real          | yes (draw per frame)                                    | Works, but adds a WebGL path, 2x decode height and main-thread work. Keep in reserve if a layer must be truly transparent. |
| Sprite sheets (WebP/AVIF) | Every browser                                                                                                                                | real or baked | **frame-exact**                                         | 3–6 MB per loop, and about 25 MB decoded per 6x4 sheet (about 230 MB for one loop). Rejected.                              |
| Animated AVIF             | Chrome, Firefox, Safari 16.4+                                                                                                                | real          | **none** (an `<img>` can't be seeked, paused or synced) | Tiny (166 KB), but it can't splice actions on the shared clock. Possible later for an ambient layer with no actions.       |

### Loop, keyframes and seeking

- Clips are 12 fps (the locked rate). The browser never interpolates; each video frame is one painted drawing.
- **GOP 72 (one keyframe every 6 s):** about 40% smaller than GOP 24 at higher quality, because the static plate isn't re-coded every 2 s. The cost is that a re-sync seek decodes up to 71 frames, about 20 ms in software and negligible in hardware.
- The base loop re-seeks only when it drifts more than 1.5 frames from the clock. In the smoke test that happened only on start and on tab return.
- **Action clips are trimmed:** nod i 48–121, bounce 72–119. They keep about 1 s of base-identical frames on each side, so a clip can start a frame or two late and the cut still doesn't show.

## Repo size

- Added media: 6 clips, 1.37 MB, plus 2 laptop stills, about 185 KB.
- Nothing large enters git. Git LFS or external hosting is **not needed** at this size. Revisit if per-time-of-day plates or many more actions push the media past about 20 MB; then use Vercel Blob or R2 and add the host to `media-src`.
- The CSP needs no change: `media-src 'self'` already covers the clips, and `npm run check:csp` passes on all 11 routes with the hero live.

## Timing (flag for Atlas and Ari)

- The spec's master loop is **24 s at 12 drawings/s**. The locked typing loop is **216 frames = 18 s** (MANIFEST.json `loop.seconds`), and E2 is built on that 216-frame loop.
- The site therefore runs the character on its own 18 s period, from the same shared clock: `phase = (t mod 18) / 18`.
- Clouds would still run on 72 s. 72 = 4 x 18, so a 4-cycle action rotation realigns with the clouds every 72 s. The draft rotation is typing / nod / bounce / typing.
- Either the spec is amended to an 18 s character period, or the loop is re-timed to 288 frames; both are Ari decisions.
- The room has no cloud layer or other motion zones yet. The clock exposes `CLOUD_PERIOD_S` for when they land.

## Gaps

- **Tablet and mobile:** scene.spec.yaml has no tablet or mobile composition for the V12 room. Only the laptop composition (≥1025 px) gets motion. Tablet and mobile keep the v3.2 placeholder collages, with no media requested. Each needs its own spec-driven composition and clip crop, never a crop of the laptop one.
- **Laptop hit areas** are hand estimates on the V12 still (V12 moved the poster, speaker and phone, and swapped the Lego shelf for the cabinet with the X-Wing diorama). All are marked `estimated`; Dusk should supply measured boxes.
- **Monitor content:** the Harvey hold (typing f192–23) shows a real harvey.ai screenshot (`ref/harvey_home_1440x900.png`). It's fine for local preview only; it's on the launch checklist.
