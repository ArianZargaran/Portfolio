import { cssBundleHref } from "@remix-run/css-bundle";
import { LinksFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";
import { motion } from "framer-motion";

import { Doodles } from "~/components/backgrounds/home-page/doodles";
import { Download } from "~/components/icons/download";
import Button from "~/components/interactive-elements/button/button";
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
        <img
          className="home-content_isotype"
          src="/isotipo.svg"
          alt="Arian Isotype"
          height={72}
          width={72}
        />
        <motion.h1
          className="home-content_headline"
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
          Hi, this is{" "}
          <strong className="home-content_upsell">Arian Zargaran</strong>.
        </motion.h1>
        <motion.h2
          className="home-content_subheadline"
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
              delay: 0.4,
            },
          }}
          className="home-cta-wrapper"
        >
          <Link className="home-main-cta" to="/projects">
            <Button>My Projects</Button>
          </Link>
          <Link
            to="/arian-zargaran-resume.pdf"
            target="_blank"
            download="/arian-zargaran-resume.pdf"
          >
            <Button variant="secondary">
              Resume <Download height={16} width={16} />
            </Button>
          </Link>
        </motion.div>
      </div>
      <Doodles className="home-background" />
    </section>
  );
};

export default IndexPage;
