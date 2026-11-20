/**
 * Warm hidden videos (M6, PLAN v3.3 §4). Shortly before a scheduled clip
 * cuts in, its (already fetched) <video> is seeked to the first clip frame
 * and left paused, so the decoder has that frame ready. At the cut-in the
 * player only has to play() it: no cold seek-and-decode on the visible
 * path. Elements stay muted + playsinline (Safari inline playback), hidden
 * and aria-hidden.
 *
 * The pool is capped: the base loop plus at most WARM_MAX_ACTIONS action
 * elements are ever warm at once (3 in total), so a page never keeps more
 * decoders busy than that.
 */
import type { ActionDef } from "./actions";
import type { Occurrence } from "./schedule";

/** Start warming this many frames before the clip's first frame (1 s). */
export const WARM_FRAMES = 12;
/** Action elements warm at once; with the base loop that is 3. */
export const WARM_MAX_ACTIONS = 2;

export interface WarmTarget {
  action: ActionDef;
  /** Absolute frame of the clip's first frame. */
  at: number;
}

/**
 * Clips to keep warm at absolute frame abs: those whose first clip frame is
 * at most WARM_FRAMES ahead, nearest first, one per action, capped.
 */
export function warmTargets(
  abs: number,
  occs: (Occurrence | undefined)[],
  windowFrames = WARM_FRAMES,
  max = WARM_MAX_ACTIONS,
): WarmTarget[] {
  const out: WarmTarget[] = [];
  const seen = new Set<string>();
  const ahead = occs
    .filter((o): o is Occurrence => !!o)
    .map((o) => ({ action: o.action, at: o.start + o.action.clip.firstFrame }))
    .filter((w) => w.at > abs && w.at - abs <= windowFrames)
    .sort((a, b) => a.at - b.at);
  for (const w of ahead) {
    if (seen.has(w.action.id)) continue;
    seen.add(w.action.id);
    out.push(w);
    if (out.length >= max) break;
  }
  return out;
}

/** What isPrimed reads from a <video> (so it is testable without media). */
export interface PrimeProbe {
  readyState: number;
  seeking: boolean;
  paused: boolean;
  currentTime: number;
}

/**
 * Review N2: a warmed element that is paused, not seeking, has its current
 * frame decoded (HAVE_CURRENT_DATA) and sits on `clipFrame` already shows
 * exactly the pixels the cut-in needs (clip frame 0 equals the base at the
 * join). The player treats it as ready at once instead of waiting for a
 * fresh play() + first-frame callback, which for a one-frame enter window
 * (S1a: [0, 0], 83 ms at 12 fps; T6: [0, 1]) can miss the join.
 */
export function isPrimed(
  v: PrimeProbe,
  clipFrame: number,
  fps: number,
): boolean {
  if (v.readyState < 2 || v.seeking || !v.paused) return false;
  return Math.floor(v.currentTime * fps + 1e-6) === clipFrame;
}
