/**
 * Join points: the base-loop frames where a reaction may cut in (PLAN v3.3,
 * 3 s home pose). With the decided 18 s loop (216 frames at 12 fps) they sit
 * every 36 frames, on the head-sway cycle: f0, f36, f72, f108, f144, f180.
 *
 * B1 hook: the join points come from this config, not from the player.
 * JOIN_V5_2 (the retouched loop: hands matched to the f180 home pose at every
 * join) sits beside JOIN_V5_1 but is PROVISIONAL until Ari locks it. The
 * default build keeps v5_1 through the single switch line `HERO_JOIN_VERSION`
 * below. To install once v5_2 is locked: set its `loop` to the lock record,
 * drop `provisional`, flip the switch to "v5_2", and ship the v5_2 media
 * (typing loop, nod v4, bounce v2, per-entry variants) in the same commit.
 * join-config.test.ts refuses an active config that is still provisional.
 * Nothing else in the player changes. See docs/hero-player.md (Join points).
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
  /**
   * Set while the loop is a candidate that Ari has not locked yet. A
   * provisional config may be built and tested, but never be active.
   */
  provisional?: true;
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

/**
 * B1 retouch candidate (t995, Dusk's painted_char_typing_t995/v5_2). The
 * character at f0/36/72/108/144 equals f180 exactly (REVIEW t995 B1: max 0),
 * so every join is a clean home pose. The screen still differs between
 * joins, which is why baked clips stay one variant per entry (design A).
 * NOT LOCKED: `loop` names the candidate, not a lock record.
 */
export const JOIN_V5_2: JoinConfig = {
  loop: "CANDIDATE_PAINTED_CHAR_TYPING_LOOP_V5_2 (t995, pending Ari)",
  loopFrames: 216,
  fps: 12,
  step: 36,
  points: joinPointsEvery(36, 216),
  homePoseClean: true,
  provisional: true,
};

export const JOIN_CONFIGS = { v5_1: JOIN_V5_1, v5_2: JOIN_V5_2 } as const;
export type JoinVersion = keyof typeof JOIN_CONFIGS;

/**
 * THE SWITCH. The one line to change when Ari locks v5_2 (together with the
 * v5_2 media; see the header). A build-time constant rather than an env flag
 * on purpose: the join points must match the typing clip that is bundled,
 * so they can't differ between deployments of the same build.
 */
export const HERO_JOIN_VERSION: JoinVersion = "v5_1";

/** Active join config. */
export const HERO_JOIN: JoinConfig = JOIN_CONFIGS[HERO_JOIN_VERSION];

/** Static checks: the config must fit the base loop it claims. */
export function validateJoinConfig(
  cfg: JoinConfig,
  base: BaseLoopDef = BASE_LOOP,
): string[] {
  const errs: string[] = [];
  if (cfg.points.some((p) => p % cfg.step !== 0))
    errs.push(`points not on the ${cfg.step}-frame grid`);
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
