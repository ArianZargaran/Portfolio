import classNames from "classnames";
import React, { useState } from "react";

import { useMediaQuery } from "~/hooks/useMediaQuery";

import "./project-grid.css";
import { ProjectTile } from "./project-tile";
import { ProjectsModal } from "./projects-modal";

export type Project =
  | "ANIMATEA"
  | "AIRTABLE"
  | "NEWSELA"
  | "APPLE"
  | "INITIATIVE ROLL"
  | "WALMART"
  | "CABIFY"
  | "REPLEAT";

interface ProjectGridProps {
  className?: string;
}

interface Data {
  img: string;
  alt: string;
  eyebrow: Project;
  h2: string;
}

const FIRST_ROW: Data[] = [
  {
    img: "/airtable.webp",
    alt: "",
    eyebrow: "AIRTABLE",
    h2: "This is a title",
  },
  {
    img: "/cabify.webp",
    alt: "",
    eyebrow: "CABIFY",
    h2: "This is a title",
  },
];

const SECOND_ROW: Data[] = [
  {
    img: "/animatea.webp",
    alt: "",
    eyebrow: "ANIMATEA",
    h2: "This is a title",
  },

  {
    img: "/apple.webp",
    alt: "",
    eyebrow: "APPLE",
    h2: "This is a title",
  },

  {
    img: "/roll.webp",
    alt: "",
    eyebrow: "INITIATIVE ROLL",
    h2: "This is a title",
  },
];

const THIRD_ROW: Data[] = [
  {
    img: "/repleat.webp",
    alt: "",
    eyebrow: "REPLEAT",
    h2: "This is a title",
  },
  {
    img: "/walmart.webp",
    alt: "",
    eyebrow: "WALMART",
    h2: "This is a title",
  },
];

const DATA: Data[][] = [FIRST_ROW, SECOND_ROW, THIRD_ROW];

export const ProjectsGrid: React.FC<ProjectGridProps> = () => {
  const [isHovered, setIsHovered] = useState<number[] | null>(null);
  const isMediumBreakpoint = useMediaQuery("(max-width: 800px)");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

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
            {ROW.map(({ img, eyebrow, h2, alt }, idx) => (
              <ProjectTile
                key={eyebrow}
                img={img}
                eyebrow={eyebrow}
                h2={h2}
                alt={alt}
                onHoverStart={() => setIsHovered([id, idx])}
                onHoverEnd={() => setIsHovered(null)}
                onClick={() => setSelectedProject(eyebrow)}
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
