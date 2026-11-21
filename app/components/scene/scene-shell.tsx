import type { CSSProperties, ReactNode } from "react";
import { useCallback, useRef, useState } from "react";
import { Link, useRouteLoaderData } from "react-router";

import { HeroMount } from "~/components/scene/hero-mount";
import {
  FREEZE_HINT_ID,
  SceneFreezeControls,
  sceneLabel,
  useSceneFreezeHandlers,
} from "~/components/scene/scene-freeze";
import { SceneStill } from "~/components/scene/scene-still";
import { useMotionAllowed } from "~/components/scene/use-motion-allowed";
import { DEFAULT_FEATURES, type Features } from "~/features";
import { heroFreeze } from "~/scene/hero/freeze";
import {
  HIT_OBJECTS,
  rectToPercent,
  stackIndex,
  zoomOrigin,
} from "~/scene/hit-areas";
import { STILL_SOURCES } from "~/scene/still";

/**
 * The still-frame scene: server-rendered v3.2 still plus a link hit area per
 * object, one overlay set per breakpoint (CSS media queries pick the one that
 * matches the visible composition). Needs no JS and has no motion, so it is
 * also the reduced-motion and no-JS version of the scene.
 *
 * When the hero motion can run, the frame becomes a focusable
 * role="group" whose name says how to pause (WCAG 2.2.2; see
 * scene-freeze.tsx and docs/hero-player.md). It is a group, not a button,
 * so the hotspot links inside stay links for screen readers.
 */
export function SceneShell({
  focus,
  decorative = false,
  motion = false,
  children,
}: {
  /** Home only: lazy-load the hero motion over the still (laptop, motion allowed). */
  motion?: boolean;
  /** Object id the still is "already zoomed" to on a deep link. */
  focus?: string;
  /** True on content routes, where the page heading names the place. */
  decorative?: boolean;
  children?: ReactNode;
}) {
  const focused = HIT_OBJECTS.find((o) => o.id === focus);
  const features =
    useRouteLoaderData<{ features: Features }>("root")?.features ??
    DEFAULT_FEATURES;
  const allowed = useMotionAllowed();
  const animated = motion && !focused && allowed;
  const frameRef = useRef<HTMLDivElement>(null);
  const [announcement, setAnnouncement] = useState("");
  const announce = useCallback(
    (frozen: boolean) =>
      setAnnouncement(
        frozen ? "Scene animation paused" : "Scene animation playing",
      ),
    [],
  );
  const frozen = useSceneFreezeHandlers(frameRef, animated, announce);
  /* One origin per breakpoint as CSS vars; scene.css picks the matching one
     with the same media queries as the <picture> sources. Static transform,
     no transition: deep links land already zoomed, motion-free. */
  const zoomVars = focused
    ? Object.fromEntries(
        STILL_SOURCES.map((s) => [
          `--zoom-origin-${s.breakpoint}`,
          zoomOrigin(focused.rects[s.breakpoint][0], s.width, s.height),
        ]),
      )
    : undefined;
  return (
    <div
      className={focused ? "scene scene--zoomed" : "scene"}
      data-focus={focused?.id}
      style={zoomVars as CSSProperties | undefined}
    >
      <div className="scene_stage">
        {/* F1 sits before the group in the DOM, so it is the first Tab stop
          of the hero (review N6); the group (Enter/Space) comes next. */}
        {animated ? (
          <SceneFreezeControls
            frozen={frozen}
            announcement={announcement}
            onToggle={() => announce(heroFreeze().toggle("keyboard"))}
          />
        ) : null}
        <div
          ref={frameRef}
          className="scene_frame"
          {...(animated
            ? {
                role: "group",
                tabIndex: 0,
                "aria-label": sceneLabel(frozen),
                "aria-describedby": FREEZE_HINT_ID,
                "data-frozen": frozen ? "" : undefined,
              }
            : {})}
        >
          <SceneStill decorative={decorative} priority={!decorative} />
          {motion && !focused ? (
            <HeroMount
              rotationPrefetch={features.heroRotationPrefetch}
              rotationNod={features.heroRotationNod}
            />
          ) : null}
          {STILL_SOURCES.map((s) => (
            <nav
              key={s.breakpoint}
              className={`scene_hits scene_hits--${s.breakpoint}`}
              aria-label="Scene"
            >
              {HIT_OBJECTS.map((o) =>
                o.rects[s.breakpoint].map((r, i) => (
                  <Link
                    key={`${o.id}-${i}`}
                    to={o.href}
                    className="scene_hit"
                    data-object={o.id}
                    aria-current={focus === o.id ? "page" : undefined}
                    style={
                      {
                        ...rectToPercent(r, s.width, s.height),
                        zIndex: stackIndex(s.breakpoint, o.id),
                      } as CSSProperties
                    }
                    {...(i > 0 ? { "aria-hidden": true, tabIndex: -1 } : {})}
                  >
                    <span className="scene_hit-label">{o.label}</span>
                  </Link>
                )),
              )}
            </nav>
          ))}
        </div>
      </div>
      {children}
    </div>
  );
}
