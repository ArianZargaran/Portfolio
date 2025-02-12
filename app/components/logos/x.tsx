import classNames from "classnames";
import React from "react";

import { IconProps } from "../icons";

import styles from "./x.module.css";

export const X: React.FC<IconProps> = ({
  height,
  width,
  color,
  className,
  ...rest
}) => (
  <svg
    className={classNames(styles.svg, className)}
    xmlns="http://www.w3.org/2000/svg"
    width={width}
    height={height}
    viewBox="0 0 300 300.251"
    {...rest}
  >
    <path
      fill={color}
      d="M178.57 127.15 290.27 0h-26.46l-97.03 110.38L89.34 0H0l117.13 166.93L0 300.25h26.46l102.4-116.59 81.8 116.59H300M36.01 19.54h40.65l187.13 262.13h-40.66"
    />
  </svg>
);
