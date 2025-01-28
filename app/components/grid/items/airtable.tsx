import classNames from "classnames";
import { motion } from "framer-motion";
import React from "react";

import "./airtable.css";

export interface AirtableProps {
  className?: string;
}

export const Airtable = React.forwardRef<HTMLDivElement, AirtableProps>(
  function Air({ className }, ref) {
    return (
      <motion.div
        variants={containerVariants}
        className={classNames("airtable", className)}
        initial="rest"
        whileHover="hover"
        animate="rest"
        transition={{
          duration: 0.4,
        }}
        style={{
          backgroundPosition: "50% 70%",
          backgroundImage: `url("/airtable.webp")`,
        }}
        ref={ref}
      >
        <motion.div
          className="overlay"
          variants={overlayVariants}
          transition={{
            duration: 0.2,
          }}
        >
          <p className="overlay-eyebrow">eyebrow</p>
          <h3 className="overlay-title">Foo</h3>
          <p>Foo kjalsdfea lskadjfae</p>
        </motion.div>
      </motion.div>
    );
  },
);

const containerVariants = {
  rest: { scale: 1 },
  hover: { scale: 1.05 },
};

const overlayVariants = {
  rest: { x: 0 },
  hover: { x: "-100%" },
};
