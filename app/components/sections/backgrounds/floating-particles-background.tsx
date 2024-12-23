import cls from "classnames";
import { motion } from "framer-motion";
import React, { DetailedHTMLProps, HTMLAttributes, useMemo } from "react";

import styles from "./floating-particles-background.module.css";

type FloatingParticlesBackgroundProps = DetailedHTMLProps<
  HTMLAttributes<HTMLDivElement>,
  HTMLDivElement
> & {
  count: number;
  /**
   * overwrite the following default particle styling properties:
   *
   * - color
   * - background-color
   * - sizing
   * - border-radius
   */
  particleClassName?: string;
  /**
   * Speed
   */
  speed?: number;
};

const FloatingParticlesBackground: React.FC<
  FloatingParticlesBackgroundProps
> = ({ className, count, speed = 2, particleClassName, ...rest }) => {
  const particles: string[] = useMemo(() => {
    const set = new Set<string>();

    while (set.size < count) {
      const uuid = window.crypto.randomUUID();
      !set.has(uuid) && set.add(window.crypto.randomUUID());
    }

    return Array.from(set);
  }, [count]);

  return (
    <div
      className={cls(styles.floatingParticlesBackground, className)}
      {...rest}
    >
      {particles.map((el) => {
        return (
          <motion.div
            key={el}
            className={cls(styles.particle, particleClassName)}
            initial={{ opacity: Math.random() > 0.5 ? 1 : 0 }}
            animate={{ opacity: Math.random() < 0.5 ? 1 : 0 }}
            transition={{
              duration: Math.random() * speed + 1,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        );
      })}
    </div>
  );
};

export default FloatingParticlesBackground;
