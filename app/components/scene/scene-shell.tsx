import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router";

import { SceneStill } from "~/components/scene/scene-still";
import { HIT_OBJECTS, rectToPercent } from "~/scene/hit-areas";
import { STILL_SOURCES } from "~/scene/still";

/**
 * The still-frame scene: server-rendered v3.2 still plus a link hit area per
 * object, one overlay set per breakpoint (CSS media queries pick the one that
 * matches the visible composition). Needs no JS and has no motion, so it is
 * also the reduced-motion and no-JS version of the scene.
 */
export function SceneShell({
  focus,
  children,
}: {
  /** Object id the camera is "zoomed" to on a deep link (milestone E). */
  focus?: string;
  children?: ReactNode;
}) {
  return (
    <div className="scene" data-focus={focus}>
      <div className="scene_frame">
        <SceneStill priority />
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
