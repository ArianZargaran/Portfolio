"""Side-by-side 3x crops (source vs each encoding) for a few frames. Output: crops/*.png"""
import os, json, subprocess, numpy as np
from PIL import Image, ImageDraw
R="/workspace/hero-encoding-report"; SRC=f"{R}/work/src"; ENC=f"{R}/work/enc"; OUT=f"{R}/crops"; os.makedirs(OUT,exist_ok=True)
W,H=464,576; X0,Y0=176,272
plate=np.asarray(Image.open(f"{SRC}/plate_crop.png").convert("RGB"),np.float32)
arm=np.asarray(Image.open(f"{SRC}/armrest_crop.png").convert("RGBA"),np.float32)
def over(d,s): a=s[...,3:4]/255; return s[...,:3]*a+d*(1-a)
def fin(x):
    x=x.astype(np.float32)
    if x.shape[2]==4: x=over(plate,x)
    return np.clip(np.round(over(x,arm)),0,255).astype(np.uint8)
def vframe(p,i,alpha=False,matte=False):
    h=H*2 if matte else H; ch=4 if alpha else 3
    a=["ffmpeg","-v","error"]+(["-c:v","libvpx-vp9"] if alpha else [])+["-i",p,"-vf",f"select=eq(n\\,{i})","-frames:v","1","-f","rawvideo","-pix_fmt","rgba" if alpha else "rgb24","-"]
    f=np.frombuffer(subprocess.run(a,capture_output=True,check=True).stdout,np.uint8).reshape(h,W,ch)
    if matte: f=np.concatenate([f[:H],f[H:,:,0:1]],2)
    return f
def sframe(js,i,kind):
    meta=json.load(open(js)); sh=np.asarray(Image.open(f"{js}.part_sheets/{meta['files'][i//24]['file']}").convert("RGBA" if kind=="stack" else "RGB"))
    k=i%24; r,c=k//6,k%6; return sh[r*H:(r+1)*H,c*W:(c+1)*W]
OPTS=[("source (locked PNG)",None),("H.264 crf20 g72",("h264_baked_g72.mp4",0,0)),("H.264 crf24",("h264_baked_crf24.mp4",0,0)),("AV1 crf30 g72",("av1_baked_g72.mp4",0,0)),("HEVC crf24",("hevc_baked.mp4",0,0)),("VP9 crf32",("vp9_baked.webm",0,0)),
      ("VP9 alpha crf32",("vp9_alpha.webm",1,0)),("H.264 matte crf20",("h264_matte.mp4",0,1)),("sprite WebP q80",("sprite_baked_webp.json","s","baked")),("sprite AVIF q60",("sprite_baked_avif.json","s","baked"))]
REGIONS={"face":(270,300,390,420),"hands":(450,500,600,600),"screen":(455,430,625,560)}
for seq,fi in (("typing",57),("typing",200),("e2",77)):
    ref=np.asarray(Image.open(f"{SRC}/{seq}/baked/{fi:03d}.png").convert("RGB"))
    tiles=[]
    for label,o in OPTS:
        if o is None: img=ref
        else:
            name=o[0]; p=f"{ENC}/{seq}/{name}"
            if not os.path.exists(p): continue
            img=fin(sframe(p,fi,o[2]) if o[1]=="s" else vframe(p,fi,bool(o[1]),bool(o[2])))
        tiles.append((label,Image.fromarray(img)))
    for rn,(x1,y1,x2,y2) in REGIONS.items():
        box=(x1-X0,y1-Y0,x2-X0,y2-Y0); w,h=(x2-x1)*3,(y2-y1)*3
        cols=4; rows=(len(tiles)+cols-1)//cols
        sheet=Image.new("RGB",(cols*(w+8),rows*(h+28)),(20,20,24)); d=ImageDraw.Draw(sheet)
        for k,(label,im) in enumerate(tiles):
            c,r=k%cols,k//cols; sheet.paste(im.crop(box).resize((w,h),Image.NEAREST),(c*(w+8),r*(h+28)+24)); d.text((c*(w+8)+4,r*(h+28)+6),label,fill=(255,255,255))
        sheet.save(f"{OUT}/SIDEBYSIDE_{seq}_f{fi:03d}_{rn}_3x.png")
        print("wrote",f"{OUT}/SIDEBYSIDE_{seq}_f{fi:03d}_{rn}_3x.png")
