"""Prototype web encodings of the hero loop (checkpointed: an output that exists and matches its
recorded sha256 in state.json is skipped, so a box restart resumes). Outputs: work/enc/<seq>/."""
import os, sys, json, hashlib, subprocess, time, math
from PIL import Image
from paths import REPORT as R, SRC, ENC
STATE=f"{R}/work/enc/state.json"
FPS=12
os.makedirs(ENC,exist_ok=True)
state=json.load(open(STATE)) if os.path.exists(STATE) else {}
def sha(p):
    h=hashlib.sha256(); h.update(open(p,"rb").read()); return h.hexdigest()
def save_state(): json.dump(state,open(STATE+".tmp","w"),indent=1); os.replace(STATE+".tmp",STATE)
def done(key,out):
    return key in state and os.path.exists(out) and sha(out)==state[key]["sha256"]
def run(key,out,cmd_or_fn,meta):
    if done(key,out): print("skip",key); return
    tmp=out+".part"+os.path.splitext(out)[1]; t=time.time()
    if callable(cmd_or_fn): cmd_or_fn(tmp)
    else: subprocess.run([c.replace("{OUT}",tmp) for c in cmd_or_fn],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    os.replace(tmp,out)
    state[key]={"out":out,"bytes":os.path.getsize(out),"sha256":sha(out),"encode_s":round(time.time()-t,1),**meta}; save_state()
    print("done",key,state[key]["bytes"],state[key]["encode_s"],"s")
G="24"  # keyframe every 2 s: bounded seek cost for clock re-sync
def video_opts(seq):
    b=f"{SRC}/{seq}/baked/%03d.png"; s=f"{SRC}/{seq}/stack/%03d.png"; o=f"{ENC}/{seq}"
    inb=["ffmpeg","-y","-framerate",str(FPS),"-i",b]; ins=["ffmpeg","-y","-framerate",str(FPS),"-i",s]
    return {
     "h264_baked.mp4":(inb+["-c:v","libx264","-preset","veryslow","-crf","20","-g",G,"-pix_fmt","yuv420p","-profile:v","high","-movflags","+faststart","-an","{OUT}"],{"alpha":"baked"}),
     "h264_baked_crf24.mp4":(inb+["-c:v","libx264","-preset","veryslow","-crf","24","-g",G,"-pix_fmt","yuv420p","-profile:v","high","-movflags","+faststart","-an","{OUT}"],{"alpha":"baked"}),
     "hevc_baked.mp4":(inb+["-c:v","libx265","-preset","slow","-crf","24","-x265-params","keyint=24:min-keyint=24:log-level=error","-pix_fmt","yuv420p","-tag:v","hvc1","-movflags","+faststart","-an","{OUT}"],{"alpha":"baked"}),
     "vp9_baked.webm":(inb+["-c:v","libvpx-vp9","-crf","32","-b:v","0","-deadline","good","-cpu-used","1","-row-mt","1","-g",G,"-pix_fmt","yuv420p","-an","{OUT}"],{"alpha":"baked"}),
     "av1_baked.webm":(inb+["-c:v","libsvtav1","-preset","4","-crf","34","-g",G,"-pix_fmt","yuv420p","-an","{OUT}"],{"alpha":"baked"}),
     "av1_baked.mp4":(inb+["-c:v","libsvtav1","-preset","4","-crf","34","-g",G,"-pix_fmt","yuv420p","-movflags","+faststart","-an","{OUT}"],{"alpha":"baked"}),
     "h264_baked_crf16.mp4":(inb+["-c:v","libx264","-preset","veryslow","-crf","16","-g",G,"-pix_fmt","yuv420p","-profile:v","high","-movflags","+faststart","-an","{OUT}"],{"alpha":"baked"}),
     "hevc_baked_crf20.mp4":(inb+["-c:v","libx265","-preset","slow","-crf","20","-x265-params","keyint=24:min-keyint=24:log-level=error","-pix_fmt","yuv420p","-tag:v","hvc1","-movflags","+faststart","-an","{OUT}"],{"alpha":"baked"}),
     "vp9_baked_crf24.webm":(inb+["-c:v","libvpx-vp9","-crf","24","-b:v","0","-deadline","good","-cpu-used","1","-row-mt","1","-g",G,"-pix_fmt","yuv420p","-an","{OUT}"],{"alpha":"baked"}),
     "av1_baked_crf26.webm":(inb+["-c:v","libsvtav1","-preset","4","-crf","26","-g",G,"-pix_fmt","yuv420p","-an","{OUT}"],{"alpha":"baked"}),
     "h264_baked_g72.mp4":(inb+["-c:v","libx264","-preset","veryslow","-crf","20","-g","72","-pix_fmt","yuv420p","-profile:v","high","-movflags","+faststart","-an","{OUT}"],{"alpha":"baked","gop":72}),
     "av1_baked_g72.mp4":(inb+["-c:v","libsvtav1","-preset","4","-crf","30","-g","72","-pix_fmt","yuv420p","-movflags","+faststart","-an","{OUT}"],{"alpha":"baked","gop":72}),
     "av1_baked_crf30.mp4":(inb+["-c:v","libsvtav1","-preset","4","-crf","30","-g",G,"-pix_fmt","yuv420p","-movflags","+faststart","-an","{OUT}"],{"alpha":"baked"}),
     "vp9_alpha.webm":(ins+["-c:v","libvpx-vp9","-crf","32","-b:v","0","-deadline","good","-cpu-used","1","-row-mt","1","-g",G,"-pix_fmt","yuva420p","-auto-alt-ref","0","-an","{OUT}"],{"alpha":"true alpha (VP9 alpha side-channel)"}),
     "h264_matte.mp4":(ins+["-filter_complex","[0:v]format=rgba,split[a][b];[a]format=rgb24[c];[b]alphaextract,format=gray,format=rgb24[m];[c][m]vstack","-c:v","libx264","-preset","veryslow","-crf","20","-g",G,"-pix_fmt","yuv420p","-movflags","+faststart","-an","{OUT}"],{"alpha":"packed matte (colour over alpha, 464x1152), needs WebGL"}),
    }
def sprites(seq,n,fmt,q,kind):
    def fn(tmp):
        # chunks of 24 frames (2 s) in a 6x4 grid -> sheets; output is a tiny JSON index + the sheets
        d=tmp[:-len(".json")]+"_sheets"; os.makedirs(d,exist_ok=True); files=[]
        for c in range(math.ceil(n/24)):
            fr=list(range(c*24,min(n,c*24+24)))
            first=Image.open(f"{SRC}/{seq}/{kind}/000.png"); w,h=first.size
            sheet=Image.new("RGBA" if kind=="stack" else "RGB",(w*6,h*4))
            for k,i in enumerate(fr): sheet.paste(Image.open(f"{SRC}/{seq}/{kind}/{i:03d}.png"),((k%6)*w,(k//6)*h))
            p=f"{d}/sheet_{c:02d}.{fmt}"
            sheet.save(p,quality=q,**({"method":6} if fmt=="webp" else {"speed":4}))
            files.append({"file":os.path.basename(p),"bytes":os.path.getsize(p)})
        json.dump({"cols":6,"rows":4,"files":files,"total_bytes":sum(f["bytes"] for f in files)},open(tmp,"w"))
    return fn
def anim(seq,n,fmt,q):
    def fn(tmp):
        ims=[Image.open(f"{SRC}/{seq}/stack/{i:03d}.png").convert("RGBA") for i in range(n)]
        ims[0].save(tmp,save_all=True,append_images=ims[1:],duration=int(1000/FPS),loop=0,quality=q,**({"method":4} if fmt=="webp" else {"speed":6}))
    return fn
if __name__=="__main__":
    seqs=sys.argv[1:] or ["typing"]
    for seq in seqs:
        n=len(os.listdir(f"{SRC}/{seq}/baked")); os.makedirs(f"{ENC}/{seq}",exist_ok=True)
        for name,(cmd,meta) in video_opts(seq).items():
            run(f"{seq}/{name}",f"{ENC}/{seq}/{name}",cmd,{**meta,"frames":n})
        if seq=="typing":
            for fmt,q in (("webp",80),("avif",60)):
                for kind in ("baked","stack"):
                    run(f"{seq}/sprite_{kind}_{fmt}.json",f"{ENC}/{seq}/sprite_{kind}_{fmt}.json",sprites(seq,n,fmt,q,kind),{"alpha":kind,"frames":n})
            for fmt,q in (("webp",80),("avif",60)):
                run(f"{seq}/anim_alpha.{fmt}",f"{ENC}/{seq}/anim_alpha.{fmt}",anim(seq,n,fmt,q),{"alpha":"true alpha (animated image, not clock-controllable)","frames":n})
