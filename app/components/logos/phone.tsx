import classNames from "classnames";
import React from "react";

import { IconProps } from "../icons";

import styles from "./phone.module.css";

export const Phone: React.FC<IconProps> = ({
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
    data-name="phone number"
    viewBox="0 0 24 24"
    {...rest}
  >
    <path
      fill="none"
      stroke={color}
      strokeMiterlimit={10}
      strokeWidth={1.5}
      d="m18.46 16.913-2.4-1.61a.7.7 0 0 0-.705-.064l-.922.468a.662.662 0 0 1-.72-.09 9.327 9.327 0 0 1-3.25-5.628.662.662 0 0 1 .283-.668l.84-.61a.7.7 0 0 0 .312-.636l-.194-2.885-.044-.739a.708.708 0 0 0-.094-.301.692.692 0 0 0-.388-.315 3 3 0 0 0-2.712.42l-.189.144-.097.075a1.556 1.556 0 0 0-.131.105l-.12.116c-1.588 1.552-1.29 5.453.756 9.327l.623 1.078c2.329 3.704 5.558 5.913 7.706 5.347l.16-.047a1.556 1.556 0 0 0 .156-.06l.114-.046.218-.092a3 3 0 0 0 1.72-2.139.692.692 0 0 0-.08-.494.708.708 0 0 0-.214-.231Z"
    />
  </svg>
);
