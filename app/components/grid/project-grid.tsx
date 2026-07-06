import classNames from "classnames";
import React, { useEffect, useState } from "react";

import "./project-grid.css";
import type { GalleryImage } from "./project-tile";
import { ProjectTile } from "./project-tile";

/* Topic-based, not company-based: the same company can feed images into more
   than one topic (Cabify shows up under both Product Front-End Engineering
   and Design Systems, since that's actually the range of work done there). */
type ProjectId =
  | "design-systems"
  | "product-frontend-engineering"
  | "non-technical-qa"
  | "own-designs"
  | "back-end-infra"
  | "mobile-apps"
  | "ai-implementations";

interface ProjectGridProps {
  className?: string;
}

interface Data {
  id: ProjectId;
  label: string;
  images: GalleryImage[];
  h2: string;
}

const FIRST_ROW: Data[] = [
  {
    id: "design-systems",
    label: "DESIGN SYSTEMS",
    images: [
      {
        src: "/airtable.webp",
        alt: "Airtable Brandkit Design System preview",
      },
      { src: "/cabify.webp", alt: "Cabify design system preview" },
      // Freshworks image pending — third design system contributed to.
    ],
    h2: "Three design systems, built alongside brand and marketing",
  },
  {
    id: "product-frontend-engineering",
    label: "PRODUCT FRONT-END ENGINEERING",
    images: [
      { src: "/walmart.webp", alt: "Walmart Cart & Checkout preview" },
      { src: "/cabify.webp", alt: "Cabify Logistics preview" },
    ],
    h2: "Cart, checkout, and logistics — shipped at web scale",
  },
];

const SECOND_ROW: Data[] = [
  {
    id: "non-technical-qa",
    label: "NON-TECHNICAL (LINGUISTIC) QA",
    images: [{ src: "/apple.webp", alt: "Apple QA & localization preview" }],
    h2: "QA & localization for Apple's Spanish market",
  },
  {
    id: "own-designs",
    label: "OWN DESIGNS",
    images: [
      { src: "/roll.webp", alt: "Initiative Roll preview" },
      { src: "/repleat.webp", alt: "Repleat preview" },
    ],
    h2: "Personal tools, designed and built end-to-end",
  },
];

/* Placeholder tiles for topics without images yet — kept in the grid (rather
   than omitted) so the bento layout and row count stay stable while these
   are pending, instead of reshuffling every time a new image lands. */
const THIRD_ROW: Data[] = [
  {
    id: "back-end-infra",
    label: "BACK-END AND INFRA",
    images: [],
    h2: "Coming soon",
  },
  {
    id: "mobile-apps",
    label: "MOBILE APPS",
    images: [],
    h2: "Coming soon",
  },
  {
    id: "ai-implementations",
    label: "AI IMPLEMENTATIONS, AUTOMATIONS",
    images: [],
    h2: "Coming soon",
  },
];

const DATA: Data[][] = [FIRST_ROW, THIRD_ROW, SECOND_ROW];

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
            {ROW.map(({ images, label, h2, id: projectId }, idx) => (
              <ProjectTile
                key={projectId}
                id={projectId}
                images={images}
                label={label}
                h2={h2}
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
