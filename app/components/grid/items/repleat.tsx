import classNames from "classnames";
import { motion } from "framer-motion";
import React, { MutableRefObject } from "react";

import "./repleat.css";

import { hoverConfig } from "../project-grid";

export interface RepleatProps {
  className?: string;
  ref: MutableRefObject<HTMLDivElement | null>;
}

export const Repleat = React.forwardRef<HTMLDivElement, RepleatProps>(
  function Rep({ className }, ref) {
    return (
      <motion.div
        {...hoverConfig}
        className={classNames("repleat", className)}
        style={{
          backgroundPosition: "50% 30%",
          backgroundImage: `url("/repleat.webp")`,
        }}
        ref={ref}
      />
    );
  },
);
