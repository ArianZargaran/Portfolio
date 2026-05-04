import classNames from "classnames";
import { motion, MotionProps } from "motion/react";
import React, {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  DetailedHTMLProps,
} from "react";

import styles from "./button.module.css";

type ButtonProps = DetailedHTMLProps<
  ButtonHTMLAttributes<HTMLButtonElement>,
  HTMLButtonElement
> & {
  variant?: "primary" | "secondary";
  href?: string;
  target?: AnchorHTMLAttributes<HTMLAnchorElement>["target"];
  rel?: string;
  download?: AnchorHTMLAttributes<HTMLAnchorElement>["download"];
} & MotionProps;

const cx = classNames.bind(styles);

const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  className,
  href,
  target,
  rel,
  download,
  ...rest
}) => {
  const motionProps = {
    className: cx(
      styles.button,
      styles[variant],
      styles["radial-gradient"],
      className,
    ),
    initial: {
      "--x": "100%",
      scale: 1,
    },
    whileHover: {
      "--x": "-100%",
    },
    transition: {
      type: "spring" as const,
      stiffness: 20,
      damping: 15,
      mass: 0.1,
      duration: 0.2,
    },
    whileTap: {
      scale: 0.96,
      transition: {
        duration: 0.05,
        ease: "easeIn" as const,
      },
    },
  };

  const inner = (
    <>
      <span className={styles["linear-mask"]}>{children}</span>
      <span className={styles["linear-overlay"]} />
    </>
  );

  if (href) {
    return (
      <motion.a
        href={href}
        target={target}
        rel={rel}
        download={download}
        {...(rest as MotionProps)}
        {...motionProps}
      >
        {inner}
      </motion.a>
    );
  }

  return (
    <motion.button {...rest} {...motionProps}>
      {inner}
    </motion.button>
  );
};

export default Button;
