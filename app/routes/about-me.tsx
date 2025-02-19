import { cssBundleHref } from "@remix-run/css-bundle";
import { LinksFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";
import { motion } from "framer-motion";

import { Isotype } from "~/components/icons/isotype/isotype";
import { IllustrationsTrack } from "~/components/illustrations/illustrations-track/illustrations-track";
import { TimelineEvent } from "~/components/timeline/timeline-event";
import { data } from "~/constants/timeline-data-set";
import { useElementSize } from "~/hooks/useElementSize";
import aboutPage from "~/stylesheets/about.css";
import commonThemePage from "~/stylesheets/common-page-themes.css";

export const links: LinksFunction = () => [
  ...(cssBundleHref ? [{ rel: "stylesheet", href: cssBundleHref }] : []),
  { rel: "stylesheet", href: commonThemePage },
  { rel: "stylesheet", href: aboutPage },
];

const AboutMePage = () => {
  const { ref, dimensions } = useElementSize<HTMLDivElement>();
  return (
    <section className="page about about-page">
      <div ref={ref} className="media-container">
        <Link className="media-container-link" to="/">
          <h1 className="media-container-heading">
            <Isotype width={50} height="auto" />
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
            backgroundPosition: "0 0, -3rem 19.765rem",
          }}
        />
        <div className="illustration-window">
          <IllustrationsTrack />
        </div>
        <h2 className="headline">About me</h2>
      </div>
      <div
        className="timeline"
        style={{
          "--illustration-height": `${dimensions.height}rem`,
        }}
      >
        {data.map(({ headline, date, description }, idx) => {
          return (
            <TimelineEvent
              key={date}
              headline={headline}
              date={date}
              description={description}
              orientation={idx % 2 === 0 ? "right" : "left"}
            />
          );
        })}
      </div>
    </section>
  );
};

export default AboutMePage;
