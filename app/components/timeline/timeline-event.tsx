import classNames from "classnames";
import React from "react";

import styles from "./timeline-event.module.css";

interface TimelineEventProps {
  headline: string;
  description: string;
  date: string;
  orientation?: "right" | "left";
}

export const TimelineEvent: React.FC<TimelineEventProps> = ({
  headline,
  description,
  date,
  orientation = "right",
}) => {
  return (
    <div className={classNames(styles["timeline-event"], styles[orientation])}>
      <p className={styles.date}>{date}</p>
      <div className={styles.line}>
        <div className={styles.bullet} />
      </div>
      <div className={styles.box}>
        <div className={styles.content}>
          <h3 className={styles.headline}>{headline}</h3>
          <p>{description}</p>
        </div>
      </div>
    </div>
  );
};
