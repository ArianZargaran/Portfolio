import { cssBundleHref } from "@remix-run/css-bundle";
import { LinksFunction, MetaFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";

import { ContentModelingDiagram } from "~/components/work-diagrams/content-modeling";
import commonThemePage from "~/stylesheets/common-page-themes.css";
import workDiagram from "~/stylesheets/work-diagram.css";
import work from "~/stylesheets/work.css";
import { mergeMeta } from "~/utils/seo";

export const links: LinksFunction = () => [
  ...(cssBundleHref ? [{ rel: "stylesheet", href: cssBundleHref }] : []),
  { rel: "stylesheet", href: commonThemePage },
  { rel: "stylesheet", href: work },
  { rel: "stylesheet", href: workDiagram },
];

export const meta: MetaFunction = mergeMeta(() => [
  { title: "Two Ways to Model Content — Arian Zargaran" },
]);

const ContentModelingRoute = () => (
  <section className="page work work-diagram-page">
    <Link className="work-diagram-page_back" to="/work">
      ← Back to Work
    </Link>
    <div className="work-diagram_wrap">
      <ContentModelingDiagram />
    </div>
  </section>
);

export default ContentModelingRoute;
