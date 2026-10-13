import { LinksFunction, MetaFunction, Link } from "react-router";

import { ArchitectureDataFlowDiagram } from "~/components/work-diagrams/architecture-data-flow";
import commonThemePage from "~/stylesheets/common-page-themes.css?url";
import workDiagram from "~/stylesheets/work-diagram.css?url";
import work from "~/stylesheets/work.css?url";
import { mergeMeta } from "~/utils/seo";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: commonThemePage },
  { rel: "stylesheet", href: work },
  { rel: "stylesheet", href: workDiagram },
];

export const meta: MetaFunction = mergeMeta(() => [
  { title: "Architecture & Data Flow — Arian Zargaran" },
]);

const ArchitectureDataFlowRoute = () => (
  <section className="page work work-diagram-page">
    <Link className="work-diagram-page_back" to="/case-studies/brandkit">
      ← Brandkit
    </Link>
    <div className="work-diagram_wrap">
      <ArchitectureDataFlowDiagram />
    </div>
  </section>
);

export default ArchitectureDataFlowRoute;
