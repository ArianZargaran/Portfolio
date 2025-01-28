import classNames from "classnames";
import { motion } from "framer-motion";
import React from "react";

import "./cabify.css";

export interface CabifyProps {
  className?: string;
}

const clickConfig = {
  initial: { scale: 1 },
  whileHover: { scale: 1.05 },
  transition: { duration: 0.4 },
};

export const Cabify = React.forwardRef<HTMLDivElement, CabifyProps>(
  function Cab({ className }, ref) {
    return (
      <motion.div
        {...clickConfig}
        className={classNames("cabify", className)}
        style={{
          backgroundPosition: "50% 10%",
          backgroundImage: `url("/cabify.webp")`,
        }}
        ref={ref}
      />
    );
  },
);
