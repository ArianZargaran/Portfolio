import classNames from "classnames";
import { motion, useScroll } from "motion/react";
import { useEffect, useRef } from "react";

import { ChildIllustration } from "~/components/illustrations/child";
import { CoupleIllustration } from "~/components/illustrations/couple";
import { PilotIllustration } from "~/components/illustrations/pilot";
import { TeenagerIllustration } from "~/components/illustrations/teenager";

import style from "./illustrations-track.module.css";

const TRACK_VERTICAL_NUDGE_PX = -30; // pulls the track up to optically align illustrations with the surrounding layout
const FADE_SAFETY = 0.85; // opacity hits 0 at this fraction of the distance from window center to where the illustration's edge would touch the frame

export const IllustrationsTrack: React.FC = () => {
  const { scrollYProgress } = useScroll();
  const ref = useRef<HTMLDivElement>(null);
  const childRef = useRef<SVGSVGElement>(null);
  const teenRef = useRef<SVGSVGElement>(null);
  const coupleRef = useRef<SVGSVGElement>(null);
  const pilotRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const track = ref.current;
    if (!track) return;

    const illustrations = [
      childRef.current,
      teenRef.current,
      coupleRef.current,
      pilotRef.current,
    ].filter((el): el is SVGSVGElement => el !== null);

    let maxScrollLeft = 0;
    let parentWidth = 0;
    const centers: number[] = new Array(illustrations.length).fill(0);
    const halfWidths: number[] = new Array(illustrations.length).fill(0);

    const measure = () => {
      const parent = track.parentElement;
      parentWidth = parent?.clientWidth ?? track.clientWidth;
      maxScrollLeft = track.scrollWidth - track.clientWidth;
      const trackRect = track.getBoundingClientRect();
      illustrations.forEach((el, i) => {
        const rect = el.getBoundingClientRect();
        centers[i] =
          rect.left + track.scrollLeft - trackRect.left + rect.width / 2;
        halfWidths[i] = rect.width / 2;
      });
    };

    const updateOpacities = () => {
      const halfFrame = parentWidth / 2;
      const windowCenter = track.scrollLeft + halfFrame;
      illustrations.forEach((el, i) => {
        const dist = Math.abs(centers[i] - windowCenter);
        const fadeEnd = Math.max(1, (halfFrame - halfWidths[i]) * FADE_SAFETY);
        const opacity = Math.max(0, 1 - dist / fadeEnd);
        el.style.opacity = String(opacity);
      });
    };

    measure();
    track.scrollLeft = scrollYProgress.get() * maxScrollLeft;
    updateOpacities();

    const observer = new ResizeObserver(() => {
      measure();
      track.scrollLeft = scrollYProgress.get() * maxScrollLeft;
      updateOpacities();
    });
    observer.observe(track);
    const unsubscribe = scrollYProgress.on("change", (latestY) => {
      track.scrollLeft = latestY * maxScrollLeft;
      updateOpacities();
    });

    return () => {
      observer.disconnect();
      unsubscribe();
    };
  }, [scrollYProgress]);

  return (
    <motion.div
      style={{ marginTop: TRACK_VERTICAL_NUDGE_PX }}
      ref={ref}
      className={style["illustrations-track"]}
    >
      <ChildIllustration
        ref={childRef}
        className={classNames(style["illustration"], style["child"])}
      />
      <TeenagerIllustration
        ref={teenRef}
        className={classNames(style["illustration"], style["teenager"])}
        height={350}
      />
      <CoupleIllustration
        ref={coupleRef}
        style={{ transform: "scale(1.15) translate(0, -15px)" }}
        className={classNames(style["illustration"], style["couple"])}
      />
      <PilotIllustration
        ref={pilotRef}
        style={{ transform: "scale(1.2)" }}
        className={classNames(style["illustration"], style["pilot"])}
      />
    </motion.div>
  );
};
