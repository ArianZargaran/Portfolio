import { LinksFunction, MetaFunction } from "react-router";

import { SceneShell } from "~/components/scene/scene-shell";
import routePage from "~/stylesheets/route-page.css?url";
import scene from "~/stylesheets/scene.css?url";
import { mergeMeta } from "~/utils/seo";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: routePage },
  { rel: "stylesheet", href: scene },
];

export const meta: MetaFunction = mergeMeta(() => [
  { title: "Arian Zargaran — Design Engineer" },
]);

/** Home: the still-frame scene. Every object is a link to its route. */
export default function IndexPage() {
  return (
    <main aria-labelledby="home-title">
      <h1 id="home-title" className="visually-hidden">
        Arian Zargaran, Design Engineer
      </h1>
      <SceneShell />
    </main>
  );
}
