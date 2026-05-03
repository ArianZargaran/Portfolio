import classNames from "classnames";
import React, { useState } from "react";

import { useMediaQuery } from "~/hooks/useMediaQuery";

import "./project-grid.css";
import { ProjectTile } from "./project-tile";
import { ProjectsModal } from "./projects-modal";

export type ProjectId =
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
  const isMediumBreakpoint = useMediaQuery("(max-width: 800px)");
  const [selectedProject, setSelectedProject] = useState<ProjectId | null>(
    null,
  );

  const handleModalClose = () => {
    setSelectedProject(null);
  };

  return (
    <div className="grid">
      <ProjectsModal
        selectedProject={selectedProject ?? undefined}
        onClose={handleModalClose}
      />

      {DATA.map((ROW, id) => {
        return (
          <ul key={id} className={classNames("row", `row-${id}`)}>
            {ROW.map(({ img, label, h2, alt, id: projectId }, idx) => (
              <ProjectTile
                key={projectId}
                img={img}
                label={label}
                h2={h2}
                alt={alt}
                onHoverStart={() => setIsHovered([id, idx])}
                onHoverEnd={() => setIsHovered(null)}
                onClick={() => setSelectedProject(projectId)}
                isHovered={
                  (isHovered && isHovered[0] === id && isHovered[1] === idx) ||
                  isMediumBreakpoint
                }
              />
            ))}
          </ul>
        );
      })}
    </div>
  );
};
