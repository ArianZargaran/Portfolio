import { LinksFunction, MetaFunction, useLoaderData } from "react-router";

import { RoutePage } from "~/components/route-page/route-page";
import { PODCAST } from "~/content/podcast";
import routePage from "~/stylesheets/route-page.css?url";
import scene from "~/stylesheets/scene.css?url";
import { mergeMeta } from "~/utils/seo";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: routePage },
  { rel: "stylesheet", href: scene },
];

export const meta: MetaFunction = mergeMeta(() => [
  { title: "Podcast — Arian Zargaran" },
]);

export const loader = () => ({ podcast: PODCAST });

/** Minimal page so the headphones hit area resolves; episode embed is later. */
export default function PodcastPage() {
  const { podcast } = useLoaderData<typeof loader>();
  return (
    <RoutePage id="podcast" title={podcast.title}>
      <p className="route-page_lede">
        <strong>{podcast.name}</strong>. {podcast.intro}
      </p>
      <p>
        <a href={podcast.listenHref} rel="noopener noreferrer">
          Listen on your favourite app
        </a>
      </p>
    </RoutePage>
  );
}
