import classNames from "classnames";
import { motion } from "framer-motion";
import React from "react";

import "./animatea.css";

export interface AnimateaProps {
  className?: string;
}

export const Animatea = React.forwardRef<HTMLDivElement, AnimateaProps>(
  function Anim({ className }, ref) {
    return (
      <motion.div
        variants={wrapperVariants}
        className={classNames("animatea", className)}
        style={{
          backgroundImage: `url("/animatea.webp")`,
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
            Animatea
          </motion.p>
          <motion.h3
            className="title"
            variants={titleVariants}
            transition={{ delay: 0.1 }}
          >
            Animatea
          </motion.h3>
        </motion.div>
      </motion.div>
    );
  },
);

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
