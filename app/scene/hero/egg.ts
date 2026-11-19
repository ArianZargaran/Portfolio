/**
 * E2 easter egg (PLAN v3.3 §3): visiting the queen poster and then the
 * speakers within 10 s plays the speaker reaction (T6) through the queue as
 * usual, and also arms a nod at the next join it can use (f180: nod v4 is
 * baked for that entry only),
 * after T6 ends. The nod is armed OUTSIDE the reaction queue, so the egg
 * can never block or delay another reaction:
 *
 * - Until it commits (LEAD_FRAMES before its clip starts) it yields: any other
 *   clip (reaction or rotation) overlapping it disarms it.
 * - Once committed it is not cut: the player passes `eggBusyUntil` to the
 *   queue, so a later reaction waits for the nod to end, and an overlapping
 *   rotation occurrence is suppressed (`applyEgg`).
 * - Leaving the hero, the tab going hidden, and freezing disarm it.
 *
 * Pure: the player feeds it hotspot visits (dwell-confirmed, M5) and the
 * clock.
 */
import { NOD, type ActionDef } from "./actions";
import { HERO_JOIN, nextJoinAbs, type JoinConfig } from "./join-config";
import { actionFrameAtBase, joinableKs, LEAD_FRAMES } from "./reactions";
import {
  clipEndAbs,
  occurrenceState,
  type Occurrence,
  type ScheduleState,
} from "./schedule";

export const EGG = {
  /** Hotspot ids (hit-areas.ts), in order. */
  sequence: ["queen-poster", "speakers"] as const,
  windowS: 10,
  /** The queued reaction the egg completes with. */
  reaction: "speaker" as const,
  /** The extra clip armed outside the queue. */
  action: NOD as ActionDef,
};

export interface EggState {
  /** Clock time of the last visit to the first hotspot. */
  first?: number;
  armed?: { occ: Occurrence; join: number };
  playing?: Occurrence;
}

export const initialEgg = (): EggState => ({});

/** True if a visit to `id` at t would complete the sequence (for intent fetch). */
export const eggWouldComplete = (e: EggState, id: string, t: number): boolean =>
  id === EGG.sequence[1] &&
  e.first !== undefined &&
  t - e.first <= EGG.windowS &&
  !e.armed &&
  !e.playing;

/** A dwell-confirmed hotspot visit. */
export function eggVisit(
  e: EggState,
  id: string,
  t: number,
): { state: EggState; completed: boolean } {
  if (id === EGG.sequence[0])
    return { state: { ...e, first: t }, completed: false };
  if (eggWouldComplete(e, id, t))
    return { state: { ...e, first: undefined }, completed: true };
  return { state: e, completed: false };
}

/** Arms the nod at the next usable join at or after notBefore (e.g. T6's end). */
export function armEgg(
  e: EggState,
  abs: number,
  notBefore: number,
  cfg: JoinConfig = HERO_JOIN,
  action: ActionDef = EGG.action,
): EggState {
  const join = nextJoinAbs(
    Math.max(abs + LEAD_FRAMES, notBefore),
    joinableKs(action, cfg),
    cfg.loopFrames,
  );
  if (join === undefined) return e;
  const occ: Occurrence = {
    action,
    cycle: Math.floor(join / cfg.loopFrames),
    start: join - actionFrameAtBase(action, join, cfg.loopFrames),
  };
  return { ...e, armed: { occ, join } };
}

/** Leaving the hero, tab hidden, freeze: drop the sequence and the armed nod. */
export const disarmEgg = (e: EggState): EggState =>
  e.first === undefined && !e.armed ? e : { playing: e.playing };

const clipFrom = (o: Occurrence) => o.start + o.action.clip.firstFrame;
const overlaps = (a: Occurrence, b: Occurrence) =>
  clipFrom(a) < clipEndAbs(b) && clipFrom(b) < clipEndAbs(a);
const sameOcc = (a: Occurrence, b: Occurrence) =>
  a.action.id === b.action.id && a.start === b.start;

/** Committed: within LEAD_FRAMES of its clip start, too late to yield. */
const committed = (e: EggState, abs: number) =>
  !!e.armed && abs >= clipFrom(e.armed.occ) - LEAD_FRAMES;

/**
 * One step at absolute frame abs. `others` are the occurrences scheduled
 * or live besides the egg (queued/playing reaction, current rotation).
 */
export function stepEgg(
  e: EggState,
  abs: number,
  others: (Occurrence | undefined)[],
): EggState {
  let next = e;
  if (next.playing && abs >= clipEndAbs(next.playing))
    next = { ...next, playing: undefined };
  const armed = next.armed;
  if (!armed) return next;
  if (
    !committed(next, abs) &&
    others.some((o) => o && !sameOcc(o, armed.occ) && overlaps(o, armed.occ))
  )
    return { ...next, armed: undefined };
  if (others.some((o) => o && sameOcc(o, armed.occ)))
    return { ...next, armed: undefined }; // the rotation plays this exact nod
  if (abs >= clipFrom(armed.occ))
    return { ...next, armed: undefined, playing: armed.occ };
  return next;
}

/** Absolute frame where the committed or playing egg clip ends, or 0. */
export function eggBusyUntil(e: EggState, abs: number): number {
  if (e.playing) return clipEndAbs(e.playing);
  return committed(e, abs) ? clipEndAbs(e.armed!.occ) : 0;
}

/**
 * Overlays a committed or playing egg on the rotation schedule: an
 * overlapping rotation occurrence gives way to it. Apply before
 * `resolveState`, so a queued reaction still wins (the queue already waits
 * for `eggBusyUntil`, so in practice they never overlap).
 */
export function applyEgg(s: ScheduleState, e: EggState): ScheduleState {
  const occ = e.playing ?? (committed(e, s.abs) ? e.armed!.occ : undefined);
  if (!occ) return s;
  const cur = s.action?.occurrence;
  const action = occurrenceState(s.abs, occ);
  if (action && action.clipFrame >= 0) return { ...s, action };
  if (cur && !sameOcc(cur, occ) && overlaps(cur, occ))
    return { ...s, action: undefined };
  return s;
}
