import classNames from "classnames";
import { motion } from "framer-motion";
import React from "react";

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
      variants={wrapperVariants}
      className={classNames("apple", className)}
      style={{
        backgroundPositionX: "62%",
        backgroundImage: `url("/apple.webp")`,
      }}
      initial="rest"
      whileHover="hover"
      animate="rest"
      ref={ref}
    >
      <motion.div
        className="title-wrapper"
        variants={filterVariants}
        transition={{
          duration: 0.4,
          ease: "easeInOut",
        }}
      >
        <motion.p className="eyebrow" variants={titleVariants}>
          Apple INC.
        </motion.p>
        <motion.h3
          className="title"
          variants={titleVariants}
          transition={{ delay: 0.1 }}
        >
          Apple INC.
        </motion.h3>
      </motion.div>
    </motion.div>
  );
});

const filterVariants = {
  rest: {
    backgroundImage: `linear-gradient(to bottom, rgba(18,42, 66, .85), rgba(18,42, 66, .85))`,
  },
  hover: {
    backgroundImage: `linear-gradient(to bottom, rgba(18,42, 66, 0), rgba(18,42, 66, 0))`,
  },
};

const titleVariants = {
  rest: {
    opacity: 1,
    y: 0,
  },
  hover: {
    opacity: 0,
    y: -10,
  },
};

const wrapperVariants = {
  hover: {
    transition: {
      delay: 0.4,
    },
  },
};
