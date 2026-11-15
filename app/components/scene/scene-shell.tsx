import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router";

import { HeroMount } from "~/components/scene/hero-mount";
import { SceneStill } from "~/components/scene/scene-still";
import { HIT_OBJECTS, rectToPercent, zoomOrigin } from "~/scene/hit-areas";
import { STILL_SOURCES } from "~/scene/still";

/**
 * The still-frame scene: server-rendered v3.2 still plus a link hit area per
 * object, one overlay set per breakpoint (CSS media queries pick the one that
 * matches the visible composition). Needs no JS and has no motion, so it is
 * also the reduced-motion and no-JS version of the scene.
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
      <div className="scene_frame">
        <SceneStill decorative={decorative} priority={!decorative} />
        {motion && !focused ? <HeroMount /> : null}
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
                  style={rectToPercent(r, s.width, s.height) as CSSProperties}
                  {...(i > 0 ? { "aria-hidden": true, tabIndex: -1 } : {})}
                >
                  <span className="scene_hit-label">{o.label}</span>
                </Link>
              )),
            )}
          </nav>
        ))}
      </div>
      {children}
    </div>
  );
}
