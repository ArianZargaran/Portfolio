import classNames from "classnames";
import { motion } from "motion/react";
import { useEffect, useState } from "react";

import "./blurry-circles.css";

interface Position {
  x: number;
  y: number;
}

const CIRCLE_COUNT = 5;

const randomPosition = (): Position => ({
  x: Math.random() * window.innerWidth,
  y: Math.random() * window.innerHeight,
});

const generateCircles = (): Position[] =>
  Array.from({ length: CIRCLE_COUNT }, randomPosition);

export const BlurryBackground = ({ className }: { className?: string }) => {
  // Random positions can only be computed after hydration — picking them
  // during SSR or the initial client render would mismatch (window is
  // undefined on the server, so x/y collapses to 0 and React hydration
  // complains). Render an empty container first, then populate on mount.
  const [circles, setCircles] = useState<Position[] | null>(null);

  useEffect(() => {
    setCircles(generateCircles());
    const interval = setInterval(() => {
      setCircles(generateCircles());
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  if (!circles) {
    return <div className={classNames(className, "background-container")} />;
  }

  return (
    <div className={classNames(className, "background-container")}>
      {circles.map((pos, index) => (
        <motion.div
          key={index}
          initial={{
            opacity: 0,
            ...pos,
          }}
          animate={{
            opacity: 1,
            ...randomPosition(),
          }}
          transition={{
            opacity: {
              duration: 6,
              ease: "easeInOut",
            },
            duration: 10,
            ease: "easeInOut",
            repeat: Infinity,
            repeatType: "mirror",
          }}
          className="blurry-circle"
          style={{
            background:
              index % 2 === 0
                ? `radial-gradient(circle, rgba(35, 120, 209, 0.5), rgba(158, 54, 58, 0.5))`
                : `radial-gradient(circle, rgba(158, 54, 58, 0.5), rgba(35, 120, 209, 0.5))`,
          }}
        />
      ))}
    </div>
  );
};
