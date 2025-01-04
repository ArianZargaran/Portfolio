import { motion } from "framer-motion";
import React, { useState } from "react";

import { AnimatedLink } from "~/components/animated-link/animated-link";
import { useMediaQuery } from "~/hooks/useMediaQuery";

import styles from "./main-menu-nav-item.module.css";

export interface Option {
  id: string;
  option: string;
  caption: string;
  href: string;
  theme?: string;
}

export const MainMenuNavItem: React.FC<Option> = ({
  option,
  caption,
  href,
}) => {
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const isMediumBreakpoint = useMediaQuery("(max-width: 992px)");

  return (
    <AnimatedLink
      to={href}
      state={{
        isMenuNavigation: true,
      }}
      className={styles["nav-item_wrapper"]}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <h2 className={styles["nav-item_heading"]}>{option}</h2>
      <motion.hr
        className={styles["nav-item_hr"]}
        animate={{
          x: isHovered || isMediumBreakpoint ? "-24rem" : "-120%",
          opacity: isHovered || isMediumBreakpoint ? 1 : 0,
          transition: { type: "linear", duration: 0.2 },
        }}
      />
      <h3 className={styles["nav-item_caption"]}>{caption}</h3>
    </AnimatedLink>
  );
};
