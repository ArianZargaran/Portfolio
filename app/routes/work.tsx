import { cssBundleHref } from "@remix-run/css-bundle";
import { LinksFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";

import { GridWarp } from "~/components/backgrounds/grid-warp/grid-warp";
import { Isotype } from "~/components/icons/isotype/isotype";
import { WorkGrid } from "~/components/work/work-grid";
import commonThemePage from "~/stylesheets/common-page-themes.css";
import work from "~/stylesheets/work.css";

export const links: LinksFunction = () => [
  ...(cssBundleHref ? [{ rel: "stylesheet", href: cssBundleHref }] : []),
  { rel: "stylesheet", href: commonThemePage },
  { rel: "stylesheet", href: work },
];

const WorkPage = () => {
  return (
    <section className="page work work-page">
      <GridWarp />
      <header className="work-header">
        <Link className="work-header-heading" to="/">
          <Isotype width={48} height="auto" />
          <h1>Work</h1>
        </Link>
      </header>
      <article className="work-article">
        <WorkGrid />
      </article>
    </section>
  );
};

export default WorkPage;
