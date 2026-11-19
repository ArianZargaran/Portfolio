import {
  HERO_COMPOSITION,
  HERO_FEATHER_PX,
  HERO_RECT,
  heroBoxPercent,
  motionAllowed,
} from "./media";

describe("hero media placement", () => {
  it("crop rect sits inside the composition, on a 16 px grid", () => {
    const r = HERO_RECT;
    expect(r.x + r.w).toBeLessThanOrEqual(HERO_COMPOSITION.width);
    expect(r.y + r.h).toBeLessThanOrEqual(HERO_COMPOSITION.height);
    for (const v of [r.x, r.y, r.w, r.h]) expect(v % 16).toBe(0);
  });

  it("feather stays inside the static margin around the animated area", () => {
    // Animated union bbox of typing, the v5_1 bounce and E2 (hero-encoding-report/regions.json); the v5_2 clips use the same rect.
    const anim = { x1: 197, y1: 295, x2: 620, y2: 814 };
    const r = HERO_RECT;
    const margins = [
      anim.x1 - r.x,
      anim.y1 - r.y,
      r.x + r.w - anim.x2,
      r.y + r.h - anim.y2,
    ];
    for (const m of margins) expect(m).toBeGreaterThan(HERO_FEATHER_PX);
  });

  it("positions the clip as % of the composition", () => {
    expect(heroBoxPercent()).toEqual({
      left: "12.2222%",
      top: "30.2222%",
      width: "32.2222%",
      height: "64.0000%",
    });
  });
});

describe("motionAllowed", () => {
  const ok = { reducedMotion: false, laptop: true };
  it("allows the laptop composition with motion on", () => {
    expect(motionAllowed(ok)).toBe(true);
    expect(motionAllowed({ ...ok, effectiveType: "4g" })).toBe(true);
    expect(motionAllowed({ ...ok, effectiveType: "3g" })).toBe(true);
  });
  it("keeps the still for reduced motion, tablet/mobile, Save-Data and 2G", () => {
    expect(motionAllowed({ ...ok, reducedMotion: true })).toBe(false);
    expect(motionAllowed({ ...ok, laptop: false })).toBe(false);
    expect(motionAllowed({ ...ok, saveData: true })).toBe(false);
    expect(motionAllowed({ ...ok, effectiveType: "2g" })).toBe(false);
    expect(motionAllowed({ ...ok, effectiveType: "slow-2g" })).toBe(false);
  });
});
