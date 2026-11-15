/**
 * Where the hero motion sits in the 1440x900 laptop composition, and when
 * the client may load it. The clip is a crop of the full composite (plate,
 * shadows, screen, spill, character, occluders, armrest, in the locked
 * order) with a margin of static pixels on every side, so it can be laid
 * over the still with a feathered edge and no seam. See docs/hero-encoding.md.
 */
export const HERO_COMPOSITION = { width: 1440, height: 900 } as const;

/** Crop rect in composition px: x, y, w, h (multiples of 16). */
export const HERO_RECT = { x: 176, y: 272, w: 464, h: 576 } as const;

/** Feather of the clip edge in clip px; the static margin is >= 20 px. */
export const HERO_FEATHER_PX = 12;

/** Box of the clip as % of the composition (positions the <video>s). */
export const heroBoxPercent = (r = HERO_RECT, c = HERO_COMPOSITION) => ({
  left: `${((r.x / c.width) * 100).toFixed(4)}%`,
  top: `${((r.y / c.height) * 100).toFixed(4)}%`,
  width: `${((r.w / c.width) * 100).toFixed(4)}%`,
  height: `${((r.h / c.height) * 100).toFixed(4)}%`,
});

export interface MotionEnv {
  reducedMotion: boolean;
  /** Laptop composition visible (min-width: 1025px). */
  laptop: boolean;
  saveData?: boolean;
  effectiveType?: string;
}

/**
 * The still stays alone (no media requested) for reduced motion, the
 * tablet/mobile compositions (no motion spec yet), Save-Data, and 2G.
 */
export function motionAllowed(env: MotionEnv): boolean {
  if (env.reducedMotion || !env.laptop) return false;
  if (env.saveData) return false;
  if (env.effectiveType && /(^|-)2g$/.test(env.effectiveType)) return false;
  return true;
}
