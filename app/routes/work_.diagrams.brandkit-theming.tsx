import { cssBundleHref } from "@remix-run/css-bundle";
import { LinksFunction, MetaFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";

import { BrandkitThemingDiagram } from "~/components/work-diagrams/brandkit-theming";
import commonThemePage from "~/stylesheets/common-page-themes.css";
import work from "~/stylesheets/work.css";
import workDiagram from "~/stylesheets/work-diagram.css";

export const links: LinksFunction = () => [
  ...(cssBundleHref ? [{ rel: "stylesheet", href: cssBundleHref }] : []),
  { rel: "stylesheet", href: commonThemePage },
  { rel: "stylesheet", href: work },
  { rel: "stylesheet", href: workDiagram },
];

export const meta: MetaFunction = () => [
  { title: "Semantic Theming — Arian Zargaran" },
];

const BrandkitThemingRoute = () => (
  <section className="page work work-diagram-page">
    <Link className="work-diagram-page_back" to="/work">
      ← Back to Work
    </Link>
    <div className="work-diagram_wrap">
      <BrandkitThemingDiagram />
    </div>
  </section>
);

export default BrandkitThemingRoute;
