/**
 * Splice math and scheduling for the hero character, as pure functions of
 * the shared clock time `t` (see clock.ts). The player (hero-motion.tsx)
 * only turns these answers into <video> calls.
 *
 * Frame indexing follows motion.spec.yaml: drawing index = floor(u * fps)
 * with u the loop-local time. Absolute frame A = floor(t * fps); base
 * frame = A mod base.frames; base cycle = floor(A / base.frames).
 */
import {
  ACTIONS,
  BASE_LOOP,
  cutWindows,
  type ActionDef,
  type ActionId,
  type BaseLoopDef,
} from "./actions";
import { absFrameAt, mod } from "./clock";

// Frame helpers live in clock.ts so the loop player chunk can use them
// without this module (which pulls in the action registry).
export { absFrameAt, driftFrames, frameTime } from "./clock";

/**
 * DRAFT rotation (for Ari): one entry per base cycle, repeating. With the
 * 18 s loop, 4 cycles = 72 s, which is also the cloud period, so the whole
 * scene realigns every 72 s.
 *   cycle 0: typing only
 *   cycle 1: typing, music nod cutting in at f180 (clip i60-131) into cycle 2
 *   cycle 2: typing (nod returns at the f36 join); no bounce until S1b locks
 * S1a (glance-up) and T6 (speaker groove) are visitor reactions only
 * (queen-poster, speakers), never rotated.
 *   cycle 3: typing only
 */
export type Rotation = (ActionId | null)[];
export const HERO_ROTATION: Rotation = [null, "nod.k180", null, null];

/**
 * The rotation the player runs. PLAN §3: E2 (the nod) is out of the
 * auto-rotation (Ari, Q3), so its slot is empty unless
 * FEATURE_HERO_ROTATION_NOD is on (review N1). Every rotation play still
 * goes through the cooldown gate (reactions.ts `gateRotation`).
 */
export const heroRotation = (nod = false): Rotation =>
  HERO_ROTATION.map((id) => (id === "nod.k180" && !nod ? null : id));

export interface Occurrence {
  action: ActionDef;
  /** Base cycle the action is scheduled in. */
  cycle: number;
  /** Absolute frame of action frame 0. */
  start: number;
}

export type Phase = "enter" | "core" | "exit";

export interface ScheduleState {
  /** Absolute frame since t = 0. */
  abs: number;
  /** Frame of the base loop the clock is on. */
  baseFrame: number;
  cycle: number;
  /** Set while an action occurrence spans this frame. */
  action?: {
    occurrence: Occurrence;
    /** Action frame i. */
    frame: number;
    /** Frame inside the (possibly trimmed) encoded clip, or -1 if outside it. */
    clipFrame: number;
    phase: Phase;
  };
}

/** Base frame shown under action frame i (the splice mapping). */
export const actionFrameToBase = (
  a: ActionDef,
  i: number,
  base: BaseLoopDef = BASE_LOOP,
): number => mod(a.spliceOffset + i, base.frames);

export const occurrenceIn = (
  cycle: number,
  rotation: Rotation,
  base: BaseLoopDef = BASE_LOOP,
  actions: Record<ActionId, ActionDef> = ACTIONS,
): Occurrence | undefined => {
  if (!rotation.length) return undefined;
  const id = rotation[mod(cycle, rotation.length)];
  if (!id) return undefined;
  const action = actions[id];
  return { action, cycle, start: cycle * base.frames + action.spliceOffset };
};

export function phaseOf(a: ActionDef, i: number): Phase {
  const { enter, exit } = cutWindows(a);
  if (i <= enter[1]) return "enter";
  if (i < exit[0]) return "core";
  return "exit";
}

/** Everything the player needs to know about clock time t. */
export function stateAt(
  t: number,
  rotation: Rotation = HERO_ROTATION,
  base: BaseLoopDef = BASE_LOOP,
  actions: Record<ActionId, ActionDef> = ACTIONS,
): ScheduleState {
  const abs = absFrameAt(t, base.fps);
  const cycle = Math.floor(abs / base.frames);
  const state: ScheduleState = { abs, baseFrame: mod(abs, base.frames), cycle };
  // An action can start late in one cycle and run into the next ones.
  const lookback = Math.max(
    1,
    ...Object.values(actions).map((a) =>
      Math.ceil((a.spliceOffset + a.frames) / base.frames),
    ),
  );
  // Several occurrences can span a frame nominally (a long action's lead-in
  // overlaps the previous one's tail); the one whose encoded clip covers
  // the frame wins. validateRotation guarantees clips never overlap.
  for (let c = cycle; c >= cycle - lookback; c--) {
    const occ = occurrenceIn(c, rotation, base, actions);
    if (!occ) continue;
    const a = occurrenceState(abs, occ);
    if (!a) continue;
    if (state.action && (state.action.clipFrame >= 0 || a.clipFrame < 0))
      continue;
    state.action = a;
  }
  return state;
}

/** Where absolute frame `abs` falls inside one occurrence (rotation or reaction). */
export function occurrenceState(
  abs: number,
  occ: Occurrence,
): ScheduleState["action"] {
  // Opaque per-entry clips must never be shown at a foreign entry. This
  // final guard also protects rotation/egg or malformed queue occurrences.
  if (
    mod(occ.start + occ.action.clip.firstFrame, BASE_LOOP.frames) !==
    occ.action.entry
  )
    return undefined;
  const i = abs - occ.start;
  if (i < 0 || i >= occ.action.frames) return undefined;
  const cf = i - occ.action.clip.firstFrame;
  const inClip = cf >= 0 && cf < occ.action.clip.frames;
  return {
    occurrence: occ,
    frame: i,
    clipFrame: inClip ? cf : -1,
    phase: phaseOf(occ.action, i),
  };
}

/** Absolute frame just after an occurrence's encoded clip ends. */
export const clipEndAbs = (occ: Occurrence): number =>
  occ.start + occ.action.clip.firstFrame + occ.action.clip.frames;

/** Next occurrence whose clip starts after absolute frame `abs` (for preloading). */
export function nextOccurrence(
  abs: number,
  rotation: Rotation = HERO_ROTATION,
  base: BaseLoopDef = BASE_LOOP,
  actions: Record<ActionId, ActionDef> = ACTIONS,
): Occurrence | undefined {
  const cycle = Math.floor(abs / base.frames);
  for (let c = cycle - 1; c <= cycle + rotation.length + 1; c++) {
    const occ = occurrenceIn(c, rotation, base, actions);
    if (occ && occ.start + occ.action.clip.firstFrame > abs) return occ;
  }
  return undefined;
}

/**
 * Rotation check: over two full rotations (so wrap-around is covered), no
 * two occurrences' encoded clips may overlap, so at most one action is ever live.
 */
export function validateRotation(
  rotation: Rotation,
  base: BaseLoopDef = BASE_LOOP,
  actions: Record<ActionId, ActionDef> = ACTIONS,
): string[] {
  const spans: { id: string; from: number; to: number }[] = [];
  for (let c = 0; c < rotation.length * 2; c++) {
    const occ = occurrenceIn(c, rotation, base, actions);
    if (!occ) continue;
    const from = occ.start + occ.action.clip.firstFrame;
    spans.push({
      id: `${occ.action.id}@${c}`,
      from,
      to: from + occ.action.clip.frames,
    });
  }
  spans.sort((a, b) => a.from - b.from);
  const errs: string[] = [];
  for (let k = 1; k < spans.length; k++)
    if (spans[k].from < spans[k - 1].to)
      errs.push(`${spans[k - 1].id} overlaps ${spans[k].id}`);
  return errs;
}

export type Shown = "base" | ActionId;

export interface Decision {
  /** Clip that should be visible now. */
  show: Shown;
  /** Action clip to have seeked/playing (it may still be hidden). */
  prepare?: { action: ActionDef; clipFrame: number };
}

/**
 * Join safety, re-checked where the player decides (design A): the base
 * frame the occurrence's encoded clip comes up on, computed two ways (from
 * its scheduled start, and from the clock frame and action frame actually
 * being shown), must both be the variant's own `entry`. A per-entry clip
 * (S1a, T6, the nod) is opaque with the screen baked in, so anywhere else it
 * would pop. occurrenceState already refuses such occurrences; this holds
 * even for a hand-built or corrupted ScheduleState.
 */
export function onOwnEntry(
  s: ScheduleState,
  base: BaseLoopDef = BASE_LOOP,
): boolean {
  const a = s.action;
  if (!a) return false;
  const act = a.occurrence.action;
  const fromStart = mod(a.occurrence.start + act.clip.firstFrame, base.frames);
  const fromClock = mod(s.abs - a.frame + act.clip.firstFrame, base.frames);
  return fromStart === act.entry && fromClock === act.entry;
}

/**
 * Which clip to show, given the schedule and what the player has.
 * - an occurrence that is not on its own entry join never shows (onOwnEntry).
 * - enter phase: cut in as soon as the action clip has a frame up.
 *   Until then the base loop shows the same pixels, so being late is invisible.
 * - core: keep the action if it is up; if it never came up, skip this
 *   occurrence (cutting in mid-motion would pop).
 * - exit: cut back to the base loop (identical pixels).
 */
export function decide(
  s: ScheduleState,
  shown: Shown,
  actionReady: boolean,
): Decision {
  const a = s.action;
  if (!a || a.clipFrame < 0) return { show: "base" };
  if (!onOwnEntry(s)) return { show: "base" };
  const id = a.occurrence.action.id;
  const prepare = { action: a.occurrence.action, clipFrame: a.clipFrame };
  if (a.phase === "enter") return { show: actionReady ? id : "base", prepare };
  if (a.phase === "core")
    return shown === id ? { show: id, prepare } : { show: "base" };
  return { show: "base" };
}
