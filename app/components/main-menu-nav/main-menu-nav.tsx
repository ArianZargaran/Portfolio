import { useLocation } from "@remix-run/react";
import { HamburgerIcon as MainMenuToggle } from "animatea";
import classnames from "classnames";
import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect, useState } from "react";

import { useMediaQuery } from "~/hooks/useMediaQuery";

import { MainMenuNavItem, Option } from "./main-menu-nav-item";
import styles from "./main-menu-nav.module.css";

export interface MainMenuProps {
  options: Option[];
}

const MainMenuNav: React.FC<MainMenuProps> = ({ options }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [hoveredItemId, setHoveredItemId] = useState<string | undefined>(
    undefined,
  );
  const isMediumBreakpoint = useMediaQuery("(max-width: 992px)");

  const location = useLocation();
  const data = location.state;

  useEffect(() => {
    if (data?.isMenuNavigation) {
      setIsOpen(false);
    }
  }, [data]);

  const containerVariants = {
    hidden: {
      opacity: 0,
      y: -100,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "tween",
        ease: "easeOut",
        staggerChildren: 0.2,
        duration: 0.4,
        staggerDirection: -1,
      },
    },
  };

  const itemVariants = {
    hidden: {
      opacity: 0,
      y: -100,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "tween",
        ease: "easeOut",
        staggerChildren: 0.2,
        duration: 0.4,
        staggerDirection: -1,
      },
    },
  };

  return (
    <>
      <MainMenuToggle
        className={classnames(
          {
            pure:
              (!isOpen && location.pathname === "/") ||
              (!isOpen && location.pathname === "/projects"),
            french: !isOpen && location.pathname === "/about-me",
            // royal: !isOpen && location.pathname === "/projects",
            oxford: !isOpen && location.pathname === "/skills",
            mirage: !isOpen && location.pathname === "/blog",
            stratos:
              (!isOpen && location.pathname === "/contact") ||
              (!isMediumBreakpoint && isOpen),
          },
          styles[`main-menu_toggle`],
        )}
        isOpen={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        height={32}
        width={32}
      />
      <AnimatePresence mode="wait" initial={false}>
        {isOpen ? (
          <motion.nav
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={containerVariants}
            className={styles["main-menu_nav"]}
          >
            <ul className={styles["main-menu_ul"]}>
              {options.map(({ id, option, caption, href, theme }) => (
                <motion.li
                  onHoverStart={() => setHoveredItemId(id)}
                  onHoverEnd={() => setHoveredItemId(undefined)}
                  style={{ "--options-length": options.length }}
                  variants={itemVariants}
                  className={classnames(styles["main-menu_nav-item"], theme)}
                  key={id}
                >
                  <MainMenuNavItem
                    id={id}
                    option={option}
                    caption={caption}
                    href={href}
                    isHovered={hoveredItemId === id}
                  />
                </motion.li>
              ))}
            </ul>
          </motion.nav>
        ) : null}
      </AnimatePresence>
    </>
  );
};

export default MainMenuNav;
