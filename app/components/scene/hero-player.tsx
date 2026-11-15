import type { CSSProperties } from "react";
import { useEffect, useRef } from "react";

import {
  ACTIONS,
  BASE_LOOP,
  type ActionId,
  type Clip,
} from "~/scene/hero/actions";
import { createClock } from "~/scene/hero/clock";
import { HERO_FEATHER_PX, HERO_RECT, heroBoxPercent } from "~/scene/hero/media";
import {
  decide,
  driftFrames,
  frameTime,
  nextOccurrence,
  stateAt,
  type Shown,
} from "~/scene/hero/schedule";

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
 * (nod, leg bounce) spliced in on the shared clock. All timing comes from
 * the pure schedule (stateAt/decide); this component only keeps the
 * <video> elements on the frames it asks for. Lazy chunk (see HeroMount).
 */
export default function HeroPlayer() {
  const rootRef = useRef<HTMLDivElement>(null);
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
    let dead = false;

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
    const release = () => {
      if (!prepared) return;
      actionRefs.current[prepared]?.pause();
      prepared = null;
      ready = false;
    };
    const fail = () => {
      dead = true;
      root.dataset.state = "failed"; // the still underneath stays
    };

    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (dead || clock.paused) return;
      const s = stateAt(clock.now());

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

      // Buffer the next action ahead of its cut-in window.
      const next = nextOccurrence(s.abs);
      if (
        next &&
        next.start + next.action.clip.firstFrame - s.abs < PRELOAD_S * FPS
      ) {
        const v = actionRefs.current[next.action.id];
        if (v && v.preload !== "auto") {
          v.preload = "auto";
          v.load();
        }
      }

      const d = decide(s, shown, ready);
      if (d.prepare) {
        const { action, clipFrame } = d.prepare;
        const v = actionRefs.current[action.id] as
          | FrameCallbackVideo
          | undefined;
        if (v && prepared !== action.id) {
          release();
          prepared = action.id;
          v.currentTime = frameTime(clipFrame, FPS);
          v.play().then(
            () =>
              onFirstFrame(v, () => prepared === action.id && (ready = true)),
            () => release(),
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

    const onVisibility = () => {
      if (document.hidden) {
        clock.pause();
        base.pause();
        release();
        setShown("base");
      } else {
        clock.resume();
        void base.play().catch(fail);
      }
    };

    base.addEventListener("error", fail, true);
    document.addEventListener("visibilitychange", onVisibility);
    base.currentTime = frameTime(stateAt(clock.now()).baseFrame, FPS);
    base.play().then(
      () =>
        onFirstFrame(base, () => {
          if (!dead) root.dataset.state = "live";
        }),
      fail,
    );
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
      base.removeEventListener("error", fail, true);
      base.pause();
      release();
    };
  }, []);

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
