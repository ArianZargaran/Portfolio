import { LinksFunction, MetaFunction , Link } from "react-router";

import { AskNovaRef } from "~/components/work-diagrams/ask-nova";
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
  { title: "Ask Nova — AI Mode Reference — Arian Zargaran" },
]);

const AskNovaRoute = () => (
  <section className="page work work-diagram-page">
    <Link className="work-diagram-page_back" to="/work">
      ← Back to Work
    </Link>
    <div className="work-diagram_wrap">
      <AskNovaRef />
    </div>
  </section>
);

export default AskNovaRoute;
