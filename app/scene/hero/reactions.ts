/**
 * Reactions: one-shot actions triggered by the visitor (hover a hotspot,
 * idle, return to the tab), cut into the typing loop at the next join point
 * (join-config.ts). Pure state machine; the player feeds it the clock and
 * shows whatever `resolveState` says. PLAN v3.3 §3:
 *
 * - One queue slot. A new request replaces the queued one if its priority
 *   is higher, or equal (newest wins). Commit-on-dwell: once a request is
 *   queued it is never cancelled by the pointer leaving (the 250 ms dwell
 *   that confirms intent is checked by the event wiring, M5).
 * - A queued request is scheduled at the earliest join point that has a
 *   variant for it, is at least LEAD_FRAMES away (time to seek and decode),
 *   and respects the cooldowns. It locks LEAD_FRAMES before its join; a
 *   locked request can no longer be replaced.
 * - Cooldowns: the same reaction at most once per 30 s (later requests are
 *   rejected), any two reactions at least 6 s apart and at most 6 per
 *   minute (later starts are pushed to a later join).
 * - Frozen (WCAG 2.2.2 pause): requests are rejected and the queued one is
 *   dropped; a reaction already on screen stays on its held frame and
 *   continues when the visitor plays again.
 * - Reactions win over the auto-rotation: a rotation occurrence overlapping
 *   a scheduled or playing reaction is suppressed, but a rotation clip that
 *   is already live is never cut; the reaction waits for its end.
 * - Rotation plays share the cooldown ledger (review N1): a rotation
 *   occurrence plays only if its clip is fetched and the cooldowns allow a
 *   start then (`gateRotation`); otherwise the base shows. Each play is
 *   recorded like a reaction start, so reactions also wait for it.
 * - E2 (the poster -> speaker egg) is not a queued reaction: it is armed
 *   outside the queue (M4) so it can never block another reaction.
 * - Once per visit: a reaction marked `oncePerVisit` is refused after it
 *   has started once, whatever triggered it (kept for the T2 doze, which
 *   returns with its clip; see below).
 * - Join safety (lock review locks_now28 §4): every clip is a baked opaque
 *   crop that is clean only at its own entry join; the full composite at
 *   the other joins differs on the screen and spill. A clip is therefore
 *   only ever scheduled at a join k equal to its `entry` (`joinableKs`), and
 *   `step` refuses to start a variant whose entry is not the join it lands
 *   on, whatever the registry says.
 *
 * Installed reactions: the S1a glance-up (queen-poster hover/focus), locked
 * by Ari (t1014s5523, LOCK_PAINTED_CHAR_ACTION_S1A_GLANCE_UP_V2), with one
 * baked variant per join; it plays only at the join a variant is baked for.
 * The S1b strong bounce (idle / return) and T2 doze (45 s) are not locked,
 * so their clips, triggers and tests are kept on the local branch
 * `hero-reactions-s1a-s1b-t2` and the queue refuses them (and speaker /
 * phone / sip) as "unknown". The E2 nod is not a reaction.
 */
import {
  ACTIONS,
  BASE_LOOP,
  cutWindows,
  type ActionDef,
  type ActionFamily,
} from "./actions";
import { mod } from "./clock";
import { HERO_JOIN, nextJoinAbs, type JoinConfig } from "./join-config";
import {
  clipEndAbs,
  occurrenceState,
  type Occurrence,
  type ScheduleState,
} from "./schedule";

/**
 * Reaction ids (PLAN §3). T6/S5/S4 (speaker, phone, sip) are typed and get
 * entries when their clips exist. `strong-bounce` (S1b) and `doze` (T2) come
 * back with their clips from hero-reactions-s1a-s1b-t2 once they lock.
 */
export type ReactionId = "glance-up" | "speaker" | "phone" | "sip";

export interface ReactionDef {
  id: ReactionId;
  /**
   * Higher wins the queue slot (PLAN §3: idle/return 1, timers 2, hotspots 3):
   * sip 2, glance-up / speaker / phone 3.
   */
  priority: number;
  /**
   * Clip to cut in at each join point (base frame k). Design A: one baked
   * variant per entry, each clean only at its own join.
   */
  variants: Partial<Record<number, ActionDef>>;
  /** Refused after its first start in this visit (page load). */
  oncePerVisit?: boolean;
}

/** Action frame shown at base frame k (inverse of the splice mapping). */
export const actionFrameAtBase = (
  a: ActionDef,
  k: number,
  loopFrames = BASE_LOOP.frames,
): number => mod(k - a.spliceOffset, loopFrames);

/**
 * Join points where `a` can cut in without a pop: its own `entry` join only
 * (design A; the screen differs at every other join), and only if that join
 * is in the config and inside the clip's enter cut window. Never more than
 * one point.
 */
export function joinableKs(
  a: ActionDef,
  cfg: JoinConfig = HERO_JOIN,
): number[] {
  const { enter } = cutWindows(a);
  return cfg.points.filter((k) => {
    if (k !== a.entry) return false;
    const i = actionFrameAtBase(a, k, cfg.loopFrames);
    return i >= enter[0] && i <= enter[1] && i < a.frames;
  });
}

/**
 * Join k -> clip for every per-entry variant of `family` that can cut in
 * at k (its own entry, if that is a join point of the active config).
 */
export const variantsOf = (
  family: ActionFamily,
  cfg: JoinConfig = HERO_JOIN,
): Partial<Record<number, ActionDef>> =>
  Object.fromEntries(
    Object.values(ACTIONS)
      .filter((a) => a.family === family)
      .flatMap((a) => joinableKs(a, cfg).map((k) => [k, a] as const)),
  );

/**
 * Registry (v5_2, design A). The nod is the E2 egg (egg.ts), not a reaction.
 * glance-up (S1a) has a baked clip for every join, keyed by its own entry
 * (variantsOf -> joinableKs, so a key can only ever be the variant's own
 * entry). strong-bounce = variantsOf("s1b") and doze = variantsOf("t2"),
 * oncePerVisit, come back from hero-reactions-s1a-s1b-t2 when they lock.
 */
export const REACTIONS: Partial<Record<ReactionId, ReactionDef>> = {
  "glance-up": {
    id: "glance-up",
    priority: 3,
    variants: variantsOf("s1a"),
  },
};

/**
 * Join points a reaction may be scheduled at: the registry keys whose clip
 * is baked for that very join (join safety; a mis-keyed variant is ignored).
 */
export const entryKs = (def: ReactionDef): number[] =>
  Object.keys(def.variants)
    .map(Number)
    .filter((k) => def.variants[k]?.entry === k);

export const COOLDOWNS = { sameS: 30, gapS: 6, perMinute: 6 } as const;
/** Frames between locking a join and cutting in (seek + first decoded frame). */
export const LEAD_FRAMES = 4;

export interface Slot {
  id: ReactionId;
  priority: number;
  /** Clock time of the request. */
  at: number;
  /** Set once scheduled; recomputed each step until locked. */
  occ?: Occurrence;
  join?: number;
  locked: boolean;
}

export interface QueueState {
  frozen: boolean;
  slot?: Slot;
  playing?: { id: ReactionId; occ: Occurrence };
  /** Clock time of each reaction's (or rotation action's) last start. */
  lastStart: Partial<Record<string, number>>;
  /** Clock times of recent starts (last minute). */
  starts: number[];
}

export const initialQueue = (frozen = false): QueueState => ({
  frozen,
  lastStart: {},
  starts: [],
});

export type RequestResult =
  | { accepted: true; state: QueueState }
  | {
      accepted: false;
      state: QueueState;
      reason:
        | "frozen"
        | "unknown"
        | "cooldown"
        | "once"
        | "outranked"
        | "locked";
    };

export interface QueueEnv {
  reactions?: Partial<Record<ReactionId, ReactionDef>>;
  cfg?: JoinConfig;
}

/** A visitor-triggered request (already dwell-confirmed). */
export function request(
  q: QueueState,
  id: ReactionId,
  t: number,
  env: QueueEnv = {},
): RequestResult {
  const def = (env.reactions ?? REACTIONS)[id];
  if (q.frozen) return { accepted: false, state: q, reason: "frozen" };
  if (!def || !Object.keys(def.variants).length)
    return { accepted: false, state: q, reason: "unknown" };
  const last = q.lastStart[id];
  if (def.oncePerVisit && (last !== undefined || q.playing?.id === id))
    return { accepted: false, state: q, reason: "once" };
  if (last !== undefined && t - last < COOLDOWNS.sameS)
    return { accepted: false, state: q, reason: "cooldown" };
  if (q.playing?.id === id)
    return { accepted: false, state: q, reason: "cooldown" };
  if (q.slot) {
    if (q.slot.locked) return { accepted: false, state: q, reason: "locked" };
    if (def.priority < q.slot.priority)
      return { accepted: false, state: q, reason: "outranked" };
  }
  return {
    accepted: true,
    state: { ...q, slot: { id, priority: def.priority, at: t, locked: false } },
  };
}

/** Freeze on/off. Freezing drops the queued request (even a locked one). */
export function setFrozen(q: QueueState, frozen: boolean): QueueState {
  if (frozen === q.frozen) return q;
  return frozen ? { ...q, frozen, slot: undefined } : { ...q, frozen };
}

/** Earliest clock time the cooldowns allow the next start. */
export function earliestStart(q: QueueState, t: number): number {
  let e = t;
  const lastAny = q.starts[q.starts.length - 1];
  if (lastAny !== undefined) e = Math.max(e, lastAny + COOLDOWNS.gapS);
  const recent = q.starts.filter((s) => t - s < 60);
  if (recent.length >= COOLDOWNS.perMinute)
    e = Math.max(e, recent[recent.length - COOLDOWNS.perMinute] + 60);
  return e;
}

/**
 * One step at clock time t / absolute frame abs. `busyUntil` is the absolute
 * frame where a live rotation clip ends (0 if none), so a reaction never
 * cuts a clip that is already on screen.
 */
export function step(
  q: QueueState,
  t: number,
  abs: number,
  busyUntil = 0,
  env: QueueEnv = {},
): QueueState {
  if (q.frozen) return q;
  const cfg = env.cfg ?? HERO_JOIN;
  let next = q;
  if (next.playing && abs >= clipEndAbs(next.playing.occ))
    next = { ...next, playing: undefined };

  const slot = next.slot;
  if (!slot) return next;
  const def = (env.reactions ?? REACTIONS)[slot.id];
  if (!def) return { ...next, slot: undefined };

  if (!slot.locked && slot.join !== undefined && abs >= slot.join - LEAD_FRAMES)
    next = { ...next, slot: { ...slot, locked: true } };
  else if (!slot.locked) {
    const fps = cfg.fps;
    const from = Math.max(
      abs + LEAD_FRAMES,
      busyUntil,
      next.playing ? clipEndAbs(next.playing.occ) : 0,
      Math.ceil(earliestStart(next, t) * fps - (t * fps - abs)),
    );
    const join = nextJoinAbs(from, entryKs(def), cfg.loopFrames);
    if (join === undefined) return { ...next, slot: undefined };
    const action = def.variants[mod(join, cfg.loopFrames)]!;
    // Join safety: a clip starts only at its own entry join (never at a
    // foreign join, where the screen in the baked crop would pop).
    if (action.entry !== mod(join, cfg.loopFrames))
      return { ...next, slot: undefined };
    const occ: Occurrence = {
      action,
      cycle: Math.floor(join / cfg.loopFrames),
      start: join - actionFrameAtBase(action, join, cfg.loopFrames),
    };
    // Locks immediately when the only valid join is already within the lead.
    const locked = abs >= join - LEAD_FRAMES;
    next = { ...next, slot: { ...slot, occ, join, locked } };
  }

  const s = next.slot!;
  if (s.join !== undefined && s.occ && abs >= s.join) {
    next = {
      ...next,
      slot: undefined,
      playing: { id: s.id, occ: s.occ },
      lastStart: { ...next.lastStart, [s.id]: t },
      starts: [...next.starts.filter((x) => t - x < 60), t],
    };
  }
  return next;
}

/**
 * The variant a request made now would most likely play: the one for the
 * next join reachable from abs + LEAD_FRAMES. Intent fetch (M3) loads only
 * this clip, not every variant.
 */
export function nextVariant(
  def: ReactionDef,
  abs: number,
  cfg: JoinConfig = HERO_JOIN,
): ActionDef | undefined {
  const join = nextJoinAbs(abs + LEAD_FRAMES, entryKs(def), cfg.loopFrames);
  return join === undefined
    ? undefined
    : def.variants[mod(join, cfg.loopFrames)];
}

/** The occurrence that owns the frames from its start to its clip end, if any. */
function reserved(q: QueueState): Occurrence | undefined {
  return q.playing?.occ ?? (q.slot?.locked ? q.slot.occ : undefined);
}

/**
 * Final schedule for the player: a playing (or locked) reaction wins; a
 * rotation occurrence overlapping it is suppressed (base shows instead).
 */
export function resolveState(
  rotation: ScheduleState,
  q: QueueState,
): ScheduleState {
  const occ = reserved(q);
  if (!occ) return rotation;
  const action = occurrenceState(rotation.abs, occ);
  if (action && action.clipFrame >= 0) return { ...rotation, action };
  const rot = rotation.action?.occurrence;
  if (rot) {
    const rotFrom = rot.start + rot.action.clip.firstFrame;
    const resFrom = occ.start + occ.action.clip.firstFrame;
    const overlaps = rotFrom < clipEndAbs(occ) && resFrom < clipEndAbs(rot);
    if (overlaps) return { ...rotation, action: undefined };
  }
  return rotation;
}

/** Absolute frame where the live rotation clip ends, or 0 (for `step`). */
export function rotationBusyUntil(rotation: ScheduleState): number {
  const a = rotation.action;
  return a && a.clipFrame >= 0 ? clipEndAbs(a.occurrence) : 0;
}

/**
 * Cooldown ledger key of a clip: the reaction that plays the same art, so a
 * rotation play and that reaction share the 30 s same-reaction cooldown
 * (every per-entry variant of a family counts as one reaction). The nod is
 * no reaction; it keeps its own key.
 */
export const FAMILY_REACTION: Record<ActionFamily, ReactionId | "nod"> = {
  nod: "nod",
  s1a: "glance-up",
};
export const cooldownKey = (a: ActionDef): string =>
  FAMILY_REACTION[a.family] ?? a.family;

/** Decision for one rotation occurrence, made once when it first appears. */
export interface RotationGate {
  /** `start` of the decided occurrence. */
  start?: number;
  allowed: boolean;
}

export const initialRotationGate = (): RotationGate => ({ allowed: false });

/** Whether the cooldowns allow `id` to start at clock time `t`. */
export function cooldownAllows(q: QueueState, id: string, t: number): boolean {
  const last = q.lastStart[id];
  if (last !== undefined && t - last < COOLDOWNS.sameS) return false;
  return earliestStart(q, t) <= t + 1e-9;
}

/**
 * Cooldown gate for the auto-rotation (review N1, N2). The first time a
 * rotation occurrence shows up it is decided once: it may play only if the
 * queue is not frozen, no reaction is playing or locked, its clip is
 * fetched, and the cooldowns allow a start at its first clip frame. An
 * allowed play is recorded in the ledger; a refused one is removed from the
 * schedule (the base shows and it doesn't count as busy time).
 */
export function gateRotation(
  q: QueueState,
  gate: RotationGate,
  rotation: ScheduleState,
  t: number,
  fetched: (id: ActionDef["id"]) => boolean,
  fps = BASE_LOOP.fps,
): { queue: QueueState; gate: RotationGate; rotation: ScheduleState } {
  const occ = rotation.action?.occurrence;
  if (!occ) return { queue: q, gate, rotation };
  const off = { ...rotation, action: undefined };
  if (gate.start !== occ.start) {
    // Not fetched yet but its clip hasn't started: wait (a prefetch may
    // still land), showing the base meanwhile.
    if (!fetched(occ.action.id) && rotation.action!.clipFrame < 0)
      return { queue: q, gate, rotation: off };
    const id = occ.action.id;
    const key = cooldownKey(occ.action);
    const startAbs = occ.start + occ.action.clip.firstFrame;
    const tStart = t + (startAbs - rotation.abs) / fps;
    const allowed =
      !q.frozen &&
      !q.playing &&
      !q.slot?.locked &&
      fetched(id) &&
      cooldownAllows(q, key, tStart);
    gate = { start: occ.start, allowed };
    if (allowed)
      q = {
        ...q,
        lastStart: { ...q.lastStart, [key]: tStart },
        starts: [...q.starts.filter((x) => tStart - x < 60), tStart],
      };
  }
  return {
    queue: q,
    gate,
    rotation: gate.allowed ? rotation : off,
  };
}
