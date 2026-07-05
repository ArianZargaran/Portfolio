import { cssBundleHref } from "@remix-run/css-bundle";
import { LinksFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";
import { motion } from "motion/react";
import type { CSSProperties, MouseEvent } from "react";
import { useRef, useState } from "react";

import { Isotype } from "~/components/icons/isotype/isotype";
import { IllustrationsTrack } from "~/components/illustrations/illustrations-track/illustrations-track";
import { TimelineEvent } from "~/components/timeline/timeline-event";
import type { TimelineEntry } from "~/constants/timeline-data-set";
import { data } from "~/constants/timeline-data-set";
import { useElementSize } from "~/hooks/useElementSize";
import aboutPage from "~/stylesheets/about.css";
import commonThemePage from "~/stylesheets/common-page-themes.css";
import { renderInlineMarkdown } from "~/utils/inline-markdown";

export const links: LinksFunction = () => [
  ...(cssBundleHref ? [{ rel: "stylesheet", href: cssBundleHref }] : []),
  { rel: "stylesheet", href: commonThemePage },
  { rel: "stylesheet", href: aboutPage },
];

// tuned y-target for the radial-dot backgroundPosition loop — lands on a clean tile boundary so the repeat has no visible seam
const DOT_GRID_ANIMATE_Y = "19.765rem";

const AboutMePage = () => {
  const { ref, dimensions } = useElementSize<HTMLDivElement>();
  const [selectedEvent, setSelectedEvent] = useState<TimelineEntry | null>(
    null,
  );
  const dialogRef = useRef<HTMLDialogElement>(null);

  const openEvent = (entry: TimelineEntry) => {
    setSelectedEvent(entry);
    dialogRef.current?.showModal();
  };

  // Native <dialog> reports clicks on the backdrop as clicks on the dialog
  // element itself; clicks inside land on descendants.
  const handleBackdropClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === dialogRef.current) dialogRef.current?.close();
  };

  return (
    <section className="page about about-page">
      <div ref={ref} className="media-container">
        <Link className="media-container-link" to="/">
          <h1 className="media-container-heading">
            <Isotype width={48} height="auto" />
          </h1>
        </Link>
        <motion.span
          className="media-container-background"
          initial={{
            backgroundPosition: "0 0, -3rem -3rem",
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            repeatDelay: 0,
            ease: "linear",
          }}
          animate={{
            backgroundPosition: `0 0, -3rem ${DOT_GRID_ANIMATE_Y}`,
          }}
        />
        <div className="illustration-window">
          <IllustrationsTrack />
        </div>
        <h2 className="headline">About me</h2>
      </div>
      <div
        className="timeline"
        style={
          {
            "--illustration-height": `${dimensions.height}rem`,
          } as CSSProperties
        }
      >
        {data.map((entry, idx) => {
          const { id, headline, date, description, image, story } = entry;
          const isSentinel = id === "to-be-continued";
          return (
            <TimelineEvent
              key={id}
              headline={headline}
              date={date}
              description={description}
              image={image}
              orientation={idx % 2 === 0 ? "right" : "left"}
              onOpen={
                isSentinel || !(story || image)
                  ? undefined
                  : () => openEvent(entry)
              }
            />
          );
        })}
      </div>
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/click-events-have-key-events -- backdrop click-to-close; the dialog itself handles Escape natively */}
      <dialog
        ref={dialogRef}
        className="timeline-modal"
        onClose={() => setSelectedEvent(null)}
        onClick={handleBackdropClick}
      >
        {selectedEvent ? (
          <article className="timeline-modal_body">
            <button
              type="button"
              className="timeline-modal_close"
              onClick={() => dialogRef.current?.close()}
              aria-label="Close"
            >
              ×
            </button>
            {selectedEvent.image ? (
              <img
                className="timeline-modal_image"
                src={selectedEvent.image.src}
                alt={selectedEvent.image.alt}
              />
            ) : null}
            <div className="timeline-modal_content">
              <header className="timeline-modal_header">
                <h3>{selectedEvent.headline}</h3>
                <p className="timeline-modal_date">{selectedEvent.date}</p>
              </header>
              <p className="timeline-modal_story">
                {renderInlineMarkdown(
                  selectedEvent.story ?? selectedEvent.description,
                )}
              </p>
            </div>
          </article>
        ) : null}
      </dialog>
    </section>
  );
};

export default AboutMePage;
