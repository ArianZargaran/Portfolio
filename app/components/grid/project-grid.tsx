import classNames from "classnames";
import React, { useEffect, useState } from "react";

import "./project-grid.css";
import { ProjectTile } from "./project-tile";

type ProjectId =
  | "animatea"
  | "airtable"
  | "newsela"
  | "apple"
  | "initiative-roll"
  | "walmart"
  | "cabify"
  | "repleat";

interface ProjectGridProps {
  className?: string;
}

interface Data {
  id: ProjectId;
  label: string;
  img: string;
  alt: string;
  h2: string;
}

const FIRST_ROW: Data[] = [
  {
    id: "airtable",
    label: "AIRTABLE",
    img: "/airtable.webp",
    alt: "Airtable project preview",
    h2: "This is a title",
  },
  {
    id: "cabify",
    label: "CABIFY",
    img: "/cabify.webp",
    alt: "Cabify project preview",
    h2: "This is a title",
  },
];

const SECOND_ROW: Data[] = [
  {
    id: "animatea",
    label: "ANIMATEA",
    img: "/animatea.webp",
    alt: "Animatea project preview",
    h2: "This is a title",
  },
  {
    id: "apple",
    label: "APPLE",
    img: "/apple.webp",
    alt: "Apple project preview",
    h2: "This is a title",
  },
  {
    id: "initiative-roll",
    label: "INITIATIVE ROLL",
    img: "/roll.webp",
    alt: "Initiative Roll project preview",
    h2: "This is a title",
  },
];

const THIRD_ROW: Data[] = [
  {
    id: "repleat",
    label: "REPLEAT",
    img: "/repleat.webp",
    alt: "Repleat project preview",
    h2: "This is a title",
  },
  {
    id: "walmart",
    label: "WALMART",
    img: "/walmart.webp",
    alt: "Walmart project preview",
    h2: "This is a title",
  },
];

const DATA: Data[][] = [FIRST_ROW, SECOND_ROW, THIRD_ROW];

export const ProjectsGrid: React.FC<ProjectGridProps> = () => {
  const [isHovered, setIsHovered] = useState<number[] | null>(null);
  const [activeProject, setActiveProject] = useState<ProjectId | null>(null);

  const activeRowIdx = activeProject
    ? DATA.findIndex((row) => row.some((p) => p.id === activeProject))
    : -1;

  const handleTileClick = (id: ProjectId) => {
    setActiveProject(id);
  };

  useEffect(() => {
    if (!activeProject) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (!target?.closest?.(".tile")) {
        setActiveProject(null);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [activeProject]);

  useEffect(() => {
    if (!activeProject) return;
    const timer = window.setTimeout(() => {
      const el = document.querySelector(
        `[data-project-id="${activeProject}"]`,
      );
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [activeProject]);

  return (
    <div
      data-testid="projects-grid"
      className={classNames("grid", { "has-active": activeProject !== null })}
    >
      {DATA.map((ROW, id) => {
        return (
          <ul
            key={id}
            data-testid="projects-row"
            className={classNames("row", `row-${id}`, {
              "is-active-row": id === activeRowIdx,
            })}
          >
            {ROW.map(({ img, label, h2, alt, id: projectId }, idx) => (
              <ProjectTile
                key={projectId}
                id={projectId}
                img={img}
                label={label}
                h2={h2}
                alt={alt}
                onHoverStart={() => setIsHovered([id, idx])}
                onHoverEnd={() => setIsHovered(null)}
                onClick={() => handleTileClick(projectId)}
                isActive={activeProject === projectId}
                isHovered={
                  !!(
                    isHovered &&
                    isHovered[0] === id &&
                    isHovered[1] === idx
                  )
                }
              />
            ))}
          </ul>
        );
      })}
    </div>
  );
};
