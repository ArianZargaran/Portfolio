import { cssBundleHref } from "@remix-run/css-bundle";
import { LinksFunction } from "@remix-run/node";
import { motion } from "framer-motion";

import { Doodles } from "~/components/backgrounds/home-page/doodles";
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
      <div className="home-content_container">
        <motion.h1
          initial={{
            y: -20,
            opacity: 0,
          }}
          animate={{
            y: 0,
            opacity: 1,
            transition: {
              duration: 0.4,
            },
          }}
        >
          Hi, this is <strong className="home-content_upsell">Arian</strong>.
        </motion.h1>
        <motion.h2
          initial={{
            y: -20,
            opacity: 0,
          }}
          animate={{
            y: 0,
            opacity: 1,
            transition: {
              duration: 0.4,
              delay: 0.2,
            },
          }}
        >
          Welcome to my site!
        </motion.h2>
        <motion.div
          initial={{
            y: -20,
            opacity: 0,
          }}
          animate={{
            y: 0,
            opacity: 1,
            transition: {
              duration: 0.4,
              delay: 0.2,
            },
          }}
          className="home-cta-wrapper"
        >
          <button>Explore</button>
          <button>Download my resume</button>
        </motion.div>
      </div>
      <Doodles className="home-background" />
    </section>
  );
};

export default IndexPage;
