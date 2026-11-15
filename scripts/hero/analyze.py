import numpy as np, json, glob
from PIL import Image
B="/workspace/portfolio-brain"
S=f"{B}/scenes/home-office.desk.coding.dusk.clear"
T=f"{B}/designs/painted_char_typing_t959/v5_1"
E=f"{B}/designs/painted_char_action_E2_headbang_t960/v3"
plate=Image.open(f"{S}/m2/variants/room_v12/locked_room_m2_v12/frames/ROOM_V12_dusk_clean_fullroom.png").convert("RGBA")
arm=Image.open(f"{S}/m2/variants/d4_armrest/locked/placed/armrest_front_down_dusk_graded.png")
print("plate",plate.size,"arm",arm.size,arm.mode,arm.getbbox())
order=["contact_shadow","arm_shadow","screen","spill_keys","character","spill_char","backrest_near","chairbase_near_leftcalf"]
cs=Image.open(f"{B}/designs/painted_char_footrest_t956/v2/layers/CONTACT_SHADOW_deck_dusk_1440x900_RGBA_v2.png")
def comp(d,i,track=None):
    im=plate.copy()
    for n in order:
        p=f"{d}/{i:03d}_{n}.png" if track is None else f"{d}/{i:03d}_{n}.png"
        try: L=Image.open(p).convert("RGBA")
        except FileNotFoundError:
            if n=="contact_shadow": L=cs
            else: raise
        im=Image.alpha_composite(im,L)
    return Image.alpha_composite(im,arm)
res={}
for name,ld,fd,pat,n in [("typing",f"{T}/layers_per_frame/typing",f"{T}/frames/typing","typing_%03d.png",216),("bounce",f"{T}/layers_per_frame/bounce",f"{T}/frames/bounce","bounce_%03d.png",216)]:
    for i in (0,100):
        c=np.asarray(comp(ld,i).convert("RGB")).astype(int); f=np.asarray(Image.open(f"{fd}/"+pat%i).convert("RGB")).astype(int)
        print(name,i,"recomposite maxdiff",np.abs(c-f).max())
el=sorted(glob.glob(f"{E}/frames/*.png")); print("E2 frames",len(el),el[0]); print(sorted(glob.glob(f"{E}/layers_per_frame/*"))[:6])
# change bbox vs plate and frame-to-frame
pa=np.asarray(plate.convert("RGB")).astype(np.int16)
def bbox(m):
    ys,xs=np.nonzero(m); return [int(xs.min()),int(ys.min()),int(xs.max())+1,int(ys.max())+1] if len(xs) else None
allv=np.zeros(pa.shape[:2],bool); anim=np.zeros(pa.shape[:2],bool)
seqs={"typing":sorted(glob.glob(f"{T}/frames/typing/*.png")),"bounce":sorted(glob.glob(f"{T}/frames/bounce/*.png")),"e2":el}
for k,fl in seqs.items():
    f0=None; a=np.zeros(pa.shape[:2],bool); v=np.zeros(pa.shape[:2],bool)
    for p in fl:
        f=np.asarray(Image.open(p).convert("RGB")).astype(np.int16)
        v|=(np.abs(f-pa).max(2)>0)
        if f0 is None: f0=f
        a|=(np.abs(f-f0).max(2)>0)
    res[k]={"vs_plate_bbox":bbox(v),"animated_bbox":bbox(a),"animated_px":int(a.sum()),"vs_plate_px":int(v.sum())}
    allv|=v; anim|=a
res["union_vs_plate_bbox"]=bbox(allv); res["union_animated_bbox"]=bbox(anim)
np.save("/workspace/hero-encoding-report/tools/anim_mask.npy",anim); np.save("/workspace/hero-encoding-report/tools/vsplate_mask.npy",allv)
print(json.dumps(res,indent=1)); json.dump(res,open("/workspace/hero-encoding-report/regions.json","w"),indent=1)
