import { cssBundleHref } from "@remix-run/css-bundle";
import { LinksFunction } from "@remix-run/node";

import { Background } from "~/components/backgrounds/contact";
import commonThemePage from "~/stylesheets/common-page-themes.css";

export const links: LinksFunction = () => [
  ...(cssBundleHref ? [{ rel: "stylesheet", href: cssBundleHref }] : []),
  { rel: "stylesheet", href: commonThemePage },
];

const ContactPage = () => {
  return (
    <section className="page stratos">
      <Background />
    </section>
  );
};

export default ContactPage;
