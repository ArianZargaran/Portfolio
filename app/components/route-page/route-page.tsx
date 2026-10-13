import type { ReactNode } from "react";
import { Link } from "react-router";

import { SceneStill } from "~/components/scene/scene-still";

/**
 * Page frame for a scene route: the v3.2 still as the scene placeholder, then
 * the route's content. The still is decorative here (the page heading names
 * the place); the scene shell (milestone D) replaces this placeholder.
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
  const headingId = `${id}-title`;
  return (
    <div className={`route-page route-page--${id}`}>
      <div className="route-page_scene">
        <SceneStill decorative />
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
