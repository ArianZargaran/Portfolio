import classNames from "classnames";
import React from "react";

import { IconProps } from "../icons";

import styles from "./email.module.css";

export const Email: React.FC<IconProps> = ({
  height,
  width,
  color,
  className,
  ...rest
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="52 42 88 66"
      height={height}
      width={width}
      className={classNames(styles.svg, className)}
      {...rest}
    >
      <path fill={`${color}90`} d="M58 108h14V74L52 59v43c0 3.32 2.69 6 6 6" />
      <path fill={`${color}60`} d="M120 108h14c3.32 0 6-2.69 6-6V59l-20 15" />
      <path
        fill={`${color}80`}
        d="M120 48v26l20-15v-8c0-7.42-8.47-11.65-14.4-7.2"
      />
      <path fill={color} d="M72 74V48l24 18 24-18v26L96 92" />
      <path
        fill={`${color}70`}
        d="M52 51v8l20 15V48l-5.6-4.2C60.46 39.35 52 43.58 52 51"
      />
    </svg>
  );
};
