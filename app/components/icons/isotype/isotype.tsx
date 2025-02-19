import styles from "./isotype.module.css";

import { IconProps } from ".";

export const Isotype: React.FC<IconProps> = (props) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      xmlSpace="preserve"
      width={615.972}
      height={636.295}
      style={{
        shapeRendering: "geometricPrecision",
        textRendering: "geometricPrecision",
        fillRule: "evenodd",
        clipRule: "evenodd",
      }}
      viewBox="0 0 1144.28 1182.03"
      {...props}
    >
      <path
        className={styles.path}
        d="M459.56 222.96zm0 256.52 102.32-50.77 146.4 294.37L459.56 846.7V479.48zM29.46 179.89l.01-.03L379.28 6.29C386.89 2.27 385.04 0 404.76 0c19.71 0 54.71 24.51 54.71 54.71l-.01.4.11.05v167.8l152.64-75.73c7.69-4.12 10.46-6.46 25.81-6.46 15.36 0 39.87 12.26 48.88 30.11l.43.87 456.97 918.82H927.43c-.87.05 8.6.07-2.6.07s-40.15-12.44-49.08-30.53l-66.3-131.97-498.72 247.22c-.74.4-1.5.8-2.27 1.17-7.23 3.52-15.36 5.5-23.97 5.51-30.36.09-54.7-24.49-54.7-54.7V336.99L.01 451l.07-222.75a54.709 54.709 0 0 1 29.39-48.35z"
      />
    </svg>
  );
};
