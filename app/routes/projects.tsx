import { cssBundleHref } from "@remix-run/css-bundle";
import { LinksFunction } from "@remix-run/node";
import { useState } from "react";

import { Projects, ProjectsGrid } from "~/components/grid/project-grid";
import commonThemePage from "~/stylesheets/common-page-themes.css";
import projects from "~/stylesheets/projects.css";

export const links: LinksFunction = () => [
  ...(cssBundleHref ? [{ rel: "stylesheet", href: cssBundleHref }] : []),
  { rel: "stylesheet", href: commonThemePage },
  { rel: "stylesheet", href: projects },
];

const ProjectsPage = () => {
  const [selectedProject, setSelectedProject] = useState<Projects>();

  return (
    <section className="page royal projects">
      <header className="projects-header">
        <h1 className="projects-headline">Projects</h1>
      </header>
      <article className="projects-article">
        <ProjectsGrid
          preselected={selectedProject}
          onClick={() => setSelectedProject(selectedProject)}
        />
      </article>
    </section>
  );
};

export default ProjectsPage;
