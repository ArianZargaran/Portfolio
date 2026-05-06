import classnames from "classnames";
import { motion } from "motion/react";
import React from "react";

import "./project-tile.css";

interface ProjectTypeProps {
  img: string;
  alt: string;
  label: string;
  h2: string;
  isHovered?: boolean;
  onHoverStart?: () => void;
  onHoverEnd?: () => void;
  onClick?: () => void;
}

export const ProjectTile: React.FC<ProjectTypeProps> = ({
  onHoverStart,
  onHoverEnd,
  onClick,
  isHovered = false,
  img,
  label,
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
      aria-label={`Open ${label} project details`}
      whileHover={{
        scale: 1.03,
      }}
    >
      <div className="tile-img-wrapper">
        <img
          src={img}
          className={classnames("tile-img", { "is-color": isHovered })}
          alt={alt}
        />
      </div>
      <div className="tile-content">
        <p className="tile-content-eyebrow">{label}</p>
        <h2 className="tile-content-headline">{h2}</h2>
      </div>
    </motion.button>
  </motion.li>
);
