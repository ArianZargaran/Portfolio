import { cssBundleHref } from "@remix-run/css-bundle";
import { LinksFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";

import { ProjectsGrid } from "~/components/grid/project-grid";
import { Isotype } from "~/components/icons/isotype/isotype";
import commonThemePage from "~/stylesheets/common-page-themes.css";
import projects from "~/stylesheets/projects.css";

export const links: LinksFunction = () => [
  ...(cssBundleHref ? [{ rel: "stylesheet", href: cssBundleHref }] : []),
  { rel: "stylesheet", href: commonThemePage },
  { rel: "stylesheet", href: projects },
];

const ProjectsPage = () => {
  return (
    <section className="page projects projects-page">
      <header className="projects-header">
        <Link className="projects-header-heading" to="/">
          <Isotype width={48} height="auto" />
          <h1>Projects</h1>
        </Link>
      </header>
      <article className="projects-article">
        <ProjectsGrid />
      </article>
    </section>
  );
};

export default ProjectsPage;
