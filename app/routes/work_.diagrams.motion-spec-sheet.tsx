import { cssBundleHref } from "@remix-run/css-bundle";
import { LinksFunction, MetaFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";

import { MotionSpecSheet } from "~/components/work-diagrams/motion-spec-sheet";
import commonThemePage from "~/stylesheets/common-page-themes.css";
import motionSpecSheet from "~/stylesheets/motion-spec-sheet.css";
import work from "~/stylesheets/work.css";

/* Unlike the sibling diagram routes this one does NOT load work-diagram.css:
   the page is a deliberately standalone dark "instrument panel" world with
   its own palette, so it ships a dedicated stylesheet instead of the shared
   --wd-* token system (including its own back-link styling). Every rule in
   that stylesheet is scoped under .motion-lab-page / .motion-lab so nothing
   leaks onto other routes. */
export const links: LinksFunction = () => [
  ...(cssBundleHref ? [{ rel: "stylesheet", href: cssBundleHref }] : []),
  { rel: "stylesheet", href: commonThemePage },
  { rel: "stylesheet", href: work },
  { rel: "stylesheet", href: motionSpecSheet },
];

export const meta: MetaFunction = () => [
  { title: "Motion Spec Sheet — Arian Zargaran" },
];

const MotionSpecSheetRoute = () => (
  <section className="page motion-lab-page">
    <Link className="motion-lab-page_back" to="/work">
      ← Back to Work
    </Link>
    <MotionSpecSheet />
  </section>
);

export default MotionSpecSheetRoute;
