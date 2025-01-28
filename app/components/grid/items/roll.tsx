import classNames from "classnames";
import { motion } from "framer-motion";
import React, { useState } from "react";

import "./roll.css";

export interface RollProps {
  className?: string;
}

export const Roll = React.forwardRef<HTMLDivElement, RollProps>(function Ro(
  { className },
  ref,
) {
  const [isHovered, setIsHover] = useState<boolean>(false);

  return (
    <div
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
      style={{
        position: "relative",
        height: "100%",
      }}
      ref={ref}
    >
      <motion.div
        className={classNames("roll", className)}
        style={{
          backgroundImage: `url("/roll.webp")`,
          position: "absolute",
          inset: 0,
          zIndex: 0,
          filter: "blur(2px)",
        }}
        animate={{
          scale: isHovered ? 1.15 : 1.1,
        }}
        transition={{ duration: 0.4 }}
      />
      <div className="roll-content" style={{ width: "50%" }}>
        <span className="roll-content_eyebrow">Gaming</span>
        <h3 className="roll-content_title">Roll Initiative</h3>
      </div>
    </div>
  );
});
