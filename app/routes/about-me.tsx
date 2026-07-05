import { cssBundleHref } from "@remix-run/css-bundle";
import { LinksFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";
import type { MouseEvent } from "react";
import { useEffect, useRef, useState } from "react";

import { AshesRain } from "~/components/backgrounds/ashes-rain/ashes-rain";
import { Isotype } from "~/components/icons/isotype/isotype";
import { IllustrationsSidebar } from "~/components/illustrations/illustrations-sidebar/illustrations-sidebar";
import { TimelineEvent } from "~/components/timeline/timeline-event";
import type { TimelineEntry } from "~/constants/timeline-data-set";
import { data } from "~/constants/timeline-data-set";
import aboutPage from "~/stylesheets/about.css";
import commonThemePage from "~/stylesheets/common-page-themes.css";
import { renderInlineMarkdown } from "~/utils/inline-markdown";

export const links: LinksFunction = () => [
  ...(cssBundleHref ? [{ rel: "stylesheet", href: cssBundleHref }] : []),
  { rel: "stylesheet", href: commonThemePage },
  { rel: "stylesheet", href: aboutPage },
];

const AboutMePage = () => {
  const [selectedEvent, setSelectedEvent] = useState<TimelineEntry | null>(
    null,
  );
  const dialogRef = useRef<HTMLDialogElement>(null);
  const scrollPositionRef = useRef(0);

  const openEvent = (entry: TimelineEntry) => {
    // Captured here, before showModal() — not inside the effect below.
    // showModal() synchronously focuses the dialog, and that focus can
    // itself trigger the browser's scroll-into-view behavior, resetting
    // window.scrollY before the effect (which only runs on the next tick,
    // after this render commits) ever gets to read it.
    scrollPositionRef.current = window.scrollY;
    setSelectedEvent(entry);
    dialogRef.current?.showModal();
  };

  // showModal() alone doesn't stop the page behind it from scrolling, and
  // plain overflow:hidden on html/body — the first thing most people reach
  // for — is known not to reliably block touch-driven scroll on iOS Safari
  // (rubber-banding drags the page underneath regardless). Pinning body to
  // the viewport via position:fixed, offset by the saved scroll position, is
  // the standard technique that actually holds on iOS. Driven by a single
  // effect keyed on selectedEvent rather than split across open/close
  // handlers, so lock and unlock can never fall out of sync with each other.
  useEffect(() => {
    if (!selectedEvent) return;

    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    document.documentElement.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollPositionRef.current}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.paddingRight = `${scrollbarWidth}px`;

    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.paddingRight = "";
      window.scrollTo(0, scrollPositionRef.current);
    };
  }, [selectedEvent]);

  // Escape is the one close path with no JS handler of our own to hook a
  // setSelectedEvent(null) into — it's handled entirely natively — so it
  // still needs this listener. Backdrop click and the close button call
  // setSelectedEvent(null) directly (see closeEvent below) rather than
  // relying on this same event, since dialog's native "close" firing
  // reliably on every path, on every mobile browser, isn't something to
  // stake page-scroll on.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => setSelectedEvent(null);
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, []);

  const closeEvent = () => {
    dialogRef.current?.close();
    setSelectedEvent(null);
  };

  // Native <dialog> reports clicks on the backdrop as clicks on the dialog
  // element itself; clicks inside land on descendants.
  const handleBackdropClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === dialogRef.current) closeEvent();
  };

  return (
    <section className="page about about-page">
      <AshesRain />
      <header className="page-header">
        <Link className="media-container-link" to="/">
          <h1 className="media-container-heading">
            <Isotype width={48} height="auto" />
          </h1>
        </Link>
      </header>
      <div className="media-container">
        <div className="media-container-illustration">
          <IllustrationsSidebar />
        </div>
        <h2 className="headline">About me</h2>
      </div>
      <div className="timeline">
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
        onClick={handleBackdropClick}
      >
        {selectedEvent ? (
          <>
            <button
              type="button"
              className="timeline-modal_close"
              onClick={closeEvent}
              aria-label="Close"
            >
              ×
            </button>
            <article className="timeline-modal_body">
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
          </>
        ) : null}
      </dialog>
    </section>
  );
};

export default AboutMePage;
