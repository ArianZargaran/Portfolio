import { useLocation } from "@remix-run/react";
import { HamburgerIcon as MainMenuToggle } from "animatea";
import classnames from "classnames";
import { AnimatePresence, motion, Variants } from "motion/react";
import React, { useEffect, useState } from "react";

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
  const [isWide, setIsWide] = useState<boolean>(false);

  const location = useLocation();
  const data = location.state;

  useEffect(() => {
    if (data?.isMenuNavigation) {
      setIsOpen(false);
    }
  }, [data]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 992px)");
    const update = () => setIsWide(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const containerVariants: Variants = {
    hidden: {
      transition: {
        staggerChildren: 0.08,
        staggerDirection: isWide ? 1 : -1,
      },
    },
    visible: {
      transition: {
        staggerChildren: 0.08,
        staggerDirection: isWide ? -1 : 1,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: {
      opacity: 0,
      x: isWide ? 100 : 0,
      y: isWide ? 0 : -100,
      transition: {
        type: "tween",
        ease: "easeIn",
        duration: 0.3,
      },
    },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: {
        type: "tween",
        ease: "easeOut",
        duration: 0.35,
      },
    },
  };

  return (
    <>
      <MainMenuToggle
        className={classnames(
          {
            index: !isOpen && location.pathname === "/",
            about: !isOpen && location.pathname === "/about-me",
            projects: !isOpen && location.pathname === "/projects",
            skills: !isOpen && location.pathname === "/skills",
            blog: !isOpen && location.pathname === "/blog",
            contact:
              (!isOpen && location.pathname === "/contact") || isOpen,
            [styles["mobile-open-reset"]]: isOpen,
          },
          styles[`main-menu_toggle`],
        )}
        isOpen={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        height={48}
        width={48}
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
