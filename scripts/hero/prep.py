"""Stage crops (copies) of the locked frames for encoding. Idempotent: skips outputs that exist.
Crop rect = RECT (x, y, w, h) in 1440x900 scene px. Writes work/src/<seq>/{baked,stack}/NNN.png
baked = full composite (plate..armrest) cropped, RGB. stack = layers between plate and armrest
composited over transparent, RGBA (for alpha encodes; armrest goes on top as a static image)."""
import os, sys, json, numpy as np
from PIL import Image
from multiprocessing import Pool
B="/workspace/portfolio-brain"; S=f"{B}/scenes/home-office.desk.coding.dusk.clear"
T=f"{B}/designs/painted_char_typing_t959/v5_1"; E=f"{B}/designs/painted_char_action_E2_headbang_t960/v3"
RECT=(176,272,464,576); X,Y,W,H=RECT; BOX=(X,Y,X+W,Y+H)
OUT="/workspace/hero-encoding-report/work/src"
CS=f"{B}/designs/painted_char_footrest_t956/v2/layers/CONTACT_SHADOW_deck_dusk_1440x900_RGBA_v2.png"
ARM=f"{S}/m2/variants/d4_armrest/locked/placed/armrest_front_down_dusk_graded.png"
PLATE=f"{S}/m2/variants/room_v12/locked_room_m2_v12/frames/ROOM_V12_dusk_clean_fullroom.png"
ORDER=["contact_shadow","arm_shadow","screen","spill_keys","character","spill_char","backrest_near","chairbase_near_leftcalf"]
def layer_paths(seq,i):
    if seq in("typing","bounce"):
        d=f"{T}/layers_per_frame/{seq}"; ps=[]
        for n in ORDER:
            p=f"{d}/{i:03d}_{n}.png"
            ps.append(p if os.path.exists(p) else (CS if n=="contact_shadow" else None))
        return ps, f"{T}/frames/{seq}/{seq}_{i:03d}.png"
    j=(120+i)%216; d=f"{E}/layers_per_frame"; t=f"{T}/layers_per_frame/typing"; ps=[]
    for n in ORDER:
        p=f"{d}/{i:03d}_{n}.png"
        if not os.path.exists(p): p=f"{t}/{j:03d}_{n}.png" if os.path.exists(f"{t}/{j:03d}_{n}.png") else CS
        ps.append(p)
    return ps, f"{E}/frames/E2_{i:03d}.png"
def job(a):
    seq,i=a; ob=f"{OUT}/{seq}/baked/{i:03d}.png"; os_=f"{OUT}/{seq}/stack/{i:03d}.png"
    ps,fp=layer_paths(seq,i)
    if os.path.exists(ob) and os.path.exists(os_): return (seq,i,None)
    st=Image.new("RGBA",(1440,900),(0,0,0,0))
    for p in ps: st=Image.alpha_composite(st,Image.open(p).convert("RGBA"))
    st=st.crop(BOX); fr=Image.open(fp).convert("RGB").crop(BOX)
    # check: plate + stack + armrest == frame (associativity of 8-bit over; tiny rounding allowed)
    pl=Image.open(PLATE).convert("RGBA").crop(BOX); arm=Image.open(ARM).convert("RGBA").crop(BOX)
    re=Image.alpha_composite(Image.alpha_composite(pl,st),arm).convert("RGB")
    d=int(np.abs(np.asarray(re,int)-np.asarray(fr,int)).max())
    st.save(os_+".tmp.png"); os.replace(os_+".tmp.png",os_); fr.save(ob+".tmp.png"); os.replace(ob+".tmp.png",ob)
    return (seq,i,d)
if __name__=="__main__":
    jobs=[]
    for seq,n in (("typing",216),("bounce",216),("e2",168)):
        for k in("baked","stack"): os.makedirs(f"{OUT}/{seq}/{k}",exist_ok=True)
        jobs+=[(seq,i) for i in range(n)]
    with Pool(6) as p: r=p.map(job,jobs,chunksize=8)
    ds=[x[2] for x in r if x[2] is not None]
    print("written",len(ds),"maxdiff stack-recomposite vs locked frame:",max(ds) if ds else "n/a")
    # static images for the web: plate crop and armrest crop
    Image.open(ARM).convert("RGBA").crop(BOX).save(f"{OUT}/armrest_crop.png")
    Image.open(PLATE).convert("RGB").crop(BOX).save(f"{OUT}/plate_crop.png")
    json.dump({"rect_xywh":RECT},open(f"{OUT}/rect.json","w"))
