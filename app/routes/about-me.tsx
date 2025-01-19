import { cssBundleHref } from "@remix-run/css-bundle";
import { LinksFunction } from "@remix-run/node";

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
    <section className="page french about">
      <div ref={ref} className="media-container">
        <div className="illustration-window">
          <IllustrationsTrack />
        </div>
        <h1 className="headline">About</h1>
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
