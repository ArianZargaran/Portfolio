import { LinksFunction, MetaFunction, Link, useLoaderData } from "react-router";

import { RoutePage } from "~/components/route-page/route-page";
import { CASE_STUDIES } from "~/content/case-studies";
import routePage from "~/stylesheets/route-page.css?url";
import scene from "~/stylesheets/scene.css?url";
import { mergeMeta } from "~/utils/seo";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: routePage },
  { rel: "stylesheet", href: scene },
];

export const meta: MetaFunction = mergeMeta(() => [
  { title: "Case studies — Arian Zargaran" },
]);

export const loader = () => ({ caseStudies: CASE_STUDIES });

export default function CaseStudiesIndex() {
  const { caseStudies } = useLoaderData<typeof loader>();
  return (
    <RoutePage id="case-studies" title="Case studies">
      <ul className="route-page_list">
        {caseStudies.map((c) => (
          <li key={c.slug}>
            <h2>
              <Link to={`/case-studies/${c.slug}`}>{c.title}</Link>
            </h2>
            <p>{c.summary}</p>
          </li>
        ))}
      </ul>
    </RoutePage>
  );
}
