#!/usr/bin/env python3
"""Read-only lock check for every asset the hero scene uses. Writes lock_check.json."""
import hashlib, json, os, sys
B = "/workspace/portfolio-brain"
S = "scenes/home-office.desk.coding.dusk.clear"
CP = f"{S}/m2/variants/char_painted"
def sha(p):
    h = hashlib.sha256()
    with open(os.path.join(B, p), "rb") as f:
        for c in iter(lambda: f.read(1 << 20), b""): h.update(c)
    return h.hexdigest()
out = {"checked_at": __import__("datetime").datetime.now().astimezone().isoformat(), "lists": {}, "locks": {}, "deps": {}}
lists = {}
for n in (26, 27):
    p = f"tools/locks_now{n}.sha"
    if os.path.exists(os.path.join(B, p)):
        lists[n] = dict(reversed(l.strip().split("|", 1)) for l in open(os.path.join(B, p)) if "|" in l)
        out["lists"][p] = {"entries": len(lists[n]), "sha256": sha(p)}
latest = lists[max(lists)]
wanted = [f"{CP}/LOCK_PAINTED_CHAR_STILL_POLISH_V5.json", f"{CP}/LOCK_PAINTED_CHAR_TYPING_LOOP_V5_1.json",
          f"{CP}/LOCK_PAINTED_CHAR_ACTION_E2_NOD_V3.json", f"{S}/m2/variants/room_v12/LOCK_ROOM_M2_V12.json",
          f"{S}/m2/variants/d4_armrest/LOCK_D4.json"]
mism = []
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
    out["locks"][lp] = rec
# E2 builds_on, cross-checked against the real files
e2 = json.load(open(os.path.join(B, wanted[2])))
for p, h in e2["builds_on"].items():
    ok = sha(p) == h; out["deps"][p] = ok
    if not ok: mism.append(f"E2 builds_on {p}")
out["mismatches"] = mism
out["result"] = "PASS" if not mism else "FAIL"
json.dump(out, open("/workspace/hero-encoding-report/lock_check.json", "w"), indent=1)
print(json.dumps({k: v for k, v in out.items() if k != "locks"}, indent=1))
for k, v in out["locks"].items(): print(k, {x: y for x, y in v.items() if x != "mismatched"})
sys.exit(0 if not mism else 1)
