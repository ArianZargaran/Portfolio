import classNames from "classnames";
import { motion } from "framer-motion";
import React, { useState } from "react";

import { useMediaQuery } from "~/hooks/useMediaQuery";

import styles from "./project-grid.module.css";
import { ProjectsModal } from "./projects-modal";

export type Projects =
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
  eyebrow: Projects;
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
  const [selectedProject, setSelectedProject] = useState<Projects | null>(null);

  const handleModalClose = () => {
    setSelectedProject(null);
  };

  return (
    <div className={styles["grid"]}>
      <ProjectsModal
        selectedProject={selectedProject ?? undefined}
        onClose={handleModalClose}
      />

      {DATA.map((ROW, id) => {
        return (
          <ul
            key={id}
            className={classNames(styles["row"], styles[`row-${id}`])}
          >
            {ROW.map(({ img, eyebrow, h2, alt }, idx) => (
              <motion.li
                whileHover={{
                  scale: 1.03,
                }}
                onHoverStart={() => setIsHovered([id, idx])}
                onHoverEnd={() => setIsHovered(null)}
                onClick={() => setSelectedProject(eyebrow)}
                key={idx}
                className={styles["tile"]}
              >
                <div className={styles["tile-img-wrapper"]}>
                  <motion.img
                    animate={{
                      filter:
                        (isHovered &&
                          isHovered[0] === id &&
                          isHovered[1] === idx) ||
                        isMediumBreakpoint
                          ? "grayscale(0)"
                          : "grayscale(1)",
                    }}
                    src={img}
                    className={styles["tile-img"]}
                    alt={alt}
                  />
                </div>
                <div className={styles["tile-content"]}>
                  <p className={styles["tile-content-eyebrow"]}>{eyebrow}</p>
                  <h2 className={styles["tile-content-headline"]}>{h2}</h2>
                </div>
              </motion.li>
            ))}
          </ul>
        );
      })}
    </div>
  );
};
