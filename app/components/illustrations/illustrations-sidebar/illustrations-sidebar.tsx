import { useEffect, useRef } from "react";

import style from "./illustrations-sidebar.module.css";

/**
 * Sticky left-rail companion to the timeline: one of four life-stage
 * illustrations is visible at a time, crossfading in and out as the page
 * scrolls. Each frame's opacity peaks at the fraction of total scroll where
 * its matching timeline chapter begins, so the image always tracks roughly
 * what the reader is looking at on the right.
 *
 * Opacity is driven by a manual scroll listener writing directly to each
 * <img>'s style, not Motion's scroll-linked useTransform. Motion offloads
 * scroll-tied transforms to a native ScrollTimeline when it can, and that
 * path proved unreliable here on two counts: it crashed on breakpoints
 * outside [0, 1], and — even after clamping those — it would still go stale
 * mid-crossfade (e.g. two frames visibly overlapping) once the browser
 * decided to stop sampling it. A plain rAF-free scroll listener has none of
 * that: it only ever runs on an actual scroll event, so it can't desync.
 */
const ILLUSTRATIONS = [
  { src: "/illustration-child.png", alt: "Illustration of a child running" },
  {
    src: "/illustration-teenager.png",
    alt: "Illustration of a teenager walking",
  },
  {
    src: "/illustration-couple.png",
    alt: "Illustration of a couple walking hand in hand",
  },
  {
    src: "/illustration-family.png",
    alt: "Illustration of a family sitting together",
  },
];

/**
 * Opacity for one frame at a given scroll fraction (0-1). Each frame owns an
 * equal slice of scroll progress; its opacity ramps up from 0 at the
 * previous frame's center to 1 at its own center, then back down to 0 at the
 * next frame's center — adjacent ramps meet at 0.5, so there's always a
 * visible frame, never a blank gap between them. The first frame stays fully
 * visible from the very top of the page (instead of fading in from blank)
 * and the last stays visible through the very bottom.
 */
const frameOpacity = (
  progress: number,
  index: number,
  total: number,
): number => {
  const center = (index + 0.5) / total;
  const span = 1 / total;
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const start = isFirst ? 0 : center - span;
  const end = isLast ? 1 : center + span;

  if (progress <= start) return isFirst ? 1 : 0;
  if (progress >= end) return isLast ? 1 : 0;
  if (progress <= center) {
    return isFirst ? 1 : (progress - start) / (center - start);
  }
  return isLast ? 1 : 1 - (progress - center) / (end - center);
};

export const IllustrationsSidebar: React.FC = () => {
  const imageRefs = useRef<(HTMLImageElement | null)[]>([]);

  useEffect(() => {
    const update = () => {
      const maxScroll =
        document.documentElement.scrollHeight - window.innerHeight;
      const progress = maxScroll > 0 ? window.scrollY / maxScroll : 0;
      imageRefs.current.forEach((img, index) => {
        if (!img) return;
        img.style.opacity = String(
          frameOpacity(progress, index, ILLUSTRATIONS.length),
        );
      });
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div className={style["illustrations-sidebar"]}>
      {ILLUSTRATIONS.map((illustration, index) => (
        <img
          key={illustration.src}
          ref={(el) => {
            imageRefs.current[index] = el;
          }}
          src={illustration.src}
          alt={illustration.alt}
          className={style.illustration}
        />
      ))}
    </div>
  );
};
