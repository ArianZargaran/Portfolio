import { LinksFunction, MetaFunction, Link } from "react-router";

import { AiDesignToCodeDiagram } from "~/components/work-diagrams/ai-design-to-code";
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
  { title: "Structure Over Agents — Arian Zargaran" },
]);

const AiDesignToCodeRoute = () => (
  <section className="page work work-diagram-page">
    <Link className="work-diagram-page_back" to="/work">
      ← Back to Work
    </Link>
    <div className="work-diagram_wrap">
      <AiDesignToCodeDiagram />
    </div>
  </section>
);

export default AiDesignToCodeRoute;
