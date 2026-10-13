import type { LinksFunction, MetaFunction } from "react-router";
import { useLoaderData } from "react-router";

import { RoutePage } from "~/components/route-page/route-page";
import { formatRange, RESUME } from "~/content/resume";
import routePage from "~/stylesheets/route-page.css?url";
import { mergeMeta } from "~/utils/seo";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: routePage },
];

export const meta: MetaFunction = mergeMeta(() => [
  { title: "Resume — Arian Zargaran" },
  { name: "description", content: RESUME.summary },
]);

/** Content comes from typed data, server-rendered (works with no JS). */
export const loader = () => ({ resume: RESUME });

export default function ResumePage() {
  const { resume } = useLoaderData<typeof loader>();
  return (
    <RoutePage id="resume" title="Resume">
      <p className="route-page_lede">{resume.summary}</p>
      <p className="route-page_actions">
        <a
          className="route-page_button route-page_button--primary"
          href={resume.pdf.href}
          download
        >
          {resume.pdf.label}
        </a>
      </p>

      <section aria-labelledby="resume-experience">
        <h2 id="resume-experience">Experience</h2>
        <ol className="route-page_list">
          {resume.experience.map((role) => (
            <li key={`${role.org}-${role.start}`}>
              <article aria-label={`${role.title} at ${role.org}`}>
                <h3>
                  {role.title}, {role.org}
                </h3>
                <p className="route-page_meta">
                  <time dateTime={role.start}>
                    {formatRange(role).split(" – ")[0]}
                  </time>
                  {" – "}
                  {role.end ? (
                    <time dateTime={role.end}>
                      {formatRange(role).split(" – ")[1]}
                    </time>
                  ) : (
                    "Present"
                  )}
                  {" · "}
                  {role.location}
                </p>
                <ul>
                  {role.highlights.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              </article>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="resume-competencies">
        <h2 id="resume-competencies">Core competencies</h2>
        <ul className="route-page_tags">
          {resume.competencies.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="resume-projects">
        <h2 id="resume-projects">Projects</h2>
        <ul className="route-page_list">
          {resume.projects.map((p) => (
            <li key={p.name}>
              <h3>
                {p.name}
                {p.badge ? (
                  <span className="route-page_meta"> · {p.badge}</span>
                ) : null}
              </h3>
              <p>{p.summary}</p>
              <p className="route-page_meta">{p.stack.join(" · ")}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="resume-skills">
        <h2 id="resume-skills">Skills</h2>
        <dl>
          {resume.skills.map((s) => (
            <div key={s.area}>
              <dt>
                <strong>{s.area}</strong>
              </dt>
              <dd>{s.items}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="resume-education">
        <h2 id="resume-education">Education and certifications</h2>
        <ul>
          {resume.education.map((e) => (
            <li key={e.title}>
              {e.title}, {e.org} ({e.year}){e.note ? `. ${e.note}` : ""}
            </li>
          ))}
          {resume.certifications.map((c) => (
            <li key={c.title}>
              {c.title}, {c.org}: {c.status}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="resume-languages">
        <h2 id="resume-languages">Languages</h2>
        <ul>
          {resume.languages.map((l) => (
            <li key={l.name}>
              {l.name} ({l.level})
            </li>
          ))}
        </ul>
      </section>
    </RoutePage>
  );
}
