import { LinksFunction, MetaFunction, Link } from "react-router";

import { MarshalRef } from "~/components/work-diagrams/marshal";
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
  { title: "Marshal — Cabify Design System — Arian Zargaran" },
]);

const MarshalRoute = () => (
  <section className="page work work-diagram-page">
    <Link className="work-diagram-page_back" to="/case-studies">
      ← All case studies
    </Link>
    <div className="work-diagram_wrap">
      <MarshalRef />
    </div>
  </section>
);

export default MarshalRoute;
