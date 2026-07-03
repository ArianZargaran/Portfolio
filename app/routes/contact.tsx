import { cssBundleHref } from "@remix-run/css-bundle";
import { LinksFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { Check } from "~/components/icons/check";
import { Copy } from "~/components/icons/copy";
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

const EMAIL = "hello@ari.soy";

const fadeUp = {
  initial: { opacity: 0, y: -20 },
  animate: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay },
  }),
};

const ContactPage = () => {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = EMAIL;
      ta.setAttribute("readonly", "");
      ta.style.position = "absolute";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setCopied(false), 2000);
  };

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
          I&apos;m always open to collaborating, a quick chat, or just sharing a
          quick hello. The fastest way to reach me is by email — anything else below
          works too.
        </motion.p>

        <motion.div
          className="contact-ctas"
          initial={fadeUp.initial}
          animate={fadeUp.animate(0.3)}
        >
          <Button href={`mailto:${EMAIL}`}>Email me</Button>
          <Button
            variant="secondary"
            href="/arian-zargaran-resume.pdf"
            target="_blank"
            rel="noopener noreferrer"
            download="/arian-zargaran-resume.pdf"
          >
            Resume <Download height={16} width={16} />
          </Button>
        </motion.div>

        <motion.div
          className="contact-email-row"
          initial={fadeUp.initial}
          animate={fadeUp.animate(0.45)}
        >
          <span className="contact-email-prefix">or write to me at</span>
          <a className="contact-email-address" href={`mailto:${EMAIL}`}>
            {EMAIL}
          </a>
          <button
            type="button"
            className="contact-email-copy"
            onClick={handleCopy}
            aria-label={copied ? "Email address copied" : "Copy email address"}
          >
            {copied ? (
              <Check height={16} width={16} />
            ) : (
              <Copy height={16} width={16} />
            )}
            <span aria-hidden="true">{copied ? "Copied" : "Copy"}</span>
          </button>
        </motion.div>

        <SocialNav className="contact-social" />
      </div>
    </section>
  );
};

export default ContactPage;
