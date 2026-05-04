import React from "react";

import styles from "./doodles.module.css";

type DoodlesProps = React.HTMLAttributes<HTMLDivElement>;

export const Doodles: React.FC<DoodlesProps> = ({ className, ...props }) => {
  return (
    <div
      aria-hidden="true"
      {...props}
      className={`${className ?? ""} ${styles.svg}`}
    />
  );
};
