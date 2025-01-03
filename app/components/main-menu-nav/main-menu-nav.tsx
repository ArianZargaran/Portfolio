import { HamburgerIcon as MainMenuToggle } from "animatea";
import classnames from "classnames";
import { AnimatePresence, motion } from "framer-motion";
import React, { useState } from "react";

import { useMediaQuery } from "~/hooks/useMediaQuery";

import { MainMenuNavItem, Option } from "./main-menu-nav-item";
import styles from "./main-menu-nav.module.css";

export interface MainMenuProps {
  options: Option[];
}

const MainMenuNav: React.FC<MainMenuProps> = ({ options }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const isMediumBreakpoint = useMediaQuery("(max-width: 992px)");

  return (
    <>
      <MainMenuToggle
        className={styles["main-menu_toggle"]}
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
              {options.map(({ id, option, caption, href }, idx) => (
                <motion.li
                  initial={
                    isMediumBreakpoint
                      ? { y: 0, x: idx % 2 === 0 ? "100%" : "-100%" }
                      : {
                          y: "-100%",
                          x: 0,
                        }
                  }
                  animate={{ y: 0, x: 0 }}
                  exit={
                    isMediumBreakpoint
                      ? {
                          x: idx % 2 === 0 ? "-100%" : "100%",
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
                  className={classnames(styles["main-menu_nav-item"], {
                    french: idx === 0,
                    oxford: idx === 1,
                    mirage: idx === 2,
                    stratos: idx === 3,
                    royal: idx === 4,
                  })}
                  key={id}
                >
                  <MainMenuNavItem
                    id={id}
                    option={option}
                    caption={caption}
                    href={href}
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
