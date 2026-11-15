"""Build the shipped hero clips into the repo (app/scene/hero/media/, imported by actions.ts so
Vite content-hashes them into build/client/assets/), from the staged copies.
Checkpointed: a clip whose recorded sha256 matches is skipped. Build metadata (sources, encoder
settings, hashes) goes to scripts/hero/hero-media.build.json, which is never served."""
import os, json, hashlib, subprocess, sys
R="/workspace/hero-encoding-report"; SRC=f"{R}/work/src"
HERE=os.path.dirname(os.path.abspath(__file__)); REPO=os.path.dirname(os.path.dirname(HERE))
DST=f"{REPO}/app/scene/hero/media"
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
