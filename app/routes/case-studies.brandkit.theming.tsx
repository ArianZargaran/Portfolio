import { LinksFunction, MetaFunction, Link } from "react-router";

import { BrandkitThemingDiagram } from "~/components/work-diagrams/brandkit-theming";
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
  { title: "Semantic Theming — Arian Zargaran" },
]);

const BrandkitThemingRoute = () => (
  <section className="page work work-diagram-page">
    <Link className="work-diagram-page_back" to="/case-studies/brandkit">
      ← Brandkit
    </Link>
    <div className="work-diagram_wrap">
      <BrandkitThemingDiagram />
    </div>
  </section>
);

export default BrandkitThemingRoute;
