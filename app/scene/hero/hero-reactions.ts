/**
 * Lazy reactions chunk (change 1, code split). The loop player
 * (components/scene/hero-player.tsx) imports this with a dynamic import()
 * once the typing loop shows its first frame, so the clip registry, the
 * reaction queue, the E2 egg, the event wiring and the warm pool never sit
 * on the first-paint path, and never load at all for reduced motion,
 * Save-Data, the tablet/mobile compositions or a stored freeze (the loop
 * player itself doesn't load there).
 *
 * The logic is the one that lived in hero-player.tsx through 7c6ea46,
 * unchanged except where changes 2 and 3 deliberately update it:
 * - every clip is fetched once into a Blob through the shared ClipStore and
 *   played from its object URL (per-clip byte count, cache on or off);
 * - a queued reaction's clip is fetched only FETCH_LEAD_FRAMES before it
 *   cuts in, and a fetch the queue no longer needs (a replaced glance in
 *   poster-then-headphones) is aborted and refunded down to the bytes that
 *   actually arrived.
 */
import { ACTIONS, type ActionDef, type ActionId, type Clip } from "./actions";
import type { Budget } from "./budget";
import type { ClipStore, LinkEstimate } from "./clip-store";
import { frameTime, driftFrames, type SceneClock } from "./clock";
import {
  applyEgg,
  armEgg,
  disarmEgg,
  EGG,
  eggBusyUntil,
  eggVisit,
  eggWouldComplete,
  initialEgg,
  stepEgg,
} from "./egg";
import { onHeroHotspot, onHeroReaction } from "./reaction-bus";
import {
  abandonedFetches,
  fetchDue,
  fetchLeadFrames,
  gateRotation,
  initialQueue,
  initialRotationGate,
  planReaction,
  request,
  resolveState,
  rotationBusyUntil,
  setFrozen,
  step,
} from "./reactions";
import {
  clipEndAbs,
  decide,
  heroRotation,
  nextOccurrence,
  stateAt,
  type Occurrence,
  type Shown,
} from "./schedule";
import { wireTriggers } from "./triggers";
import { isPrimed, warmTargets } from "./warm";

/** Re-seek a clip only when it is this many frames off the clock. */
const MAX_DRIFT_FRAMES = 1.5;
/** Start buffering a rotation clip this long before it can cut in. */
const PRELOAD_S = 6;

type FrameCallbackVideo = HTMLVideoElement & {
  requestVideoFrameCallback?: (cb: () => void) => number;
};

/** Calls cb once the element has a decoded frame on screen. */
export function onFirstFrame(v: FrameCallbackVideo, cb: () => void) {
  if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(cb);
  else if (v.readyState >= 2) cb();
  else v.addEventListener("loadeddata", cb, { once: true });
}

/** What the loop player shares with the reactions chunk. */
export interface ReactionHost {
  /** The `.hero` root: action <video>s are appended to it. */
  root: HTMLElement;
  clock: SceneClock;
  budget: Budget;
  store: ClipStore;
  fps: number;
  frozen(): boolean;
  dead(): boolean;
  rotationNod(): boolean;
  rotationPrefetch(): boolean;
  /** The base loop's download speed (adaptive fetch lead, review N1). */
  link(): LinkEstimate | undefined;
}

export interface ReactionEngine {
  /** Runs once per animation frame while the player is live and not frozen. */
  tick(t: number): void;
  /** Freeze (WCAG 2.2.2) on/off: instant stop / resume of the action clip. */
  freeze(on: boolean): void;
  /** Tab hidden: back to the base, egg disarmed. */
  hidden(): void;
  dispose(): void;
}

/** The action clip <video>: muted, inline, no controls, nothing fetched until a blob is attached. */
function actionVideo(a: ActionDef): HTMLVideoElement {
  const v = document.createElement("video");
  v.className = "hero_clip";
  v.dataset.clip = a.id;
  v.muted = true;
  v.setAttribute("muted", "");
  v.playsInline = true;
  v.setAttribute("playsinline", "");
  v.preload = "none";
  v.setAttribute("disablepictureinpicture", "");
  v.setAttribute("disableremoteplayback", "");
  v.setAttribute("aria-hidden", "true");
  v.tabIndex = -1;
  return v;
}

export function startReactions(host: ReactionHost): ReactionEngine {
  const { root, clock, budget, store, fps: FPS } = host;
  const els: Partial<Record<ActionId, FrameCallbackVideo>> = {};
  for (const a of Object.values(ACTIONS)) {
    els[a.id] = actionVideo(a);
    root.appendChild(els[a.id]!);
  }
  let disposed = false;
  let shown: Shown = "base";
  let prepared: ActionId | null = null;
  let ready = false;
  // Generation of the current prepare: bumped by every prepare and every
  // release, so a play()/first-frame callback left over from an earlier
  // prepare (even of the same clip) can never mark a newer one ready.
  let prepareGen = 0;
  const currentPrepare = (gen: number, id: ActionId) => () =>
    gen === prepareGen && prepared === id;
  let queue = initialQueue(host.frozen());
  let rotGate = initialRotationGate();

  const srcOf = (clip: Clip) =>
    clip.sources.find((s) => s.codec === budget.codec) ?? clip.sources[0];
  /** Fetch started or done for this clip (in the visit's codec). */
  const loading = (a: ActionDef) => {
    const st = store.state(srcOf(a.clip).src);
    return st === "fetching" || st === "done";
  };
  /** The clip's blob is attached: it can play without touching the network. */
  const isFetched = (id: ActionId) => els[id]?.preload === "auto";
  const syncData = () => {
    root.dataset.bytes = String(budget.spent);
    root.dataset.wasted = String(budget.wasted);
    root.dataset.fetches = String(store.fetches);
  };
  // Reaction clips whose fetch the queue started (change 3).
  const queueFetches = new Set<ActionId>();
  // Review N1: fetch lead from the measured link, per clip size. The most
  // pessimistic of: the base loop's download, the latest reaction clip's
  // download, and the browser's own estimate (Network Information API
  // downlink/rtt, where it exists).
  let clipLink: LinkEstimate | undefined;
  const linkNow = (): LinkEstimate | undefined => {
    const c = (
      navigator as { connection?: { downlink?: number; rtt?: number } }
    ).connection;
    const all = [
      host.link(),
      clipLink,
      c && c.downlink && c.downlink > 0
        ? { bps: c.downlink * 1e6, ttfbMs: c.rtt ?? 0 }
        : undefined,
    ].filter((x): x is LinkEstimate => !!x);
    if (!all.length) return undefined;
    const l = {
      bps: Math.min(...all.map((x) => x.bps)),
      ttfbMs: Math.max(...all.map((x) => x.ttfbMs)),
    };
    root.dataset.linkKbps = String(Math.round(l.bps / 1000));
    return l;
  };
  const due = (occ: Occurrence, abs: number) => {
    const lead = fetchLeadFrames(srcOf(occ.action.clip).bytes, linkNow(), FPS);
    root.dataset.fetchLead = String(lead);
    return fetchDue(occ, abs, lead);
  };
  let aborted = 0;
  // Clips whose fetch failed (404, network error) this visit: never asked
  // for again, so a broken clip can't be re-fetched on every tick (review
  // R1). Its request is refused like an unaffordable one; the loop plays.
  const failedClips = new Set<string>();

  /** Charges and starts the single fetch of an action clip. */
  const fetchClip = (a: ActionDef): boolean => {
    const v = els[a.id];
    if (!v) return false;
    if (loading(a)) return true;
    if (failedClips.has(srcOf(a.clip).src)) return false;
    if (!budget.charge(a.clip)) {
      root.dataset.budget = "full";
      return false;
    }
    const s = srcOf(a.clip);
    store.load(s.src, s.type).then(
      (url) => {
        if (disposed) return;
        v.src = url;
        v.preload = "auto";
        queueFetches.delete(a.id);
        clipLink = store.link(s.src) ?? clipLink;
      },
      () => {
        // A failed fetch keeps only what arrived; an aborted one was
        // refunded where it was aborted.
        if (store.state(s.src) === "failed") {
          failedClips.add(s.src);
          budget.refund(a.clip, store.received(s.src));
          queueFetches.delete(a.id);
          if (!disposed) syncData();
        }
      },
    );
    syncData();
    return true;
  };
  /**
   * A reaction clip (S1a, T6) is affordable only while the E2 egg nod still
   * fits beside it, so hovers can never starve the egg (review N1).
   */
  const affordable = (a: ActionDef): boolean =>
    loading(a) || budget.canFetchKeeping(a.clip, [EGG.action.clip]);
  const fetchReactionClip = (a: ActionDef): boolean => {
    if (loading(a)) return true;
    if (!affordable(a)) {
      root.dataset.budget = "full";
      return false;
    }
    if (!fetchClip(a)) return false;
    queueFetches.add(a.id);
    return true;
  };
  /** Change 3: abort fetches the queue no longer needs; refund what didn't arrive. */
  const abortAbandoned = () => {
    for (const id of abandonedFetches(queue, queueFetches)) {
      queueFetches.delete(id);
      const a = ACTIONS[id];
      const src = srcOf(a.clip).src;
      if (store.state(src) !== "fetching") continue;
      budget.refund(a.clip, store.abort(src));
      aborted++;
      root.dataset.aborted = String(aborted);
      syncData();
    }
  };

  // Frame up to which a live rotation clip or committed egg nod holds the
  // stage (from the last tick), for planning a reaction's join.
  let busyUntil = 0;
  // E2 egg (M4), outside the queue. Hotspot visits come from the event
  // wiring (M5); a completed sequence arms the nod on the next frame,
  // once the queue has scheduled T6 (so the nod waits for its end).
  let egg = initialEgg();
  let eggPending = false;
  const hotspotIntent = (id: string) => {
    if (eggWouldComplete(egg, id, clock.now())) fetchClip(EGG.action);
  };
  const hotspotVisit = (id: string) => {
    if (host.dead() || host.frozen()) return;
    const r = eggVisit(egg, id, clock.now());
    egg = r.state;
    if (r.completed && fetchClip(EGG.action)) eggPending = true;
  };
  const leaveHero = () => {
    egg = disarmEgg(egg);
    eggPending = false;
  };
  const offHotspot = onHeroHotspot((id, kind) => {
    if (kind === "intent") hotspotIntent(id);
    else if (kind === "visit") hotspotVisit(id);
    else leaveHero();
  });

  // Intent (hover/focus, dwell-confirmed) and the request first dry-run
  // the queue (planReaction: freeze, cooldowns, playing/locked slot, the
  // join step would pick, own entry). A refused plan or an unaffordable
  // clip fetches nothing and the request is dropped: the loop carries on.
  // An accepted one fetches its single variant only when it is due
  // (fetchDue, change 3); until then a newer request may replace it for free.
  const offReaction = onHeroReaction((id, kind) => {
    if (host.dead() || host.frozen() || document.hidden) return;
    const t = clock.now();
    const abs = stateAt(t).abs;
    const plan = planReaction(queue, id, t, abs, busyUntil);
    root.dataset.reaction = plan.ok
      ? `${id}:${plan.action.id}`
      : `${id}:${plan.reason}`;
    if (!plan.ok) return;
    if (!affordable(plan.action)) {
      root.dataset.budget = "full";
      root.dataset.reaction = `${id}:budget`;
      return;
    }
    if (kind !== "request") return;
    // Schedule straight away onto the planned join (review R1): left
    // unscheduled until the next tick, a request in the last tick of
    // frame J-4 would be re-planned at J-3 onto J+36 and fetch a second
    // variant while the first is never played.
    queue = step(request(queue, id, t).state, t, abs, busyUntil);
    abortAbandoned();
    const occ = queue.slot?.occ;
    if (occ && due(occ, abs) && !fetchReactionClip(occ.action)) {
      root.dataset.reaction = `${id}:budget`;
      queue = { ...queue, slot: undefined };
    }
  });

  // The base loop is always visible; an action clip covers it while on.
  const setShown = (next: Shown) => {
    if (next === shown) return;
    if (next !== "base") els[next]?.setAttribute("data-on", "");
    if (shown !== "base") els[shown]?.removeAttribute("data-on");
    shown = next;
    root.dataset.shown = next;
  };
  // Warm pool (M6): action elements seeked to their first clip frame and
  // held paused just before they cut in (at most 2, plus the base).
  const warmed = new Set<ActionId>();
  const warm = (targets: ReturnType<typeof warmTargets>) => {
    const want = new Set(targets.map((w) => w.action.id));
    warmed.forEach((id) => !want.has(id) && warmed.delete(id));
    for (const { action } of targets) {
      const v = els[action.id];
      if (!v || warmed.has(action.id) || prepared === action.id) continue;
      if (v.preload !== "auto" || v.readyState < 1) continue; // not fetched yet
      v.pause();
      v.currentTime = frameTime(0, FPS);
      warmed.add(action.id);
    }
  };
  const release = () => {
    if (!prepared) return;
    els[prepared]?.pause();
    prepared = null;
    ready = false;
    prepareGen++;
  };

  const tick = (t: number) => {
    if (disposed || host.dead()) return;
    const rotation0 = heroRotation(host.rotationNod());
    const gated = gateRotation(
      queue,
      rotGate,
      stateAt(t, rotation0),
      t,
      isFetched,
    );
    queue = gated.queue;
    rotGate = gated.gate;
    const rotation = gated.rotation;
    const abs = rotation.abs;
    busyUntil = Math.max(rotationBusyUntil(rotation), eggBusyUntil(egg, abs));
    queue = step(queue, t, abs, busyUntil);
    if (eggPending) {
      eggPending = false;
      const t6 =
        queue.playing?.id === EGG.reaction
          ? queue.playing.occ
          : queue.slot?.id === EGG.reaction
            ? queue.slot.occ
            : undefined;
      egg = armEgg(egg, abs, t6 ? clipEndAbs(t6) : 0);
    }
    egg = stepEgg(egg, abs, [
      queue.slot?.occ,
      queue.playing?.occ,
      rotation.action?.occurrence,
    ]);
    const s = resolveState(applyEgg(rotation, egg), queue);

    // A queued reaction (possibly rescheduled onto another variant) is
    // fetched once it is due; one that can no longer be afforded is dropped.
    abortAbandoned();
    const queued = queue.slot?.occ;
    if (queued && !loading(queued.action)) {
      if (!affordable(queued.action)) queue = { ...queue, slot: undefined };
      else if (due(queued, abs) && !fetchReactionClip(queued.action))
        queue = { ...queue, slot: undefined };
    }
    // The auto-rotation (a DRAFT for Ari, not a reaction) buffers its next
    // clip ahead of the cut-in only behind FEATURE_HERO_ROTATION_PREFETCH.
    const next = nextOccurrence(s.abs, rotation0);
    if (
      host.rotationPrefetch() &&
      next &&
      next.start + next.action.clip.firstFrame - s.abs < PRELOAD_S * FPS
    )
      fetchClip(next.action);

    warm(
      warmTargets(s.abs, [queue.slot?.occ, egg.armed?.occ, next ?? undefined]),
    );

    const d = decide(s, shown, ready);
    if (d.prepare) {
      const { action, clipFrame } = d.prepare;
      const v = els[action.id];
      // Never play() an element without its fetched blob: it has no source,
      // and nothing may download outside the intent rule and the budget.
      // That occurrence shows the base.
      if (v && v.preload !== "auto") {
        if (prepared) release();
      } else if (v && prepared !== action.id) {
        // Review N2: an element held paused on this very frame, decoded
        // (the warm pool leaves it there just before the join), already
        // shows the cut-in pixels: ready now, no seek. isPrimed reads the
        // element's real state.
        const primed = isPrimed(v, clipFrame, FPS);
        release();
        prepared = action.id;
        const current = currentPrepare(++prepareGen, action.id);
        warmed.delete(action.id);
        if (primed) ready = true;
        else v.currentTime = frameTime(clipFrame, FPS);
        root.dataset.primed = primed ? action.id : "";
        v.play().then(
          () =>
            onFirstFrame(v, () => {
              if (current()) ready = true;
            }),
          () => {
            if (current()) release();
          },
        );
      } else if (v && ready) {
        const drift = driftFrames(v.currentTime, clipFrame, FPS);
        if (Math.abs(drift) > MAX_DRIFT_FRAMES)
          v.currentTime = frameTime(clipFrame, FPS);
      }
    } else if (prepared) {
      release();
    }
    setShown(d.show);
  };

  const offTriggers = (() => {
    const frame = root.closest<HTMLElement>(".scene_frame");
    return frame ? wireTriggers(frame) : null;
  })();
  root.dataset.reactions = "ready";

  return {
    tick,
    freeze(on) {
      queue = setFrozen(queue, on);
      if (on) {
        leaveHero();
        abortAbandoned();
      }
      if (host.dead()) return;
      const action = prepared ? els[prepared] : undefined;
      if (on) action?.pause();
      else if (!document.hidden && action && ready && prepared) {
        // Same generation guard as the prepare path: a late rejection of
        // this resume must not release a newer prepare (review Low 3).
        const current = currentPrepare(prepareGen, prepared);
        void action.play().catch(() => {
          if (current()) release();
        });
      }
    },
    hidden() {
      leaveHero();
      release();
      setShown("base");
    },
    dispose() {
      disposed = true;
      offReaction();
      offHotspot();
      offTriggers?.();
      release();
      Object.values(els).forEach((v) => {
        v.pause();
        v.remove();
      });
      delete root.dataset.reactions;
    },
  };
}
