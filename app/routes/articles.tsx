import { LinksFunction, MetaFunction, useLoaderData } from "react-router";

import { RoutePage } from "~/components/route-page/route-page";
import { ARTICLES, NOTEBOOK } from "~/content/articles";
import routePage from "~/stylesheets/route-page.css?url";
import { mergeMeta } from "~/utils/seo";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: routePage },
];

export const meta: MetaFunction = mergeMeta(() => [
  { title: "Notebook — Arian Zargaran" },
]);

export const loader = () => ({ notebook: NOTEBOOK, articles: ARTICLES });

/** Static notebook: no interactivity at launch (Ari, Oct 13, 2026). */
export default function ArticlesPage() {
  const { notebook, articles } = useLoaderData<typeof loader>();
  return (
    <RoutePage id="articles" title={notebook.title}>
      <p className="route-page_lede">{notebook.intro}</p>
      {articles.length > 0 ? (
        <ul className="route-page_list">
          {articles.map((a) => (
            <li key={a.slug}>
              <h2>{a.title}</h2>
              <p className="route-page_meta">
                <time dateTime={a.date}>{a.date}</time>
              </p>
              <p>{a.summary}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </RoutePage>
  );
}
