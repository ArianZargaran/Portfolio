import { useEffect, useState, useSyncExternalStore } from "react";

import { heroFreeze } from "~/scene/hero/freeze";
import { motionAllowed } from "~/scene/hero/media";
import {
  evaluateHeroGate,
  heroGate,
  subscribeHeroGate,
} from "~/scene/hero/net-gate-store";

export const LAPTOP_MQ = "(min-width: 1025px)";
export const REDUCE_MQ = "(prefers-reduced-motion: reduce)";

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

/** Runs cb after the window load event (Resource Timing is complete then). */
function afterLoad(cb: () => void): () => void {
  if (document.readyState === "complete") {
    cb();
    return () => undefined;
  }
  window.addEventListener("load", cb, { once: true });
  return () => window.removeEventListener("load", cb);
}

const noGate = () => undefined;

/**
 * Whether the hero motion may run here: the laptop composition, no reduced
 * motion, and the network gate (M7, scene/hero/net-gate.ts) not saying
 * "still". False during SSR, the first client render (so server markup
 * and hydration match) and until the gate has run after the load event.
 * Follows media-query changes. A gate verdict of "frozen" (inconclusive
 * measurement) allows the scene but starts it paused for this page.
 */
export function useMotionAllowed(): boolean {
  const [envOK, setEnvOK] = useState(false);
  const gate = useSyncExternalStore(subscribeHeroGate, heroGate, noGate);
  useEffect(() => {
    const update = () => setEnvOK(motionAllowed(readEnv()));
    update();
    const mqs = [LAPTOP_MQ, REDUCE_MQ].map((q) => window.matchMedia(q));
    mqs.forEach((m) => m.addEventListener("change", update));
    return () => mqs.forEach((m) => m.removeEventListener("change", update));
  }, []);
  useEffect(() => {
    if (!envOK) return;
    return afterLoad(() => void evaluateHeroGate());
  }, [envOK]);
  useEffect(() => {
    if (envOK && gate?.verdict === "frozen") heroFreeze().freezeForPage();
  }, [envOK, gate]);
  return envOK && !!gate && gate.verdict !== "still";
}
