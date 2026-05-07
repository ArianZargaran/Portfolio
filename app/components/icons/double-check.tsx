import React from "react";

import { IconProps } from ".";

export const DoubleCheck: React.FC<IconProps> = ({
  height,
  width,
  ...rest
}) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...rest}
  >
    <polyline points="2 12 7 17 13 9" />
    <polyline points="10 17 15 22 22 8" />
  </svg>
);
