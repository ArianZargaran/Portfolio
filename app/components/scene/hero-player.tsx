import type { CSSProperties } from "react";
import { useEffect, useRef } from "react";

import {
  ACTIONS,
  BASE_LOOP,
  type ActionDef,
  type ActionId,
  type Clip,
} from "~/scene/hero/actions";
import { codecOfCurrentSrc, createBudget } from "~/scene/hero/budget";
import { createClock } from "~/scene/hero/clock";
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
} from "~/scene/hero/egg";
import { HERO_FEATHER_PX, HERO_RECT, heroBoxPercent } from "~/scene/hero/media";
import { onHeroHotspot, onHeroReaction } from "~/scene/hero/reaction-bus";
import {
  gateRotation,
  initialQueue,
  initialRotationGate,
  planReaction,
  request,
  resolveState,
  rotationBusyUntil,
  setFrozen,
  step,
} from "~/scene/hero/reactions";
import {
  clipEndAbs,
  decide,
  driftFrames,
  frameTime,
  heroRotation,
  nextOccurrence,
  stateAt,
  type Shown,
} from "~/scene/hero/schedule";
import { wireTriggers } from "~/scene/hero/triggers";
import { warmTargets } from "~/scene/hero/warm";

const FPS = BASE_LOOP.fps;
/** Re-seek a clip only when it is this many frames off the clock. */
const MAX_DRIFT_FRAMES = 1.5;
/** Start buffering an action clip this long before it can cut in. */
const PRELOAD_S = 6;

type FrameCallbackVideo = HTMLVideoElement & {
  requestVideoFrameCallback?: (cb: () => void) => number;
};

/** Calls cb once the element has a decoded frame on screen. */
function onFirstFrame(v: FrameCallbackVideo, cb: () => void) {
  if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(cb);
  else if (v.readyState >= 2) cb();
  else v.addEventListener("loadeddata", cb, { once: true });
}

function ClipVideo({
  clip,
  id,
  loop,
  setRef,
}: {
  clip: Clip;
  id: Shown;
  loop?: boolean;
  setRef: (el: HTMLVideoElement | null) => void;
}) {
  return (
    <video
      ref={setRef}
      className="hero_clip"
      data-clip={id}
      muted
      playsInline
      loop={loop}
      preload={loop ? "auto" : "none"}
      disablePictureInPicture
      disableRemotePlayback
      aria-hidden="true"
      tabIndex={-1}
    >
      {clip.sources.map((s) => (
        <source
          key={s.src}
          src={s.src}
          type={`${s.type}; codecs="${s.codecs}"`}
        />
      ))}
    </video>
  );
}

/**
 * Plays the hero character over the still: the typing loop, with actions
 * (the E2 nod and the S1a glance-up; S1b/T2 return when they lock) spliced in on the shared clock. All timing comes from
 * the pure schedule (stateAt/decide); this component only keeps the
 * <video> elements on the frames it asks for. Lazy chunk (see HeroMount).
 */
export default function HeroPlayer({
  frozen = false,
  rotationPrefetch = false,
  rotationNod = false,
}: {
  frozen?: boolean;
  /**
   * FEATURE_HERO_ROTATION_PREFETCH: let the draft auto-rotation fetch its
   * next clip 6 s ahead. Off (default): media is fetched only on intent or a
   * trigger, and a rotation occurrence whose clip isn't buffered is skipped.
   */
  rotationPrefetch?: boolean;
  /** FEATURE_HERO_ROTATION_NOD: keep the nod's auto-rotation slot (off: PLAN §3). */
  rotationNod?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const rotationPrefetchRef = useRef(rotationPrefetch);
  rotationPrefetchRef.current = rotationPrefetch;
  const rotationRef = useRef(heroRotation(rotationNod));
  rotationRef.current = heroRotation(rotationNod);
  const frozenRef = useRef(frozen);
  /** Set by the main effect: applies a freeze change to the running player. */
  const applyFreeze = useRef<((frozen: boolean) => void) | null>(null);
  const baseRef = useRef<HTMLVideoElement | null>(null);
  const actionRefs = useRef<Partial<Record<ActionId, HTMLVideoElement>>>({});

  useEffect(() => {
    const root = rootRef.current;
    const base = baseRef.current as FrameCallbackVideo | null;
    if (!root || !base) return;
    const clock = createClock();
    let raf = 0;
    let shown: Shown = "base";
    let prepared: ActionId | null = null;
    let ready = false;
    // Generation of the current prepare: bumped by every prepare and every
    // release, so a play()/first-frame callback left over from an earlier
    // prepare (even of the same clip) can never mark a newer one ready.
    let prepareGen = 0;
    /** True while the prepare (gen, id) is still the live one. */
    const currentPrepare = (gen: number, id: ActionId) => () =>
      gen === prepareGen && prepared === id;
    let dead = false;
    // Reaction queue (M2): requests come from the bus, are applied here,
    // and take effect on the next frame.
    let queue = initialQueue(frozenRef.current);
    // Every rotation play passes the cooldowns and needs a fetched clip (N1).
    let rotGate = initialRotationGate();
    const isFetched = (id: ActionId) =>
      actionRefs.current[id]?.preload === "auto";

    // Per-visit byte budget (M3). The typing loop is always fetched; every
    // other clip goes through fetchClip, which refuses once over budget.
    const budget = createBudget();
    budget.charge(BASE_LOOP.clip);
    const syncBudget = () => {
      if (base.currentSrc)
        budget.setCodec(codecOfCurrentSrc(BASE_LOOP.clip, base.currentSrc));
      root.dataset.bytes = String(budget.spent);
    };
    /** Starts buffering an action clip if the budget allows. */
    const fetchClip = (a: ActionDef): boolean => {
      const v = actionRefs.current[a.id];
      if (!v) return false;
      if (v.preload === "auto") return true;
      if (!budget.charge(a.clip)) {
        root.dataset.budget = "full";
        return false;
      }
      v.preload = "auto";
      v.load();
      root.dataset.bytes = String(budget.spent);
      return true;
    };
    /**
     * A reaction clip (S1a) is fetched only while the E2 egg nod still fits
     * beside it, so glances can never starve the egg (review N1).
     */
    const fetchReactionClip = (a: ActionDef): boolean => {
      if (actionRefs.current[a.id]?.preload === "auto") return true;
      if (!budget.canFetchKeeping(a.clip, [EGG.action.clip])) {
        root.dataset.budget = "full";
        return false;
      }
      return fetchClip(a);
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
      if (dead || frozenRef.current) return;
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
    // join step would pick, own entry) and only then fetch that one variant,
    // keeping the egg nod affordable. A refused plan or an unaffordable clip
    // fetches nothing and the request is dropped: the loop carries on.
    const offReaction = onHeroReaction((id, kind) => {
      if (dead || frozenRef.current || document.hidden) return;
      const t = clock.now();
      const plan = planReaction(queue, id, t, stateAt(t).abs, busyUntil);
      root.dataset.reaction = plan.ok
        ? `${id}:${plan.action.id}`
        : `${id}:${plan.reason}`;
      if (!plan.ok) return;
      if (!fetchReactionClip(plan.action)) {
        root.dataset.reaction = `${id}:budget`;
        return;
      }
      if (kind === "request") queue = request(queue, id, t).state;
    });

    // The base loop is always visible; an action clip covers it while on.
    const setShown = (next: Shown) => {
      if (next === shown) return;
      if (next !== "base")
        actionRefs.current[next]?.setAttribute("data-on", "");
      if (shown !== "base")
        actionRefs.current[shown]?.removeAttribute("data-on");
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
        const v = actionRefs.current[action.id];
        if (!v || warmed.has(action.id) || prepared === action.id) continue;
        if (v.preload !== "auto" || v.readyState < 1) continue; // not fetched yet
        v.pause();
        v.currentTime = frameTime(0, FPS);
        warmed.add(action.id);
      }
    };
    const release = () => {
      if (!prepared) return;
      actionRefs.current[prepared]?.pause();
      prepared = null;
      ready = false;
      prepareGen++;
    };
    const fail = () => {
      dead = true;
      root.dataset.state = "failed"; // the still underneath stays
    };
    // A play() interrupted by pause() (freeze, tab hidden) rejects with
    // AbortError; that is not a media failure.
    const playFailed = (e: unknown) => {
      if (frozenRef.current || (e as Error | undefined)?.name === "AbortError")
        return;
      fail();
    };
    // A failed <source> is not fatal: the browser moves on to the next one
    // (AV1 -> H.264). Only the last source failing, or a media error on the
    // element itself, means no clip can play.
    const onError = (e: Event) => {
      const t = e.target;
      if (t === base || t === base.querySelector("source:last-of-type")) fail();
    };

    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (dead || clock.paused || frozenRef.current) return;
      const t = clock.now();
      const gated = gateRotation(
        queue,
        rotGate,
        stateAt(t, rotationRef.current),
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

      // Base loop: free-runs, re-seeked only on real drift.
      if (base.readyState >= 1) {
        const d = driftFrames(
          base.currentTime,
          s.baseFrame,
          FPS,
          BASE_LOOP.frames,
        );
        if (Math.abs(d) > MAX_DRIFT_FRAMES)
          base.currentTime = frameTime(s.baseFrame, FPS);
      }

      // A reaction rescheduled onto another variant needs that clip too.
      const queued = queue.slot?.occ?.action;
      if (queued && !fetchReactionClip(queued))
        queue = { ...queue, slot: undefined };
      // The auto-rotation (a DRAFT for Ari, not a reaction) buffers its next
      // clip ahead of the cut-in only behind FEATURE_HERO_ROTATION_PREFETCH.
      const next = nextOccurrence(s.abs, rotationRef.current);
      if (
        rotationPrefetchRef.current &&
        next &&
        next.start + next.action.clip.firstFrame - s.abs < PRELOAD_S * FPS
      )
        fetchClip(next.action);

      warm(
        warmTargets(s.abs, [
          queue.slot?.occ,
          egg.armed?.occ,
          nextOccurrence(s.abs, rotationRef.current) ?? undefined,
        ]),
      );

      const d = decide(s, shown, ready);
      if (d.prepare) {
        const { action, clipFrame } = d.prepare;
        const v = actionRefs.current[action.id] as
          | FrameCallbackVideo
          | undefined;
        // Never play() an element that wasn't fetched through fetchClip:
        // play() on preload="none" would start a download outside the
        // intent rule and the budget. That occurrence shows the base.
        if (v && v.preload !== "auto") {
          if (prepared) release();
        } else if (v && prepared !== action.id) {
          release();
          prepared = action.id;
          const current = currentPrepare(++prepareGen, action.id);
          warmed.delete(action.id);
          v.currentTime = frameTime(clipFrame, FPS);
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

    // Freeze (WCAG 2.2.2) is an instant stop: the clock and every <video>
    // pause where they are, so the visible frame (base or action) holds.
    // Playing again resumes the same clock, so the splice stays in sync.
    applyFreeze.current = (on: boolean) => {
      queue = setFrozen(queue, on);
      if (on) leaveHero();
      if (dead) return;
      const action = prepared ? actionRefs.current[prepared] : undefined;
      if (on) {
        clock.pause();
        base.pause();
        action?.pause();
      } else if (!document.hidden) {
        clock.resume();
        void base.play().catch(playFailed);
        if (action && ready && prepared) {
          // Same generation guard as the prepare path: a late rejection of
          // this resume must not release a newer prepare (review Low 3).
          const current = currentPrepare(prepareGen, prepared);
          void action.play().catch(() => {
            if (current()) release();
          });
        }
      }
    };

    const onVisibility = () => {
      if (document.hidden) {
        leaveHero();
        clock.pause();
        base.pause();
        release();
        setShown("base");
      } else if (!frozenRef.current) {
        clock.resume();
        void base.play().catch(playFailed);
      }
    };

    base.addEventListener("error", onError, true);
    base.addEventListener("loadedmetadata", syncBudget);
    document.addEventListener("visibilitychange", onVisibility);
    base.currentTime = frameTime(stateAt(clock.now()).baseFrame, FPS);
    base.play().then(
      () =>
        onFirstFrame(base, () => {
          if (!dead) root.dataset.state = "live";
        }),
      playFailed,
    );
    raf = requestAnimationFrame(tick);
    if (frozenRef.current) applyFreeze.current(true);
    // Event wiring (M5): hotspot hover/focus, idle, tab return, back in view.
    const frame = root.closest<HTMLElement>(".scene_frame");
    const offTriggers = frame ? wireTriggers(frame) : null;
    return () => {
      applyFreeze.current = null;
      offReaction();
      offHotspot();
      offTriggers?.();
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
      base.removeEventListener("error", onError, true);
      base.removeEventListener("loadedmetadata", syncBudget);
      base.pause();
      release();
    };
  }, []);

  useEffect(() => {
    if (frozenRef.current === frozen) return;
    frozenRef.current = frozen;
    applyFreeze.current?.(frozen);
  }, [frozen]);

  const feather = {
    "--hero-feather-x": `${((HERO_FEATHER_PX / HERO_RECT.w) * 100).toFixed(3)}%`,
    "--hero-feather-y": `${((HERO_FEATHER_PX / HERO_RECT.h) * 100).toFixed(3)}%`,
  };
  return (
    <div
      ref={rootRef}
      className="hero"
      data-state="loading"
      data-shown="base"
      data-frozen={frozen ? "" : undefined}
      aria-hidden="true"
      style={{ ...heroBoxPercent(), ...feather } as CSSProperties}
    >
      <ClipVideo
        clip={BASE_LOOP.clip}
        id="base"
        loop
        setRef={(el) => (baseRef.current = el)}
      />
      {Object.values(ACTIONS).map((a) => (
        <ClipVideo
          key={a.id}
          clip={a.clip}
          id={a.id}
          setRef={(el) => {
            if (el) actionRefs.current[a.id] = el;
            else delete actionRefs.current[a.id];
          }}
        />
      ))}
    </div>
  );
}
