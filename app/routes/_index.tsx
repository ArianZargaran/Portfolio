import { LinksFunction, MetaFunction, useRouteLoaderData } from "react-router";

import { PauseAnimationsControl } from "~/components/scene/scene-freeze";
import { SceneShell } from "~/components/scene/scene-shell";
import { DEFAULT_FEATURES, type Features } from "~/features";
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

/** Home: the scene still, with the hero motion lazy-loaded over it
    (laptop, motion allowed). Every object is a link to its route. */
export default function IndexPage() {
  const features =
    useRouteLoaderData<{ features: Features }>("root")?.features ??
    DEFAULT_FEATURES;
  return (
    <main aria-labelledby="home-title">
      <h1 id="home-title" className="visually-hidden">
        Arian Zargaran, Design Engineer
      </h1>
      <SceneShell motion />
      {/* F5 hook (FEATURE_HERO_PAUSE_LINK, off): the site has no footer yet,
          so the control sits right below the scene. */}
      {features.heroPauseLink ? <PauseAnimationsControl /> : null}
    </main>
  );
}
