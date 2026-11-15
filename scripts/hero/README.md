# Hero media pipeline (local, $0)

Python 3 + Pillow + numpy + scikit-image + ffmpeg 7.1 (libx264, libx265,
libvpx-vp9, libsvtav1). Paths are absolute to the shared box
(`/workspace/portfolio-brain` is read-only source; working files go to
`/workspace/hero-encoding-report/`). Every step is idempotent and
checkpointed, so a box restart resumes.

| Step                                                                        | Script                | Output                                                                           |
| --------------------------------------------------------------------------- | --------------------- | -------------------------------------------------------------------------------- |
| 1. Lock check (sha256 of every file in the 5 lock records + locks_now26/27) | `verify_locks.py`     | `hero-encoding-report/lock_check.json`                                           |
| 2. Animated-region analysis (also proves frames = plate + layers + armrest) | `analyze.py`          | `regions.json`, `tools/anim_mask.npy`                                            |
| 3. Stage crops (copies, never touching the source)                          | `prep.py`             | `work/src/<seq>/{baked,stack}/NNN.png`                                           |
| 4. Prototype encodes                                                        | `encode.py typing e2` | `work/enc/<seq>/*`, `work/enc/state.json`                                        |
| 5. Quality / size / decode cost                                             | `quality.py`          | `quality.json`                                                                   |
| 6. Side-by-side 3x crops                                                    | `crops.py`            | `crops/SIDEBYSIDE_*.png`                                                         |
| 7. Shipped clips                                                            | `build_web_media.py`  | `app/scene/hero/media/*.mp4` + `scripts/hero/hero-media.build.json` (not served) |

Smoke test of a running build: `BASE_URL=http://localhost:3000 OUT=… node scripts/hero-smoke.mjs`.
