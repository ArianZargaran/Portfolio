import classnames from "classnames";
import { AnimatePresence, motion } from "motion/react";
import React, { useEffect, useRef, useState } from "react";

import "./work-card.css";
import type { WorkCard as WorkCardData } from "~/constants/work-cards";
import { renderInlineMarkdown } from "~/utils/inline-markdown";

/** Cycle interval range, ms — per-card pace within this range so faces don't
    all flip in lockstep (same drift trick as the old gallery tiles). */
const CYCLE_BASE = 5500;
const CYCLE_JITTER = 2500;

interface WorkCardProps {
  card: WorkCardData;
  isExpanded: boolean;
  /** True when ANY card on the page is expanded — freezes all cycling so the
      page goes calm while the visitor reads. */
  anyExpanded: boolean;
  /** True only in the grid's "open" phase — the body mounts after the row
      choreography has handed this card its full-width line. */
  showBody: boolean;
  /** Phase-derived modifier classes (is-expanded / is-vacating /
      is-relocated), owned by the grid's choreography state machine. */
  stateClass: string;
  /** Fires exactly when the body's own exit animation genuinely finishes —
      the grid waits for this real event instead of guessing a matching
      duration with a timer, which is what kept racing Framer's actual
      completion (it starts a frame or two late). Only relevant on close. */
  onBodyExitComplete: () => void;
  onToggle: () => void;
}

export const WorkCardTile: React.FC<WorkCardProps> = ({
  card,
  isExpanded,
  anyExpanded,
  showBody,
  stateClass,
  onBodyExitComplete,
  onToggle,
}) => {
  /* The face rotation: the Signal is frame 0, each block's teaser follows.
     kind is null for the Signal (no tag shown on the default face). */
  const frames = [
    { kind: null as string | null, text: card.signal },
    ...card.blocks.map((b) => ({ kind: b.kind as string | null, text: b.face })),
  ];
  const [frameIdx, setFrameIdx] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const intervalMs = useRef(CYCLE_BASE + Math.random() * CYCLE_JITTER).current;

  const paused = isHovered || anyExpanded || frames.length <= 1;

  useEffect(() => {
    if (paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = window.setInterval(() => {
      setFrameIdx((prev) => (prev + 1) % frames.length);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [paused, frames.length, intervalMs]);

  const frame = frames[frameIdx];
  /* Images ride along with the text frames instead of on their own timer, so
     a card never flips text and image at slightly different moments. */
  const imageIdx = card.images.length > 0 ? frameIdx % card.images.length : 0;

  return (
    /* Plain li, no Framer layout prop: layout animations tween cards along
       transform flights between their old and new rects, which is exactly
       what made them cross each other and escape the wrapper. All movement
       here is in-flow (CSS flex transitions driven by the grid's phase
       classes), so cards can only slide along their row. */
    <li
      className={classnames("work-card", stateClass)}
      data-work-card={card.id}
      data-testid="work-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        type="button"
        className="work-card_face"
        onClick={onToggle}
        aria-expanded={isExpanded}
        aria-label={
          isExpanded
            ? `Collapse ${card.eyebrow} card`
            : `Expand ${card.eyebrow} card`
        }
      >
        <div
          className={classnames("work-card_media", {
            "is-pending": card.images.length === 0,
          })}
        >
          {card.images.map((image, idx) => (
            <img
              key={image.src}
              src={image.src}
              alt={image.alt}
              aria-hidden={idx !== imageIdx}
              className={classnames("work-card_img", {
                "is-visible": idx === imageIdx,
              })}
            />
          ))}
        </div>
        <div className="work-card_content">
          <p className="work-card_eyebrow">{card.eyebrow}</p>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={frameIdx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              {/* Rendered even when empty (Signal frame): the kind row keeps
                  its one-line slot so the headline never jumps between
                  frames — the CSS reserves its height either way. */}
              <p className="work-card_kind">{frame.kind ?? ""}</p>
              <h2 className="work-card_headline">
                {renderInlineMarkdown(frame.text)}
              </h2>
            </motion.div>
          </AnimatePresence>
        </div>
      </button>

      <AnimatePresence initial={false} onExitComplete={onBodyExitComplete}>
        {showBody ? (
          /* Height and opacity are split across two nested elements rather
             than animated together on one: a single element fading and
             shrinking at the same time lets the text reflow/squeeze into an
             ever-smaller box WHILE still visible, which reads as the content
             itself blinking. The outer element owns only height (slower,
             300ms) so it clips smoothly; the inner owns only opacity
             (faster, 150ms) so the content is already fully invisible well
             before the box has shrunk much — nothing visible is ever
             reflowing. */
          <motion.div
            className="work-card_body"
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: "easeInOut" }}
            >
              {card.blocks.map((block) => (
                <section key={block.kind} className="work-card_block">
                  <h3 className="work-card_block-kind">{block.kind}</h3>
                  <p className="work-card_block-text">
                    {renderInlineMarkdown(block.expanded)}
                  </p>
                </section>
              ))}
              <p className="work-card_meta">{card.meta}</p>
              {card.link ? (
                <a
                  className="work-card_link"
                  href={card.link.href}
                  {...(card.link.href.startsWith("/")
                    ? {}
                    : { target: "_blank", rel: "noopener noreferrer" })}
                >
                  {card.link.label}
                </a>
              ) : null}
              {card.diagrams?.length ? (
                <ul className="work-card_diagrams">
                  {card.diagrams.map((diagram) => (
                    <li key={diagram.href}>
                      <a className="work-card_link" href={diagram.href}>
                        {diagram.label}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </li>
  );
};
