import { LinksFunction, MetaFunction, useLoaderData } from "react-router";

import { RoutePage } from "~/components/route-page/route-page";
import { ABOUT } from "~/content/about";
import routePage from "~/stylesheets/route-page.css?url";
import { renderInlineMarkdown } from "~/utils/inline-markdown";
import { mergeMeta } from "~/utils/seo";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: routePage },
];

export const meta: MetaFunction = mergeMeta(() => [
  { title: "About — Arian Zargaran" },
]);

export const loader = () => ({ about: ABOUT });

export default function AboutPage() {
  const { about } = useLoaderData<typeof loader>();
  const timeline = about.timeline.filter((e) => e.id !== "to-be-continued");
  return (
    <RoutePage id="about" title={about.title}>
      <p className="route-page_lede">{about.bio}</p>
      <section aria-labelledby="about-timeline">
        <h2 id="about-timeline">Timeline</h2>
        <ol className="route-page_list about-timeline">
          {timeline.map((e) => (
            <li key={e.id}>
              <h3>{e.headline}</h3>
              <p className="route-page_meta">{e.date}</p>
              {e.image ? (
                <img
                  src={e.image.src}
                  alt={e.image.alt}
                  loading="lazy"
                  width={320}
                />
              ) : null}
              <p>{renderInlineMarkdown(e.description)}</p>
              {e.story ? (
                <details>
                  <summary>
                    Read the full story
                    <span className="visually-hidden">: {e.headline}</span>
                  </summary>
                  <p>{renderInlineMarkdown(e.story)}</p>
                </details>
              ) : null}
            </li>
          ))}
        </ol>
      </section>
    </RoutePage>
  );
}
