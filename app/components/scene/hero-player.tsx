import type { CSSProperties } from "react";
import { useEffect, useRef } from "react";

import { BASE_LOOP, type ClipSource } from "~/scene/hero/base-loop";
import { createBudget } from "~/scene/hero/budget";
import { createClipStore, pickSource } from "~/scene/hero/clip-store";
import {
  absFrameAt,
  createClock,
  driftFrames,
  frameTime,
  mod,
} from "~/scene/hero/clock";
import type { ReactionEngine, ReactionHost } from "~/scene/hero/hero-reactions";
import { HERO_FEATHER_PX, HERO_RECT, heroBoxPercent } from "~/scene/hero/media";

const FPS = BASE_LOOP.fps;
/** Re-seek the loop only when it is this many frames off the clock. */
const MAX_DRIFT_FRAMES = 1.5;

type FrameCallbackVideo = HTMLVideoElement & {
  requestVideoFrameCallback?: (cb: () => void) => number;
};

/** Calls cb once the element has a decoded frame on screen. */
function onFirstFrame(v: FrameCallbackVideo, cb: () => void) {
  if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(cb);
  else if (v.readyState >= 2) cb();
  else v.addEventListener("loadeddata", cb, { once: true });
}

/**
 * Loads the reactions chunk (code split, change 1). A module-level hook so
 * tests can wait for it; the import() itself is what Vite splits on.
 */
export const loadReactions = () => import("~/scene/hero/hero-reactions");

/**
 * Plays the hero character's typing loop over the still, on the shared
 * clock. Lazy chunk (see HeroMount), the only player code on the critical
 * path. Once the loop shows its first frame it lazy-loads the reactions
 * chunk (scene/hero/hero-reactions.ts: the clip registry, the reaction
 * queue, the E2 egg, the hover/focus wiring), which appends the action
 * <video>s and drives them from this component's clock.
 *
 * Every clip, the loop included, is fetched once into a Blob and played
 * from its object URL (clip-store.ts), so the per-visit byte budget counts
 * clips, not requests, and holds with the HTTP cache off (change 2).
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
  const baseRef = useRef<HTMLVideoElement>(null);
  const flags = useRef({ rotationPrefetch, rotationNod });
  flags.current = { rotationPrefetch, rotationNod };
  const frozenRef = useRef(frozen);
  /** Set by the main effect: applies a freeze change to the running player. */
  const applyFreeze = useRef<((frozen: boolean) => void) | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    const base = baseRef.current as FrameCallbackVideo | null;
    if (!root || !base) return;
    const clock = createClock();
    let raf = 0;
    let dead = false;
    let unmounted = false;
    let live = false;
    let engine: ReactionEngine | null = null;

    // Per-visit byte budget (M3), per clip (change 2). The codec is the
    // first source the browser can play (the <source> selection rule), so
    // it is known before anything is fetched.
    const budget = createBudget();
    const store = createClipStore();
    const sources = BASE_LOOP.clip.sources;
    let source: ClipSource =
      pickSource(sources, (t) => base.canPlayType(t)) ??
      sources[sources.length - 1];
    budget.setCodec(source.codec);
    budget.charge(BASE_LOOP.clip);
    const syncBytes = () => {
      root.dataset.bytes = String(budget.spent);
      root.dataset.fetches = String(store.fetches);
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
    const host: ReactionHost = {
      root,
      clock,
      budget,
      store,
      fps: FPS,
      frozen: () => frozenRef.current,
      dead: () => dead,
      rotationNod: () => flags.current.rotationNod,
      rotationPrefetch: () => flags.current.rotationPrefetch,
    };
    // First frame up: show the loop, then lazy-load the reactions chunk.
    const goLive = () =>
      onFirstFrame(base, () => {
        if (dead || unmounted || live) return;
        live = true;
        root.dataset.state = "live";
        loadReactions().then(
          (m) => {
            if (unmounted || dead || engine) return;
            engine = m.startReactions(host);
            if (frozenRef.current) engine.freeze(true);
          },
          () => {
            // No reactions chunk (offline, a deploy in between): the loop
            // carries on without reactions.
          },
        );
      });
    const play = () => {
      base.play().then(goLive, playFailed);
    };
    const attach = (url: string) => {
      if (unmounted) return;
      base.src = url;
      base.currentTime = frameTime(
        mod(absFrameAt(clock.now(), FPS), BASE_LOOP.frames),
        FPS,
      );
      if (!frozenRef.current && !document.hidden) play();
    };
    const fetchBase = () => {
      syncBytes();
      store.load(source.src, source.type).then(attach, (e: unknown) => {
        if (!unmounted && (e as Error | undefined)?.name !== "AbortError")
          fail();
      });
    };
    // A source that won't decode is not fatal while another is left: what
    // it downloaded stays charged, and the next source is fetched (AV1 ->
    // H.264). Only the last source failing means no clip can play.
    const onError = () => {
      const i = sources.indexOf(source);
      if (dead || i < 0 || i >= sources.length - 1) return fail();
      budget.waste(store.received(source.src));
      source = sources[i + 1];
      budget.setCodec(source.codec);
      fetchBase();
    };

    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (dead || clock.paused || frozenRef.current) return;
      const t = clock.now();
      // Base loop: free-runs, re-seeked only on real drift.
      if (base.readyState >= 1) {
        const baseFrame = mod(absFrameAt(t, FPS), BASE_LOOP.frames);
        const d = driftFrames(
          base.currentTime,
          baseFrame,
          FPS,
          BASE_LOOP.frames,
        );
        if (Math.abs(d) > MAX_DRIFT_FRAMES)
          base.currentTime = frameTime(baseFrame, FPS);
      }
      engine?.tick(t);
    };

    // Freeze (WCAG 2.2.2) is an instant stop: the clock and every <video>
    // pause where they are, so the visible frame (base or action) holds.
    // Playing again resumes the same clock, so the splice stays in sync.
    applyFreeze.current = (on: boolean) => {
      engine?.freeze(on);
      if (dead) return;
      if (on) {
        clock.pause();
        base.pause();
      } else if (!document.hidden) {
        clock.resume();
        if (base.src) play();
      }
    };

    const onVisibility = () => {
      if (document.hidden) {
        engine?.hidden();
        clock.pause();
        base.pause();
      } else if (!frozenRef.current) {
        clock.resume();
        if (base.src) play();
      }
    };

    base.addEventListener("error", onError);
    document.addEventListener("visibilitychange", onVisibility);
    fetchBase();
    raf = requestAnimationFrame(tick);
    if (frozenRef.current) applyFreeze.current(true);
    return () => {
      unmounted = true;
      applyFreeze.current = null;
      engine?.dispose();
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
      base.removeEventListener("error", onError);
      base.pause();
      base.removeAttribute("src");
      store.dispose();
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
      {/* The loop: muted, inline, looping, no controls. No <source>s: the
          player picks the codec and attaches the fetched blob. */}
      <video
        ref={baseRef}
        className="hero_clip"
        data-clip="base"
        muted
        playsInline
        loop
        preload="auto"
        disablePictureInPicture
        disableRemotePlayback
        aria-hidden="true"
        tabIndex={-1}
      />
    </div>
  );
}
