import classNames from "classnames";
import React from "react";

import { IconProps } from "../icons";
import { Email } from "../logos/email";
import { Github } from "../logos/github";
import { Linkedin } from "../logos/linkedin";
import { X } from "../logos/x";

import "./social-nav.css";

const LOGOS: {
  id: string;
  /** Accessible name; the link content is an icon only. */
  label: string;
  component: React.FC;
  href: string;
  props: IconProps;
}[] = [
  {
    id: "x",
    label: "Arian on X",
    component: X,
    href: "https://x.com/arianfront",
    props: {
      height: 24,
      width: 24,
    },
  },
  {
    id: "github",
    label: "Arian on GitHub",
    component: Github,
    href: "https://github.com/arianzargaran",
    props: {
      height: 32,
      width: 32,
    },
  },
  {
    id: "linkedin",
    label: "Arian on LinkedIn",
    component: Linkedin,
    href: "https://www.linkedin.com/in/arianzf/",
    props: {
      height: 32,
      width: 32,
    },
  },
  {
    id: "email",
    label: "Email hello@ari.soy",
    component: Email,
    href: "mailto:hello@ari.soy",
    props: {
      height: 24,
      width: 24,
    },
  },
];

interface SocialNavProps {
  className?: string;
}

export const SocialNav: React.FC<SocialNavProps> = ({ className }) => {
  return (
    <nav className={classNames(className, "social-nav")}>
      <ul className="social-nav-list">
        {LOGOS.map((logo) => {
          const isExternal = /^https?:/.test(logo.href);
          return (
            <li className="social-nav-list-item" key={logo.id}>
              <a
                className="social-nav-link"
                href={logo.href}
                aria-label={logo.label}
                {...(isExternal && { target: "_blank", rel: "noreferrer" })}
              >
                <logo.component className="social-nav-logo" {...logo.props} />
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
