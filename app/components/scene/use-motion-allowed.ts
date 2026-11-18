import { useEffect, useState } from "react";

import { motionAllowed } from "~/scene/hero/media";

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

/**
 * Whether the hero motion may run here (laptop composition, no reduced
 * motion, no Save-Data/2G). False during SSR and the first client render,
 * so the server markup and hydration match; follows media-query changes.
 */
export function useMotionAllowed(): boolean {
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    const update = () => setAllowed(motionAllowed(readEnv()));
    update();
    const mqs = [LAPTOP_MQ, REDUCE_MQ].map((q) => window.matchMedia(q));
    mqs.forEach((m) => m.addEventListener("change", update));
    return () => mqs.forEach((m) => m.removeEventListener("change", update));
  }, []);
  return allowed;
}
