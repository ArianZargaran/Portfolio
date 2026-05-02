import { motion } from "motion/react";
import React from "react";

import { Project } from "./project-grid";

import "./project-tile.css";

interface ProjectTypeProps {
  img: string;
  alt: string;
  eyebrow: Project;
  h2: string;
  isHovered?: boolean;
  onHoverStart?: () => void;
  onHoverEnd?: () => void;
  onClick?: () => void;
}

export const ProjectTile: React.FC<ProjectTypeProps> = ({
  onHoverStart = () => undefined,
  onHoverEnd = () => undefined,
  onClick = () => undefined,
  isHovered = false,
  img,
  eyebrow,
  h2,
  alt,
}) => (
  <motion.li
    onHoverStart={onHoverStart}
    onHoverEnd={onHoverEnd}
    className="tile"
  >
    <motion.button
      type="button"
      onClick={onClick}
      className="tile-button"
      aria-label={`Open ${eyebrow} project details`}
      whileHover={{
        scale: 1.03,
      }}
    >
      <div className="tile-img-wrapper">
        <motion.img
          animate={{
            filter: isHovered ? "grayscale(0)" : "grayscale(1)",
          }}
          transition={{
            duration: 0.3,
            ease: "easeInOut",
          }}
          src={img}
          className="tile-img"
          alt={alt}
        />
      </div>
      <div className="tile-content">
        <p className="tile-content-eyebrow">{eyebrow}</p>
        <h2 className="tile-content-headline">{h2}</h2>
      </div>
    </motion.button>
  </motion.li>
);
