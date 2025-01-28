import classNames from "classnames";
import { motion } from "framer-motion";
import React from "react";

import { hoverConfig } from "../project-grid";

import "./apple.css";

export interface AppleProps {
  className?: string;
}

export const Apple = React.forwardRef<HTMLDivElement, AppleProps>(function App(
  { className },
  ref,
) {
  return (
    <motion.div
      {...hoverConfig}
      className={classNames("apple", className)}
      style={{
        backgroundPositionX: "62%",
        backgroundImage: `url("/apple.webp")`,
      }}
      ref={ref}
    />
  );
});
