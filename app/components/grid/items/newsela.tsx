import classNames from "classnames";
import { motion } from "framer-motion";
import React from "react";

import "./newsela.css";

import { hoverConfig } from "../project-grid";

export interface NewselaProps {
  className?: string;
}

export const Newsela = React.forwardRef<HTMLDivElement, NewselaProps>(
  function News({ className }, ref) {
    return (
      <motion.div
        {...hoverConfig}
        className={classNames("newsela", className)}
        style={{
          backgroundPosition: "50% 60%",
          backgroundImage: `url("/newsela.webp")`,
        }}
        ref={ref}
      />
    );
  },
);
