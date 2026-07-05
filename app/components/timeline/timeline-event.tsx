import classNames from "classnames";
import React from "react";

import { renderInlineMarkdown } from "~/utils/inline-markdown";

import styles from "./timeline-event.module.css";

interface TimelineEventProps {
  headline: string;
  description: string;
  date: string;
  orientation?: "right" | "left";
  image?: {
    src: string;
    alt: string;
  };
  onOpen?: () => void;
}

export const TimelineEvent: React.FC<TimelineEventProps> = ({
  headline,
  description,
  date,
  orientation = "right",
  image,
  onOpen,
}) => {
  const content = (
    <div className={styles.content}>
      {image ? (
        <img
          className={styles.image}
          src={image.src}
          alt={image.alt}
          loading="lazy"
        />
      ) : null}
      <h3 className={styles.headline}>{headline}</h3>
      <p>{renderInlineMarkdown(description)}</p>
    </div>
  );

  return (
    <div
      data-testid="timeline-event"
      className={classNames(styles["timeline-event"], styles[orientation])}
    >
      <p className={styles.date}>{date}</p>
      <div data-testid="timeline-line" className={styles.line}>
        <div data-testid="timeline-bullet" className={styles.bullet} />
      </div>
      <div className={styles.box}>
        {onOpen ? (
          <button
            type="button"
            className={styles["box-button"]}
            onClick={onOpen}
            aria-haspopup="dialog"
            aria-label={`Read more about ${headline}`}
          >
            {content}
          </button>
        ) : (
          content
        )}
      </div>
    </div>
  );
};
