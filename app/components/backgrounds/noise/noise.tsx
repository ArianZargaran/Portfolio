import React from "react";

import styles from "./noise.module.css";

type NoiseProps = React.HTMLAttributes<HTMLDivElement>;

export const Noise: React.FC<NoiseProps> = ({ className, ...props }) => {
  return (
    <div
      aria-hidden="true"
      {...props}
      className={`${className ?? ""} ${styles.noise}`}
    />
  );
};
