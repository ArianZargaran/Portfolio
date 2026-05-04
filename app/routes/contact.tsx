import { cssBundleHref } from "@remix-run/css-bundle";
import { LinksFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";
import { motion } from "motion/react";

import { Download } from "~/components/icons/download";
import { Isotype } from "~/components/icons/isotype/isotype";
import Button from "~/components/interactive-elements/button/button";
import { SocialNav } from "~/components/social-nav/social-nav";
import commonThemePage from "~/stylesheets/common-page-themes.css";
import contactStyles from "~/stylesheets/contact.css";

export const links: LinksFunction = () => [
  ...(cssBundleHref ? [{ rel: "stylesheet", href: cssBundleHref }] : []),
  { rel: "stylesheet", href: commonThemePage },
  { rel: "stylesheet", href: contactStyles },
];

const fadeUp = {
  initial: { opacity: 0, y: -20 },
  animate: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay },
  }),
};

const ContactPage = () => {
  return (
    <section className="page contact contact-page">
      <header className="contact-header">
        <Link className="contact-header-link" to="/">
          <Isotype width={48} height="auto" />
          <h1>Contact</h1>
        </Link>
      </header>

      <div className="contact-content">
        <motion.h2
          className="contact-headline"
          initial={fadeUp.initial}
          animate={fadeUp.animate(0)}
        >
          Let&apos;s build <strong>something</strong> together.
        </motion.h2>

        <motion.p
          className="contact-subhead"
          initial={fadeUp.initial}
          animate={fadeUp.animate(0.15)}
        >
          I&apos;m always open to interesting work, a quick chat, or just a
          hello. The fastest way to reach me is email — anything else below
          works too.
        </motion.p>

        <motion.div
          className="contact-ctas"
          initial={fadeUp.initial}
          animate={fadeUp.animate(0.3)}
        >
          <Link to="mailto:hello@ari.soy">
            <Button>Email me</Button>
          </Link>
          <Link
            to="/arian-zargaran-resume.pdf"
            target="_blank"
            rel="noopener noreferrer"
            download="/arian-zargaran-resume.pdf"
          >
            <Button variant="secondary">
              Resume <Download height={16} width={16} />
            </Button>
          </Link>
        </motion.div>

        <SocialNav className="contact-social" />
      </div>
    </section>
  );
};

export default ContactPage;
