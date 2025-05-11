import classNames from "classnames";
import { motion, MotionProps } from "motion/react";
import React, { ButtonHTMLAttributes, DetailedHTMLProps } from "react";

import styles from "./button.module.css";

type ButtonProps = DetailedHTMLProps<
  ButtonHTMLAttributes<HTMLButtonElement>,
  HTMLButtonElement
> & {
  variant?: "primary" | "secondary";
} & MotionProps;

const cx = classNames.bind(styles);

const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  className,
  ...rest
}) => {
  return (
    <motion.button
      className={cx(
        styles.button,
        styles[variant],
        styles["radial-gradient"],
        className,
      )}
      {...rest}
      initial={{
        "--x": "100%",
        scale: 1,
      }}
      whileHover={{
        "--x": "-100%",
      }}
      transition={{
        type: "spring",
        stiffness: 20,
        damping: 15,
        mass: 0.1,
        duration: 0.2,
      }}
      whileTap={{
        scale: 0.96,
        transition: {
          duration: 0.05,
          ease: "easeIn",
        },
      }}
    >
      <span className={styles["linear-mask"]}>{children}</span>
      <span className={styles["linear-overlay"]} />
    </motion.button>
  );
};

export default Button;
