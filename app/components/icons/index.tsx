import { SVGProps } from "react";

export type IconProps = {
  height?: SVGSize;
  width?: SVGSize;
} & SVGProps<SVGSVGElement>;

export type SVGSize = 16 | 24 | 32 | 48 | 64 | 72 | 96 | "auto";
