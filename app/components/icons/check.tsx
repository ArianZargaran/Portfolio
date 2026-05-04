import React from "react";

import { IconProps } from ".";

export const Check: React.FC<IconProps> = ({ height, width, ...rest }) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...rest}
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
