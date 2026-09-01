import { cssBundleHref } from "@remix-run/css-bundle";
import { LinksFunction, MetaFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";

import { Murmuration } from "~/components/work-diagrams/murmuration";
import commonThemePage from "~/stylesheets/common-page-themes.css";
import murmuration from "~/stylesheets/murmuration.css";
import work from "~/stylesheets/work.css";

/* Standalone deep-dive page with its own type identity (Newsreader + IBM
   Plex), same pattern as the motion spec sheet: does not load work-diagram.css
   or its --wd-* tokens. Every rule in murmuration.css is scoped under
   .murmuration-page so nothing leaks onto other routes. */
export const links: LinksFunction = () => [
  ...(cssBundleHref ? [{ rel: "stylesheet", href: cssBundleHref }] : []),
  { rel: "stylesheet", href: commonThemePage },
  { rel: "stylesheet", href: work },
  { rel: "stylesheet", href: murmuration },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;0,6..72,500;1,6..72,300&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap",
  },
];

export const meta: MetaFunction = () => [
  { title: "Murmuration — Arian Zargaran" },
];

const MurmurationRoute = () => (
  <section className="page murmuration-page">
    <Link className="murmuration-page_back" to="/work">
      ← Back to Work
    </Link>
    <Murmuration />
  </section>
);

export default MurmurationRoute;
