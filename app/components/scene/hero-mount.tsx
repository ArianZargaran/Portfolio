import { lazy, Suspense, useEffect, useState } from "react";

import { motionAllowed } from "~/scene/hero/media";

const HeroPlayer = lazy(() => import("./hero-player"));

const LAPTOP_MQ = "(min-width: 1025px)";
const REDUCE_MQ = "(prefers-reduced-motion: reduce)";

interface NetInfo {
  saveData?: boolean;
  effectiveType?: string;
}

function readEnv() {
  const conn = (navigator as Navigator & { connection?: NetInfo }).connection;
  return {
    laptop: window.matchMedia(LAPTOP_MQ).matches,
    reducedMotion: window.matchMedia(REDUCE_MQ).matches,
    saveData: conn?.saveData,
    effectiveType: conn?.effectiveType,
  };
}

/** Resolves after the window load event, then an idle slot (or 1.5 s). */
function afterLoadAndIdle(cb: () => void): () => void {
  let cancelled = false;
  let idle: number | undefined;
  const go = () => {
    if (cancelled) return;
    const ric = window.requestIdleCallback;
    idle = ric
      ? ric(() => !cancelled && cb(), { timeout: 1500 })
      : window.setTimeout(() => !cancelled && cb(), 200);
  };
  if (document.readyState === "complete") go();
  else window.addEventListener("load", go, { once: true });
  return () => {
    cancelled = true;
    window.removeEventListener("load", go);
    if (idle !== undefined) {
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle);
      window.clearTimeout(idle);
    }
  };
}

/**
 * Mounts the hero motion over the SSR still, client-side only, after first
 * paint and the load event. Nothing is fetched (no JS chunk, no media) for
 * reduced motion, Save-Data/2G, or the tablet/mobile compositions; the
 * still and its hit areas stay as they are. Reacts to the media queries
 * changing (e.g. the user turns on reduced motion).
 */
export function HeroMount() {
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => afterLoadAndIdle(() => setReady(true)), []);

  useEffect(() => {
    const update = () => setAllowed(motionAllowed(readEnv()));
    update();
    const mqs = [LAPTOP_MQ, REDUCE_MQ].map((q) => window.matchMedia(q));
    mqs.forEach((m) => m.addEventListener("change", update));
    return () => mqs.forEach((m) => m.removeEventListener("change", update));
  }, []);

  if (!ready || !allowed) return null;
  return (
    <Suspense fallback={null}>
      <HeroPlayer />
    </Suspense>
  );
}
