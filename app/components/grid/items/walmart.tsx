import classNames from "classnames";
import { motion } from "framer-motion";
import { forwardRef } from "react";

import "./walmart.css";

export interface WalmartProps {
  className?: string;
}

const clickConfig = {
  initial: { scale: 1 },
  whileHover: { scale: 1.05 },
  transition: { duration: 0.4 },
};

export const Walmart = forwardRef<HTMLDivElement, WalmartProps>(function Wal(
  { className },
  ref,
) {
  return (
    <motion.div
      {...clickConfig}
      className={classNames("walmart", className)}
      style={{
        backgroundPosition: "50% 70%",
        backgroundImage: `url("/walmart.webp")`,
      }}
      ref={ref}
    />
  );
});
