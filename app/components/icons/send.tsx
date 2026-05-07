import React from "react";

import { IconProps } from ".";

export const Send: React.FC<IconProps> = ({ height, width, ...rest }) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 24 24"
    fill="currentColor"
    {...rest}
  >
    <path d="M2.4 3.05a1 1 0 0 1 1.06-.13l17.5 8.5a1 1 0 0 1 0 1.8l-17.5 8.5a1 1 0 0 1-1.43-1.13L4.7 12 2.03 4.18a1 1 0 0 1 .37-1.13Zm3.86 9.95-1.83 5.36L18.34 12 4.43 5.64 6.26 11h6.74a1 1 0 1 1 0 2H6.26Z" />
  </svg>
);
