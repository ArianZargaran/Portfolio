"""Quality, size and software-decode cost of every prototype encoding vs the locked source crops.
Writes quality.json. Re-runnable (results cached per output sha256)."""
import os, sys, json, subprocess, re, time, numpy as np
from PIL import Image, ImageSequence
from skimage.metrics import structural_similarity as ssim
R="/workspace/hero-encoding-report"; SRC=f"{R}/work/src"; ENC=f"{R}/work/enc"
W,H=464,576
state=json.load(open(f"{ENC}/state.json")); QF=f"{R}/quality.json"
cache=json.load(open(QF)) if os.path.exists(QF) else {}
plate=np.asarray(Image.open(f"{SRC}/plate_crop.png").convert("RGB"),np.float32)
arm=np.asarray(Image.open(f"{SRC}/armrest_crop.png").convert("RGBA"),np.float32)
def over(dst,rgba):
    a=rgba[...,3:4]/255.0; return rgba[...,:3]*a+dst*(1-a)
def finish(rgba_or_rgb):
    x=rgba_or_rgb.astype(np.float32)
    if x.shape[2]==4: x=over(plate,x)
    return np.clip(np.round(over(x,arm)),0,255)
def decode_video(path,alpha,matte):
    pix="rgba" if alpha else "rgb24"; h=H*2 if matte else H; ch=4 if alpha else 3
    args=["ffmpeg","-v","error"]+(["-c:v","libvpx-vp9"] if alpha else [])+["-i",path,"-f","rawvideo","-pix_fmt",pix,"-"]
    raw=subprocess.run(args,capture_output=True,check=True).stdout
    fr=np.frombuffer(raw,np.uint8).reshape(-1,h,W,ch)
    if matte:
        col=fr[:,:H].astype(np.float32); m=fr[:,H:,:,0:1].astype(np.float32)
        cm=np.concatenate([col,m],3); return [cm[k] for k in range(len(cm))]
    return list(fr)
def bench(path,alpha):
    args=["ffmpeg","-v","info","-nostats","-benchmark","-threads","1"]+(["-c:v","libvpx-vp9"] if alpha else [])+["-i",path,"-f","null","-"]
    best=None
    for _ in range(3):
        out=subprocess.run(args,capture_output=True,text=True).stderr
        m=re.search(r"utime=([\d.]+)s",out); u=float(m.group(1)) if m else None
        best=u if best is None or (u is not None and u<best) else best
    return best
def load_sprites(js,kind):
    d=js[:-5]+".json.part_sheets" if os.path.exists(js[:-5]+".json.part_sheets") else None
    meta=json.load(open(js)); frames=[]
    for f in meta["files"]:
        sh=np.asarray(Image.open(f"{js}.part_sheets/{f['file']}").convert("RGBA" if kind=="stack" else "RGB"))
        for r in range(4):
            for c in range(6):
                frames.append(sh[r*H:(r+1)*H,c*W:(c+1)*W])
    return frames, meta["total_bytes"], sum(1 for _ in meta["files"])
def load_anim(p):
    im=Image.open(p); return [np.asarray(f.convert("RGBA")) for f in ImageSequence.Iterator(im)]
def metrics(frames,seq):
    n=len(os.listdir(f"{SRC}/{seq}/baked")); frames=frames[:n]
    ps=[];ss=[];pa=[]
    m=np.load(f"{R}/tools/anim_mask.npy")[272:272+H,176:176+W]
    for i,f in enumerate(frames):
        ref=np.asarray(Image.open(f"{SRC}/{seq}/baked/{i:03d}.png").convert("RGB"),np.float32)
        x=finish(np.asarray(f))
        mse=((x-ref)**2).mean(); ps.append(99 if mse==0 else 10*np.log10(255**2/mse))
        ma=((x-ref)**2)[m].mean(); pa.append(99 if ma==0 else 10*np.log10(255**2/ma))
        if i%4==0: ss.append(ssim(ref.astype(np.uint8),x.astype(np.uint8),channel_axis=2,data_range=255))
    return {"psnr_db_mean":round(float(np.mean(ps)),2),"psnr_db_min":round(float(np.min(ps)),2),"ssim_mean":round(float(np.mean(ss)),4),"ssim_min":round(float(np.min(ss)),4),"psnr_db_animated_px":round(float(np.mean(pa)),2),"frames_decoded":len(frames)}
for key,v in state.items():
    if key in cache and cache[key].get("sha256")==v["sha256"]: continue
    seq,name=key.split("/"); p=v["out"]; r={"sha256":v["sha256"],"seq":seq,"name":name}
    t=time.time()
    if name.startswith("sprite_"):
        kind="stack" if "stack" in name else "baked"; fr,b,nf=load_sprites(p,kind); r.update(bytes=b,sheets=nf)
    elif name.startswith("anim_"):
        fr=load_anim(p); r["bytes"]=os.path.getsize(p)
    else:
        alpha="alpha" in name; matte="matte" in name
        fr=decode_video(p,alpha,matte); r["bytes"]=os.path.getsize(p)
        r["sw_decode_utime_s_1thread"]=bench(p,alpha)
        if r["sw_decode_utime_s_1thread"]: r["sw_decode_ms_per_frame"]=round(1000*r["sw_decode_utime_s_1thread"]/len(fr),2)
    r.update(metrics(fr,seq)); r["eval_s"]=round(time.time()-t,1)
    cache[key]=r; json.dump(cache,open(QF+".tmp","w"),indent=1); os.replace(QF+".tmp",QF)
    print(key,{k:r[k] for k in r if k not in("sha256",)},flush=True)
