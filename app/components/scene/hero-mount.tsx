import { lazy, Suspense, useEffect, useState } from "react";

import { useHeroFreeze } from "~/components/scene/use-hero-freeze";
import { useMotionAllowed } from "~/components/scene/use-motion-allowed";

const HeroPlayer = lazy(() => import("./hero-player"));

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
 * changing (e.g. the user turns on reduced motion) and to the shared
 * freeze state (scene/hero/freeze.ts).
 */
export function HeroMount({
  rotationPrefetch = false,
  rotationNod = false,
}: {
  /** FEATURE_HERO_ROTATION_PREFETCH (off by default). */
  rotationPrefetch?: boolean;
  /** FEATURE_HERO_ROTATION_NOD (off by default). */
  rotationNod?: boolean;
}) {
  const [ready, setReady] = useState(false);
  const allowed = useMotionAllowed();
  const { frozen } = useHeroFreeze();
  // F3: a visitor who froze the scene earlier gets the still only, and no
  // player chunk or media, until they press play. Freezing a running player
  // keeps it mounted and holds its current frame (instant stop).
  const [mounted, setMounted] = useState(false);
  const show = ready && allowed && (!frozen || mounted);

  useEffect(() => afterLoadAndIdle(() => setReady(true)), []);
  useEffect(() => {
    if (show) setMounted(true);
  }, [show]);

  if (!show) return null;
  return (
    <Suspense fallback={null}>
      <HeroPlayer
        frozen={frozen}
        rotationPrefetch={rotationPrefetch}
        rotationNod={rotationNod}
      />
    </Suspense>
  );
}
