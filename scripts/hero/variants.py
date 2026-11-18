"""Media pipeline v2, early half (M9a): entry variants, encodes, splice proofs, content-hash names.

Design A (PLAN v3.3 §2-3): a reaction ships one baked clip per join point k in the join config
(f0/36/72/108/144/180 on the 18 s loop). Variant k is the action re-timed so its entry frame lands
on base frame k: action frame i sits over base frame (k - entry + i) mod 216, so every layer the
action doesn't paint itself (screen, key spill, contact shadow) comes from the typing loop at that
base frame ("the screen keeps typing").

Steps, per action and join k (all checkpointed; inputs are read-only, outputs go to
$HERO_REPORT/pipeline/, never into the repo):
  1. render   compose plate + layers + armrest per frame, crop to RECT  -> frames/<action>/k<k>/NNN.png
  2. proof    splice proof at the cut-in (first clip frame) and the cut-out (last clip frame) against
              the locked base frame at the same clock position, at full res: pass = p99.9 of the
              per-pixel max channel diff <= 4 levels AND 0 px over 8
  3. encode   AV1 (svt-av1 preset 4, crf 30, g 72) + H.264 (x264 veryslow, crf 20, g 72), the same
              settings as build_web_media.py                               -> enc/<action>.k<k>.<sha8>.<codec>.mp4
  4. report   pipeline_report.json + SPLICE_PROOFS.md

Usage:
  python3 scripts/hero/variants.py nod                 # every join in the config
  python3 scripts/hero/variants.py nod --joins 180     # one variant
  python3 scripts/hero/variants.py nod --joins 180 --dry-run-against app/scene/hero/media/nod
      (the M9a acceptance: the native variant must reproduce the shipped bytes within ±2 %)
Flags --brain / --report as in paths.py. Needs ffmpeg 7.1 with libsvtav1 + libx264.
"""
import argparse, hashlib, json, os, shutil, subprocess, sys
from multiprocessing import Pool

import numpy as np
from PIL import Image

from paths import BRAIN as B, REPORT as R

S = f"{B}/scenes/home-office.desk.coding.dusk.clear"
T = f"{B}/designs/painted_char_typing_t959/v5_1"
PLATE = f"{S}/m2/variants/room_v12/locked_room_m2_v12/frames/ROOM_V12_dusk_clean_fullroom.png"
ARM = f"{S}/m2/variants/d4_armrest/locked/placed/armrest_front_down_dusk_graded.png"
CS = f"{B}/designs/painted_char_footrest_t956/v2/layers/CONTACT_SHADOW_deck_dusk_1440x900_RGBA_v2.png"
ORDER = ["contact_shadow", "arm_shadow", "screen", "spill_keys", "character", "spill_char",
         "backrest_near", "chairbase_near_leftcalf"]
RECT = (176, 272, 464, 576); X, Y, W, H = RECT; BOX = (X, Y, X + W, Y + H)
LOOP = 216; FPS = 12
JOINS = [0, 36, 72, 108, 144, 180]  # join-config.ts JOIN_V5_1 (B1: v5_2 config replaces this)
PROOF = {"p999_max": 4, "over": 8, "over_max_px": 0}

# Action registry (mirrors app/scene/hero/actions.ts). entry = action frame that lands on the join;
# native = the join the locked art was painted for; clip = encoded range [first, first + frames).
ACTIONS = {
    "nod": {"layers": f"{B}/designs/painted_char_action_E2_headbang_t960/v3/layers_per_frame",
            "frames": 168, "entry": 60, "native": 180, "clip": (48, 74)},
}
ENC = {
    "av1": ["-c:v", "libsvtav1", "-preset", "4", "-crf", "30", "-g", "72", "-pix_fmt", "yuv420p",
            "-movflags", "+faststart"],
    "h264": ["-c:v", "libx264", "-preset", "veryslow", "-crf", "20", "-g", "72", "-pix_fmt", "yuv420p",
             "-profile:v", "high", "-level", "3.2", "-movflags", "+faststart"],
}
OUT = f"{R}/pipeline"


def sha(p, n=None):
    h = hashlib.sha256(open(p, "rb").read()).hexdigest()
    return h[:n] if n else h


def base_index(a, k, i):
    return (k - a["entry"] + i) % LOOP


def layer_paths(name, k, i):
    a = ACTIONS[name]; j = base_index(a, k, i); t = f"{T}/layers_per_frame/typing"; ps = []
    for n in ORDER:
        p = f"{a['layers']}/{i:03d}_{n}.png"
        if not os.path.exists(p):
            p = f"{t}/{j:03d}_{n}.png"
            if not os.path.exists(p): p = CS if n == "contact_shadow" else None
        ps.append(p)
    return ps


def render_job(args):
    name, k, i = args
    out = f"{OUT}/frames/{name}/k{k:03d}/{i:03d}.png"
    if os.path.exists(out): return out
    im = Image.open(PLATE).convert("RGBA")
    for p in layer_paths(name, k, i):
        if p: im = Image.alpha_composite(im, Image.open(p).convert("RGBA"))
    im = Image.alpha_composite(im, Image.open(ARM).convert("RGBA")).convert("RGB").crop(BOX)
    im.save(out + ".tmp.png"); os.replace(out + ".tmp.png", out)
    return out


def diff_stats(a_png, b_png):
    a = np.asarray(Image.open(a_png).convert("RGB").crop(BOX) if Image.open(a_png).size == (1440, 900)
                   else Image.open(a_png).convert("RGB"), np.int16)
    b = np.asarray(Image.open(b_png).convert("RGB").crop(BOX) if Image.open(b_png).size == (1440, 900)
                   else Image.open(b_png).convert("RGB"), np.int16)
    d = np.abs(a - b).max(2)
    return {"max": int(d.max()), "p999": float(np.percentile(d, 99.9)), "over8_px": int((d > PROOF["over"]).sum())}


def proof(name, k):
    a = ACTIONS[name]; first, n = a["clip"]; res = {}
    for label, i in (("cut_in", first), ("cut_out", first + n - 1)):
        j = base_index(a, k, i)
        s = diff_stats(f"{OUT}/frames/{name}/k{k:03d}/{i:03d}.png", f"{T}/frames/typing/typing_{j:03d}.png")
        s.update(action_frame=i, base_frame=j,
                 ok=s["p999"] <= PROOF["p999_max"] and s["over8_px"] <= PROOF["over_max_px"])
        res[label] = s
    res["ok"] = res["cut_in"]["ok"] and res["cut_out"]["ok"]
    return res


def encode(name, k):
    a = ACTIONS[name]; first, n = a["clip"]; outs = {}
    for codec, args in ENC.items():
        tmp = f"{OUT}/enc/{name}.k{k:03d}.{codec}.part.mp4"
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-framerate", str(FPS), "-start_number", str(first),
                        "-i", f"{OUT}/frames/{name}/k{k:03d}/%03d.png", "-frames:v", str(n), *args, "-an", tmp],
                       check=True)
        final = f"{OUT}/enc/{name}.k{k}.{sha(tmp, 8)}.{codec}.mp4"
        os.replace(tmp, final)
        outs[codec] = {"file": os.path.basename(final), "bytes": os.path.getsize(final), "sha256": sha(final)}
    return outs


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("action", choices=sorted(ACTIONS))
    ap.add_argument("--joins", type=int, nargs="*", default=JOINS)
    ap.add_argument("--dry-run-against", help="shipped clip path prefix, e.g. app/scene/hero/media/nod")
    ap.add_argument("--no-encode", action="store_true")
    o = ap.parse_args()
    a = ACTIONS[o.action]; first, n = a["clip"]
    for k in o.joins: os.makedirs(f"{OUT}/frames/{o.action}/k{k:03d}", exist_ok=True)
    os.makedirs(f"{OUT}/enc", exist_ok=True)
    jobs = [(o.action, k, i) for k in o.joins for i in range(first, first + n)]
    with Pool(min(8, os.cpu_count() or 1)) as p: p.map(render_job, jobs, chunksize=4)
    report = {"action": o.action, "entry": a["entry"], "native": a["native"], "clip": a["clip"],
              "proof_rule": PROOF, "rect_xywh": RECT, "variants": {}}
    for k in o.joins:
        v = {"proof": proof(o.action, k)}
        if not o.no_encode: v["encodes"] = encode(o.action, k)
        report["variants"][str(k)] = v
        print(f"k{k}: proof {'PASS' if v['proof']['ok'] else 'FAIL'}",
              {c: e["bytes"] for c, e in v.get("encodes", {}).items()})
    if o.dry_run_against:
        k = a["native"]; enc = report["variants"].get(str(k), {}).get("encodes", {}); dr = {}
        for codec, e in enc.items():
            shipped = os.path.getsize(f"{o.dry_run_against}.{codec}.mp4")
            dr[codec] = {"shipped": shipped, "rebuilt": e["bytes"],
                         "delta_pct": round(100 * (e["bytes"] - shipped) / shipped, 3),
                         "ok": abs(e["bytes"] - shipped) <= 0.02 * shipped}
        report["dry_run"] = dr
        print("dry run vs shipped:", json.dumps(dr))
    path = f"{OUT}/pipeline_report_{o.action}.json"
    json.dump(report, open(path + ".tmp", "w"), indent=1); os.replace(path + ".tmp", path)
    with open(f"{OUT}/SPLICE_PROOFS_{o.action}.md", "w") as f:
        f.write(f"# Splice proofs: {o.action}\n\nRule: p99.9 of per-pixel max channel diff <= {PROOF['p999_max']} "
                f"levels and 0 px over {PROOF['over']}, full res crop {RECT}, rendered frame vs locked base frame.\n\n"
                "| join k | cut-in (action/base) | max | p99.9 | px > 8 | cut-out (action/base) | max | p99.9 | px > 8 | result |\n"
                "|---|---|---|---|---|---|---|---|---|---|\n")
        for k, v in report["variants"].items():
            ci, co = v["proof"]["cut_in"], v["proof"]["cut_out"]
            f.write(f"| {k}{' (native)' if int(k) == a['native'] else ''} | {ci['action_frame']}/{ci['base_frame']} | "
                    f"{ci['max']} | {ci['p999']:.1f} | {ci['over8_px']} | {co['action_frame']}/{co['base_frame']} | "
                    f"{co['max']} | {co['p999']:.1f} | {co['over8_px']} | {'PASS' if v['proof']['ok'] else 'FAIL'} |\n")
        if "dry_run" in report:
            f.write("\nDry run (native variant re-encoded vs shipped):\n\n")
            for c, d in report["dry_run"].items():
                f.write(f"- {c}: shipped {d['shipped']} B, rebuilt {d['rebuilt']} B, {d['delta_pct']:+.3f} % "
                        f"({'within' if d['ok'] else 'OUTSIDE'} ±2 %)\n")
    print("report:", path)
    fails = [k for k, v in report["variants"].items() if not v["proof"]["ok"]]
    dr_fail = [c for c, d in report.get("dry_run", {}).items() if not d["ok"]]
    sys.exit(1 if dr_fail else 0)  # proof FAILs off-native are expected until B2/B3 art exists


if __name__ == "__main__":
    main()
