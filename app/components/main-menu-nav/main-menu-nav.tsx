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

  return (
    <>
      <MainMenuToggle
        className={classnames(
          {
            pure: !isOpen && location.pathname === "/",
            french: !isOpen && location.pathname === "/about-me",
            royal: !isOpen && location.pathname === "/projects",
            oxford: !isOpen && location.pathname === "/skills",
            mirage: !isOpen && location.pathname === "/blog",
            stratos:
              (!isOpen && location.pathname === "/contact") ||
              (!isMediumBreakpoint && isOpen),
          },
          styles[`main-menu_toggle`],
        )}
        isOpen={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        transition={{ ease: "easeOut", duration: 0.2 }}
        height={32}
        width={32}
      />
      <AnimatePresence>
        {isOpen ? (
          <motion.nav className={styles["main-menu_nav"]}>
            <ul className={styles["main-menu_ul"]}>
              {options.map(({ id, option, caption, href, theme }, idx) => (
                <motion.li
                  onHoverStart={() => setHoveredItemId(id)}
                  onHoverEnd={() => setHoveredItemId(undefined)}
                  initial={
                    isMediumBreakpoint
                      ? { y: 0, x: idx % 2 === 0 ? "100vh" : "-100vh" }
                      : {
                          y: "-100%",
                          x: 0,
                        }
                  }
                  animate={{ y: 0, x: 0 }}
                  exit={
                    isMediumBreakpoint
                      ? {
                          x: idx % 2 === 0 ? "-100vh" : "100vh",
                          y: 0,
                        }
                      : {
                          x: 0,
                          y: "-100%",
                        }
                  }
                  transition={{
                    duration: 0.2,
                    delay: isMediumBreakpoint ? 0 : 0.2 * idx,
                  }}
                  style={{ "--options-length": options.length }}
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
