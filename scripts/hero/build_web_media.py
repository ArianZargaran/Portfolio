"""Build the shipped hero clips into the repo (app/scene/hero/media/, imported by actions.ts so
Vite content-hashes them into build/client/assets/), from the staged copies.
Checkpointed: a clip whose recorded sha256 matches is skipped. Build metadata (sources, encoder
settings, hashes) goes to scripts/hero/hero-media.build.json, which is never served.

v5_1 only (typing, nod E2 v3, bounce). Since the v5_2 install the shipped clips are built and
proven by variants.py --loop v5_2 (README step 8). Guarded: it exits 2 without writing anything when
the repo is on v5_2 (join-config HERO_JOIN_VERSION, or a v5_2 build manifest), unless
--force-v5_1-over-v5_2 is passed (app/scene/hero/build-guard.test.ts)."""
import os, json, hashlib, re, subprocess, sys
OVERRIDE="--force-v5_1-over-v5_2"
_force=OVERRIDE in sys.argv
if _force: sys.argv.remove(OVERRIDE)
from paths import REPO, SRC
HERE=os.path.dirname(os.path.abspath(__file__))
DST=f"{REPO}/app/scene/hero/media"

def v5_2_installed():
    """True when the repo ships the v5_2 install: the join switch is on v5_2 or the build manifest
    carries v5_2 records (a `locks` block, per-entry `<family>.k<join>` clips)."""
    reasons=[]
    jc=f"{REPO}/app/scene/hero/join-config.ts"
    if os.path.exists(jc):
        m=re.search(r'HERO_JOIN_VERSION\s*:\s*\w+\s*=\s*"(v5_\d)"',open(jc).read())
        if m and m.group(1)!="v5_1": reasons.append(f"join-config.ts HERO_JOIN_VERSION = {m.group(1)}")
    mp=f"{HERE}/hero-media.build.json"
    if os.path.exists(mp):
        mm=json.load(open(mp))
        if "locks" in mm: reasons.append("hero-media.build.json has a v5_2 `locks` block")
        ks=[k for k in mm.get("clips",{}) if re.match(r"^[a-z0-9]+\.k\d+\.",k)]
        if ks: reasons.append(f"hero-media.build.json lists per-entry clips ({', '.join(sorted(ks)[:3])}...)")
    return reasons

# Guard (review finding 3): this v5_1 builder must never overwrite the v5_2 install's media or manifest.
_why=v5_2_installed()
if _why and not _force:
    sys.stderr.write("build_web_media.py: REFUSING to run. It builds the retired v5_1 clips (typing v5_1, nod E2 v3, "
                     "bounce) and would overwrite app/scene/hero/media/ and scripts/hero/hero-media.build.json, but "
                     "this repo ships the locked v5_2 install:\n  - " + "\n  - ".join(_why) +
                     "\nBuild v5_2 clips with scripts/hero/variants.py --loop v5_2 instead. To rebuild v5_1 anyway "
                     f"(e.g. on an old branch), pass {OVERRIDE}.\n")
    sys.exit(2)
os.makedirs(DST,exist_ok=True); MAN=f"{HERE}/hero-media.build.json"
man=json.load(open(MAN)) if os.path.exists(MAN) else {"clips":{}}
CLIPS={"typing":("typing",0,216),"nod":("e2",48,74),"bounce":("bounce",72,48)}
ENC={
 "av1.mp4":["-c:v","libsvtav1","-preset","4","-crf","30","-g","72","-pix_fmt","yuv420p","-movflags","+faststart"],
 "h264.mp4":["-c:v","libx264","-preset","veryslow","-crf","20","-g","72","-pix_fmt","yuv420p","-profile:v","high","-level","3.2","-movflags","+faststart"],
}
def sha(p): return hashlib.sha256(open(p,"rb").read()).hexdigest()
for clip,(seq,first,n) in CLIPS.items():
    for ext,args in ENC.items():
        name=f"{clip}.{ext}"; out=f"{DST}/{name}"; rec=man["clips"].get(name)
        if rec and os.path.exists(out) and sha(out)==rec["sha256"]: print("skip",name); continue
        tmp=out+".part.mp4"
        subprocess.run(["ffmpeg","-y","-v","error","-framerate","12","-start_number",str(first),"-i",f"{SRC}/{seq}/baked/%03d.png","-frames:v",str(n),*args,"-an",tmp],check=True)
        os.replace(tmp,out)
        man["clips"][name]={"source_seq":seq,"first_frame":first,"frames":n,"fps":12,"bytes":os.path.getsize(out),"sha256":sha(out),"ffmpeg_args":args}
        json.dump(man,open(MAN+".tmp","w"),indent=1); os.replace(MAN+".tmp",MAN); print("built",name,os.path.getsize(out))
man["rect_xywh"]=[176,272,464,576]; man["composition"]=[1440,900]
man["sources"]={"typing":"designs/painted_char_typing_t959/v5_1/frames/typing (LOCK_PAINTED_CHAR_TYPING_LOOP_V5_1)","bounce":"designs/painted_char_typing_t959/v5_1/frames/bounce (same lock)","nod":"designs/painted_char_action_E2_headbang_t960/v3/frames (LOCK_PAINTED_CHAR_ACTION_E2_NOD_V3)"}
json.dump(man,open(MAN,"w"),indent=1)
print("total bytes",sum(c["bytes"] for c in man["clips"].values()))
