# Hero media pipeline (local, $0)

Python 3 + Pillow + numpy + scikit-image + ffmpeg 7.1 (libx264, libx265,
libvpx-vp9, libsvtav1). Every step is idempotent and checkpointed, so a box
restart resumes.

Paths (`paths.py`, shared by every script) take a CLI flag or an env var:

| Flag           | Env var       | Default                           | What                                    |
| -------------- | ------------- | --------------------------------- | --------------------------------------- |
| `--brain DIR`  | `HERO_BRAIN`  | `/workspace/portfolio-brain`      | design source, read-only, never written |
| `--report DIR` | `HERO_REPORT` | `/workspace/hero-encoding-report` | working files and reports               |

The repo root comes from the script's own location, so any clone works. Example:
`HERO_REPORT=/tmp/hero python3 scripts/hero/prep.py` or
`python3 scripts/hero/verify_locks.py --brain ~/brain --report ./out`.

| Step                                                                          | Script                | Output                                                                           |
| ----------------------------------------------------------------------------- | --------------------- | -------------------------------------------------------------------------------- |
| 1. Lock check (sha256 of every file in the lock records + locks_now26..29)    | `verify_locks.py`     | `hero-encoding-report/lock_check.json`                                           |
| 2. Animated-region analysis (also proves frames = plate + layers + armrest)   | `analyze.py`          | `regions.json`, `tools/anim_mask.npy`                                            |
| 3. Stage crops (copies, never touching the source)                            | `prep.py`             | `work/src/<seq>/{baked,stack}/NNN.png`                                           |
| 4. Prototype encodes                                                          | `encode.py typing e2` | `work/enc/<seq>/*`, `work/enc/state.json`                                        |
| 5. Quality / size / decode cost                                               | `quality.py`          | `quality.json`                                                                   |
| 6. Side-by-side 3x crops                                                      | `crops.py`            | `crops/SIDEBYSIDE_*.png`                                                         |
| 7. Shipped clips (v5_1 only; refuses on v5_2 unless `--force-v5_1-over-v5_2`) | `build_web_media.py`  | `app/scene/hero/media/*.mp4` + `scripts/hero/hero-media.build.json` (not served) |

| 8. Entry variants + splice proofs (M9a, design A) | `variants.py <action>` | `pipeline/frames/<action>/k<join>/`, `pipeline/enc/<action>.k<join>.<sha8>.<codec>.mp4`, `pipeline/pipeline_report_<action>.json`, `pipeline/SPLICE_PROOFS_<action>.md` |

`variants.py` renders one variant per join point (f0/36/72/108/144/180) from the per-frame layers. Action frame `i` sits over base frame `(k − entry + i) mod 216`, so the layers the action doesn't paint (screen, key spill, contact shadow) keep typing. It then:

- proves both cuts at full res against the locked base frame (pass = p99.9 ≤ 4 levels and 0 px over 8);
- encodes with the shipped settings (AV1 crf 30 g72, H.264 crf 20 g72), unless the action sets a per-clip `crf` override in `ACTIONS`. Today only `nod_v4` has one: AV1 crf 32 and H.264 crf 21 (116.0 / 147.6 kB, under the 120 / 160 kB reaction cap; at crf 30 / 20 it's 128.3 / 162.8 kB). The settings used are recorded per encode in `pipeline_report_<action>.json` (`ffmpeg_args`);
- names the files by content hash.

Outputs go to `$HERO_REPORT/pipeline/`, never into the repo. Acceptance dry run: `python3 scripts/hero/variants.py nod --dry-run-against app/scene/hero/media/nod`. The native k=180 variant must match the shipped bytes within ±2 % (it currently matches byte for byte). The other joins fail the proof until their entry art exists (B2/B3): that's what the proof is for. Adding T6/S5/S4 means one `ACTIONS` entry each (layers dir, frames, entry, native join, clip range).

**M9b on the v5_2 loop (locked: LOCK_PAINTED_CHAR_TYPING_LOOP_V5_2):** `--loop v5_2` renders and proves against `painted_char_typing_t995/v5_2`, and `--out` picks the output folder (relative to `$HERO_REPORT`). The t995 entries are `typing` (the base loop itself), `nod_v4` (the E2 v4 home-pose sub-clip i60–131, f180 only), `bounce_v2`, and `s1a`/`s1b`/`t2`. The last three are Dusk's per-entry baked crops: six entries each for S1a/S1b, f180 only for T2. Each action's `joins` limits it to the entries its art allows. `--force-joins` builds other entries as proof-only evidence. Example: `python3 scripts/hero/variants.py s1a --loop v5_2 --out pipeline/m9b-dryrun-v5_2`.

Smoke test of a running build: `BASE_URL=http://localhost:3000 OUT=… node scripts/hero-smoke.mjs`.

**v5_2 install (locked, option (a)):** the clips in `app/scene/hero/media/` (`typing`, `nod.k180`, and since Ari's t1014s5523 lock `s1a.k0`…`s1a.k180`) come from `variants.py --loop v5_2`, not from `build_web_media.py`. Their records in `hero-media.build.json` point at `pipeline/m9b-dryrun-v5_2/` and, for the nod at crf 32/21, `pipeline/install-v5_2/`; its `locks` block pins LOCK_PAINTED_CHAR_TYPING_LOOP_V5_2, LOCK_PAINTED_CHAR_ACTION_E2_NOD_V4, LOCK_POSTER_M2_V3_R2 and LOCK_PAINTED_CHAR_ACTION_S1A_GLANCE_UP_V2 (s1a records point at `pipeline/m9b-dryrun-v5_2/`, reproduced from the locked frames in `pipeline/s1a-restore/reenc/`). The S1b/T2 clips are not locked and live on the local branch `hero-reactions-s1a-s1b-t2`.

**T6 install (locked: LOCK_PAINTED_CHAR_ACTION_T6_SPEAKER_GROOVE_V3, in locks_now30):** `t6.k0`…`t6.k180` are copied byte-for-byte from the lock's own encodes (`designs/painted_char_action_T6_speaker_groove_t1027/v3/encodes/` in the brain), not re-encoded here. Their records in `hero-media.build.json` carry the lock's sha256 and bytes, and `locks.t6` pins the lock record. `verify_locks.py` checks the T6 lock file-by-file (1408 files) and that locks_now30 is locks_now29 plus T6 only (70 records).
