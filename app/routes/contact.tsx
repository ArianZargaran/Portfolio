import { useEffect, useRef, useState } from "react";
import type { LinksFunction, MetaFunction } from "react-router";
import { Link, useLoaderData } from "react-router";

import { RoutePage } from "~/components/route-page/route-page";
import { CONTACT } from "~/content/contact";
import routePage from "~/stylesheets/route-page.css?url";
import { mergeMeta } from "~/utils/seo";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: routePage },
];

export const meta: MetaFunction = mergeMeta(() => [
  { title: "Contact — Arian Zargaran" },
  { name: "description", content: `Write to Arian at ${CONTACT.email}.` },
]);

export const loader = () => ({ contact: CONTACT });

export default function ContactPage() {
  const { contact } = useLoaderData<typeof loader>();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => void (timer.current && clearTimeout(timer.current)),
    [],
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(contact.email);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the address is visible and selectable anyway.
    }
  };

  return (
    <RoutePage id="contact" title="Contact">
      <p className="route-page_lede">{contact.headline}</p>
      <p>{contact.intro}</p>
      <address>
        <p className="route-page_actions">
          <a
            className="route-page_button route-page_button--primary"
            href={`mailto:${contact.email}`}
          >
            Email {contact.email}
          </a>
          <button type="button" className="route-page_button" onClick={copy}>
            {copied ? "Copied" : "Copy address"}
          </button>
          <span role="status" aria-live="polite" className="visually-hidden">
            {copied ? "Email address copied to the clipboard" : ""}
          </span>
        </p>
        <p className="route-page_meta">{contact.location}</p>
      </address>
      <h2 id="contact-elsewhere">Elsewhere</h2>
      <ul aria-labelledby="contact-elsewhere">
        {contact.socials.map((s) => (
          <li key={s.id}>
            <a href={s.href} rel="noreferrer" target="_blank">
              {s.label}
              <span className="visually-hidden"> (opens in a new tab)</span>
            </a>
          </li>
        ))}
      </ul>
      <p>
        Prefer the long version? See the <Link to="/resume">resume</Link>.
      </p>
    </RoutePage>
  );
}
