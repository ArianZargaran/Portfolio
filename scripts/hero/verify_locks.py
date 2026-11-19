#!/usr/bin/env python3
"""Read-only lock check for every asset the hero scene uses. Writes lock_check.json."""
import hashlib, json, os, sys
from paths import BRAIN as B, REPORT
S = "scenes/home-office.desk.coding.dusk.clear"
CP = f"{S}/m2/variants/char_painted"
def sha(p):
    h = hashlib.sha256()
    with open(os.path.join(B, p), "rb") as f:
        for c in iter(lambda: f.read(1 << 20), b""): h.update(c)
    return h.hexdigest()
out = {"checked_at": __import__("datetime").datetime.now().astimezone().isoformat(), "lists": {}, "locks": {}, "deps": {}}
lists = {}
for n in (26, 27, 28):
    p = f"tools/locks_now{n}.sha"
    if os.path.exists(os.path.join(B, p)):
        lists[n] = dict(reversed(l.strip().split("|", 1)) for l in open(os.path.join(B, p)) if "|" in l)
        out["lists"][p] = {"entries": len(lists[n]), "sha256": sha(p)}
latest = lists[max(lists)]
wanted = [f"{CP}/LOCK_PAINTED_CHAR_STILL_POLISH_V5.json", f"{CP}/LOCK_PAINTED_CHAR_TYPING_LOOP_V5_1.json",
          f"{CP}/LOCK_PAINTED_CHAR_ACTION_E2_NOD_V3.json", f"{S}/m2/variants/room_v12/LOCK_ROOM_M2_V12.json",
          f"{S}/m2/variants/d4_armrest/LOCK_D4.json",
          # Shipped by the locked v5_2 install (Ari t1003s5480 / t1005s5485, locks_now28):
          f"{CP}/LOCK_PAINTED_CHAR_TYPING_LOOP_V5_2.json", f"{CP}/LOCK_PAINTED_CHAR_ACTION_E2_NOD_V4.json",
          f"{S}/m2/variants/walls_top_m2/LOCK_POSTER_M2_V3_R2.json"]
mism = []
# Exact authority pins for this install; don't silently accept a rewritten list.
pins = {
    "tools/locks_now28.sha": "7c51a34fd9a085f9ed904f5dcbc3acfdab01690d5b35330a8322a3b834ba3927",
    f"{CP}/LOCK_PAINTED_CHAR_TYPING_LOOP_V5_2.json": "14563ba506716c358c08cec7e81799844084833088ac7e0fd1c2a5f085b5b712",
    f"{CP}/LOCK_PAINTED_CHAR_ACTION_E2_NOD_V4.json": "08dcd66c76b505ae386532870beabbae7ace72b27c576a88cf7e53a5375727dc",
    f"{S}/m2/variants/walls_top_m2/LOCK_POSTER_M2_V3_R2.json": "0e49dc873737a05818cd0c624f810aa2127664a4f30e7e76b9f0227f5797e5a0",
}
for p, h in pins.items():
    if sha(p) != h: mism.append(f"authority pin {p}")
if len(lists.get(28, {})) != 68: mism.append("locks_now28 must have 68 records")
for lp in wanted:
    actual = sha(lp)
    rec = {"sha256": actual, "in_lists": {n: (l.get(lp) == actual if lp in l else "absent") for n, l in lists.items()}}
    if latest.get(lp) != actual: mism.append(f"lock record {lp} hash != latest list")
    m = json.load(open(os.path.join(B, lp)))
    rec["status"] = m.get("status"); rec["locked_at_ct"] = m.get("locked_at_ct") or m.get("decided_at_ct")
    files = m.get("files")
    if isinstance(files, dict):
        base = "" if next(iter(files)).startswith(("designs/", "scenes/")) else os.path.dirname(lp) + "/"
        bad = [k for k, v in files.items() if not os.path.exists(os.path.join(B, base + k)) or sha(base + k) != v]
        rec["files"] = len(files); rec["mismatched"] = bad[:20]; rec["mismatch_count"] = len(bad)
        mism += [f"{lp}: {b}" for b in bad]
    if "frames" in m and isinstance(m["frames"], dict) and "dusk" in m["frames"]:
        fr = m["frames"]["dusk"]; ok = sha(fr["path"]) == fr["sha256"]
        rec["dusk_plate_ok"] = ok
        if not ok: mism.append(f"{lp}: dusk plate")
    # Poster R2: unlike char locks it uses explicit tool/template/sprite
    # pins, not a files dict. Check R2 (never substitute the old V3 file).
    if lp.endswith("LOCK_POSTER_M2_V3_R2.json"):
        parent = os.path.dirname(lp)
        checks = {}
        for group in ("tool_pins", "template_pins"):
            for p, h in m[group].items():
                checks[f"{group}/{p}"] = sha(f"{parent}/{p}") == h
        checks["recreated_script"] = sha(m["recreated_script"]["path"]) == m["recreated_script"]["sha256"]
        for key in ("path", "copy_path"):
            checks[f"sprite/{key}"] = sha(m["sprite"][key]) == m["sprite"]["sha256"]
        old = m["supersedes"]
        checks["revision_1_untouched"] = sha(old["path"]) == old["lock_file_sha256"]
        rec["poster_pins"] = checks
        mism += [f"{lp}: {p}" for p, ok in checks.items() if not ok]
    out["locks"][lp] = rec
# builds_on of every lock that has one (E2 v3, v5_2, nod v4), cross-checked against the real files
for lp in wanted:
    for p, h in (json.load(open(os.path.join(B, lp))).get("builds_on") or {}).items():
        if not isinstance(h, str) or "/" not in p: continue  # some entries name a lock, not a file
        ok = sha(p) == h; out["deps"][f"{os.path.basename(lp)}: {p}"] = ok
        if not ok: mism.append(f"{os.path.basename(lp)} builds_on {p}")
out["mismatches"] = mism
out["result"] = "PASS" if not mism else "FAIL"
os.makedirs(REPORT, exist_ok=True)  # --report may name a new directory (mkdir -p)
json.dump(out, open(f"{REPORT}/lock_check.json", "w"), indent=1)
print(json.dumps({k: v for k, v in out.items() if k != "locks"}, indent=1))
for k, v in out["locks"].items(): print(k, {x: y for x, y in v.items() if x != "mismatched"})
sys.exit(0 if not mism else 1)
