import classnames from "classnames";
import { motion } from "motion/react";
import React, { useEffect, useRef, useState } from "react";

import "./project-tile.css";

export interface GalleryImage {
  src: string;
  alt: string;
}

interface ProjectTypeProps {
  id?: string;
  images: GalleryImage[];
  label: string;
  h2: string;
  isHovered?: boolean;
  isActive?: boolean;
  onHoverStart?: () => void;
  onHoverEnd?: () => void;
  onClick?: () => void;
}

/** Crossfade interval range, ms — each tile picks its own pace within this
    range (see below) so gallery tiles don't all flip in lockstep. */
const CROSSFADE_BASE = 3500;
const CROSSFADE_JITTER = 3000;

export const ProjectTile: React.FC<ProjectTypeProps> = ({
  id,
  onHoverStart,
  onHoverEnd,
  onClick,
  isHovered = false,
  isActive = false,
  images,
  label,
  h2,
}) => {
  const [activeImage, setActiveImage] = useState(0);
  // Picked once per mount, not per render: a stable per-tile pace so each
  // gallery drifts out of phase with the others instead of all ticking
  // together on the same shared interval.
  const intervalMs = useRef(
    CROSSFADE_BASE + Math.random() * CROSSFADE_JITTER,
  ).current;

  useEffect(() => {
    if (images.length <= 1) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = window.setInterval(() => {
      setActiveImage((prev) => (prev + 1) % images.length);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [images.length, intervalMs]);

  return (
    <motion.li
      onHoverStart={onHoverStart}
      onHoverEnd={onHoverEnd}
      className={classnames("tile", { "is-active": isActive })}
      data-project-id={id}
      data-testid="project-tile"
    >
      <motion.button
        type="button"
        onClick={onClick}
        className="tile-button"
        aria-label={
          isActive
            ? `${label} project tile, expanded`
            : `Expand ${label} project tile`
        }
        whileHover={{
          scale: 1.03,
        }}
      >
        <div
          className={classnames("tile-img-wrapper", {
            "is-pending": images.length === 0,
          })}
        >
          {images.map((image, idx) => (
            <img
              key={image.src}
              src={image.src}
              alt={image.alt}
              aria-hidden={idx !== activeImage}
              className={classnames("tile-img", {
                "is-color": isHovered,
                "is-visible": idx === activeImage,
              })}
            />
          ))}
        </div>
        <div className="tile-content">
          <p className="tile-content-eyebrow">{label}</p>
          <h2 className="tile-content-headline">{h2}</h2>
        </div>
      </motion.button>
    </motion.li>
  );
};
