import type { ReactNode } from "react";
import { Link, useLocation } from "react-router";

import { SceneShell } from "~/components/scene/scene-shell";
import { focusForPath } from "~/scene/hit-areas";

/**
 * Page frame for a scene route. A deep link renders the still "already
 * zoomed" on the route's object (hit areas stay live, the current one marked
 * aria-current), then the route's loader-fed content in a labelled <main>.
 */
export function RoutePage({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  const { pathname } = useLocation();
  const headingId = `${id}-title`;
  return (
    <div className={`route-page route-page--${id}`}>
      <div className="route-page_scene">
        <SceneShell decorative focus={focusForPath(pathname)?.id} />
      </div>
      <main className="route-page_content" aria-labelledby={headingId}>
        <Link className="route-page_back" to="/">
          ← Back to the scene
        </Link>
        <h1 id={headingId}>{title}</h1>
        {children}
      </main>
    </div>
  );
}
