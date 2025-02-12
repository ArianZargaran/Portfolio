import classNames from "classnames";
import { motion } from "framer-motion";
import React from "react";

import { AnimateaIcon } from "~/components/icons/animatea-icon";

import "./animatea.css";

export interface AnimateaProps {
  className?: string;
}

export const Animatea = React.forwardRef<HTMLDivElement, AnimateaProps>(
  function Anim({ className }, ref) {
    return (
      <motion.div
        className={classNames("pure", "animatea", className)}
        ref={ref}
      >
        <p className="animatea-eyebrow">Eyebrow</p>
        <AnimateaIcon width={72} />
        <h3 className="animatea-title">Animatea</h3>
        <span className="animatea-description">Eyebrow SEske</span>
      </motion.div>
    );
  },
);
