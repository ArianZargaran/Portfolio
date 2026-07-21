import { cssBundleHref } from "@remix-run/css-bundle";
import { LinksFunction, MetaFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";

import { ArchitectureDataFlowDiagram } from "~/components/work-diagrams/architecture-data-flow";
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
  { title: "Architecture & Data Flow — Arian Zargaran" },
];

const ArchitectureDataFlowRoute = () => (
  <section className="page work work-diagram-page">
    <Link className="work-diagram-page_back" to="/work">
      ← Back to Work
    </Link>
    <div className="work-diagram_wrap">
      <ArchitectureDataFlowDiagram />
    </div>
  </section>
);

export default ArchitectureDataFlowRoute;
