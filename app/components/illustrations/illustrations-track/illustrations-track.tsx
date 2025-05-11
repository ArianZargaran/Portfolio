import classNames from "classnames";
import { motion, useScroll, useTransform } from "motion/react";
import { useEffect, useRef } from "react";

import { ChildIllustration } from "~/components/illustrations/child";
import { CoupleIllustration } from "~/components/illustrations/couple";
import { PilotIllustration } from "~/components/illustrations/pilot";
import { TeenagerIllustration } from "~/components/illustrations/teenager";

import style from "./illustrations-track.module.css";

export const IllustrationsTrack: React.FC = () => {
  const { scrollYProgress } = useScroll();
  const ref = useRef<HTMLDivElement>(null);

  const scrollValue = useTransform(scrollYProgress, [0, 1], [0, 1350]);

  const childOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const teenOpacity = useTransform(
    scrollYProgress,
    [0.05, 0.15, 0.25, 0.35],
    [0, 1, 1, 0],
  );
  const coupleOpacity = useTransform(
    scrollYProgress,
    [0.25, 0.35, 0.5, 0.55],
    [0, 1, 1, 0],
  );
  const pilotOpacity = useTransform(scrollYProgress, [0.45, 0.7], [0, 1]);

  useEffect(() => {
    const unsubscribe = scrollValue.on("change", (latest) => {
      if (ref.current) {
        ref.current.scrollLeft = latest;
      }
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollValue]);

  return (
    <motion.div
      style={{ marginTop: -30 }}
      ref={ref}
      className={style["illustrations-track"]}
    >
      <ChildIllustration
        style={{ opacity: childOpacity as unknown as number }}
        className={classNames(style["illustration"], style["child"])}
      />
      <TeenagerIllustration
        style={{ opacity: teenOpacity as unknown as number }}
        className={classNames(style["illustration"], style["teenager"])}
        height={350}
      />
      <CoupleIllustration
        style={{
          opacity: coupleOpacity as unknown as number,
          transform: "scale(1.15) translate(0, -15px)",
        }}
        className={classNames(style["illustration"], style["couple"])}
      />
      <PilotIllustration
        style={{
          opacity: pilotOpacity as unknown as number,
          transform: "scale(1.2)",
        }}
        className={classNames(style["illustration"], style["pilot"])}
      />
    </motion.div>
  );
};
