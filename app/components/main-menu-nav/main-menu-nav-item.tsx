import { Link } from "@remix-run/react";
import classnames from "classnames";
import React from "react";

import styles from "./main-menu-nav-item.module.css";

export interface Option {
  id: string;
  option: string;
  caption: string;
  href: string;
  theme?: string;
  isHovered?: boolean;
}

export const MainMenuNavItem: React.FC<Option> = ({
  option,
  caption,
  href,
  isHovered,
}) => {
  return (
    <Link
      to={href}
      state={{
        isMenuNavigation: true,
      }}
      className={styles["nav-item_wrapper"]}
    >
      <h2 className={styles["nav-item_heading"]}>{option}</h2>
      <hr
        data-testid="nav-item-hr"
        className={classnames(styles["nav-item_hr"], {
          [styles["is-shown"]]: isHovered,
        })}
      />
      <h3 className={styles["nav-item_caption"]}>{caption}</h3>
    </Link>
  );
};
