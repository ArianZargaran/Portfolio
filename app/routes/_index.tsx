import { cssBundleHref } from "@remix-run/css-bundle";
import { LinksFunction } from "@remix-run/node";
import { motion } from "framer-motion";

import commonThemePage from "~/stylesheets/common-page-themes.css";
import homeStyles from "~/stylesheets/home.css";

export const links: LinksFunction = () => [
  ...(cssBundleHref ? [{ rel: "stylesheet", href: cssBundleHref }] : []),
  { rel: "stylesheet", href: commonThemePage },
  { rel: "stylesheet", href: homeStyles },
];

const IndexPage = () => {
  return (
    <section className="page pure home">
      <motion.h1>
        Hi, this is <strong>Arian</strong>.
      </motion.h1>
      <motion.h2>Welcome to my site!</motion.h2>
    </section>
  );
};

export default IndexPage;
