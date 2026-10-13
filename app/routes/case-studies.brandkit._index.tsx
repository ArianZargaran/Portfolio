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
  { title: "Brandkit — Case study — Arian Zargaran" },
]);

export const loader = () => {
  const brandkit = CASE_STUDIES.find((c) => c.slug === "brandkit")!;
  return { brandkit };
};

export default function BrandkitCase() {
  const { brandkit } = useLoaderData<typeof loader>();
  return (
    <RoutePage id="brandkit" title={brandkit.title}>
      <p>{brandkit.summary}</p>
      <ul className="route-page_list">
        {brandkit.parts?.map((p) => (
          <li key={p.slug}>
            <Link to={`/case-studies/brandkit/${p.slug}`}>{p.title}</Link>
          </li>
        ))}
      </ul>
      <p>
        <Link to="/case-studies">← All case studies</Link>
      </p>
    </RoutePage>
  );
}
