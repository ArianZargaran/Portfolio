import classNames from "classnames";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

import "./blurry-circles.css";

export const BlurryBackground = ({ className }: { className?: string }) => {
  const [circles, setCircles] = useState(generateCircles());

  useEffect(() => {
    const interval = setInterval(() => {
      setCircles(generateCircles());
    }, 6000);

    return () => clearInterval(interval);
  }, []);

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
            ...generateRandomPosition(),
          }}
          transition={{
            opacity: {
              delay: 1,
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

const generateRandomPosition = () => {
  if (typeof window !== "undefined") {
    return {
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
    };
  } else {
    return { y: 0, x: 0 };
  }
};

const generateCircles = (): { x: number; y: number }[] =>
  Array.from({ length: 5 }, () => generateRandomPosition());
