/**
 * Join points: the base-loop frames where a reaction may cut in (PLAN v3.3,
 * 3 s home pose). With the decided 18 s loop (216 frames at 12 fps) they sit
 * every 36 frames, on the head-sway cycle: f0, f36, f72, f108, f144, f180.
 *
 * B1 hook: the join points come from this config, not from the player.
 * When the retouched loop (v5_2, hands matched to the f180 home pose at every
 * join) is locked, add JOIN_V5_2 beside JOIN_V5_1 and point HERO_JOIN at it;
 * re-versioned clips (E2 v4, bounce v2, per-entry variants) then register
 * their entry frames against it. Nothing else in the player changes.
 */
import { BASE_LOOP, type BaseLoopDef } from "./actions";
import { mod } from "./clock";

export interface JoinConfig {
  /** Lock record of the loop the join points belong to. */
  loop: string;
  loopFrames: number;
  fps: number;
  /** Frames between join points (36 = 3 s at 12 fps). */
  step: number;
  /** Base-loop frames where a reaction may cut in. */
  points: readonly number[];
  /**
   * True once every join point matches the home pose within the E2 standard
   * (<= 4 levels, 0 px over 8 at full res). v5_1 is false: the hands differ
   * at f0-f144 until B1, so only clips whose own cut window already covers
   * a join (today: bounce at f72, the nod at f180) may use it.
   */
  homePoseClean: boolean;
}

export const joinPointsEvery = (step: number, loopFrames: number): number[] =>
  Array.from({ length: Math.floor(loopFrames / step) }, (_, k) => k * step);

/** The locked 18 s loop as shipped (LOCK_PAINTED_CHAR_TYPING_LOOP_V5_1). */
export const JOIN_V5_1: JoinConfig = {
  loop: "LOCK_PAINTED_CHAR_TYPING_LOOP_V5_1",
  loopFrames: 216,
  fps: 12,
  step: 36,
  points: joinPointsEvery(36, 216),
  homePoseClean: false,
};

/** Active join config (B1: switch to the v5_2 config once it is locked). */
export const HERO_JOIN: JoinConfig = JOIN_V5_1;

/** Static checks: the config must fit the base loop it claims. */
export function validateJoinConfig(
  cfg: JoinConfig,
  base: BaseLoopDef = BASE_LOOP,
): string[] {
  const errs: string[] = [];
  if (cfg.loopFrames !== base.frames)
    errs.push(`loopFrames ${cfg.loopFrames} != base ${base.frames}`);
  if (cfg.fps !== base.fps) errs.push(`fps ${cfg.fps} != base ${base.fps}`);
  if (cfg.loopFrames % cfg.step !== 0)
    errs.push(`step ${cfg.step} does not divide the loop`);
  cfg.points.forEach((p, i) => {
    if (p < 0 || p >= cfg.loopFrames) errs.push(`point ${p} out of range`);
    if (i > 0 && p <= cfg.points[i - 1]) errs.push("points not ascending");
  });
  return errs;
}

/**
 * Earliest absolute frame >= `from` whose base frame is one of `ks`
 * (a subset of the join points), or undefined if `ks` is empty.
 */
export function nextJoinAbs(
  from: number,
  ks: readonly number[],
  loopFrames: number,
): number | undefined {
  let best: number | undefined;
  const cycleStart = from - mod(from, loopFrames);
  for (const k of ks)
    for (const c of [cycleStart, cycleStart + loopFrames]) {
      const abs = c + k;
      if (abs >= from && (best === undefined || abs < best)) best = abs;
    }
  return best;
}
