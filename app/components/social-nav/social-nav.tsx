import { Link } from "@remix-run/react";
import classNames from "classnames";
import React from "react";

import { IconProps } from "../icons";
import { Email } from "../logos/email";
import { Github } from "../logos/github";
import { Linkedin } from "../logos/linkedin";
import { Phone } from "../logos/phone";
import { X } from "../logos/x";

import "./social-nav.css";

const LOGOS: {
  id: string;
  component: React.FC;
  href: string;
  props: IconProps;
}[] = [
  {
    id: "x",
    component: X,
    href: "https://x.com/arianfront",
    props: {
      height: 24,
      width: 24,
    },
  },
  {
    id: "phone",
    component: Phone,
    href: "tel:408-809-6343",
    props: {
      height: 32,
      width: 32,
    },
  },
  {
    id: "github",
    component: Github,
    href: "https://github.com/arianzargaran",
    props: {
      height: 32,
      width: 32,
    },
  },
  {
    id: "linkedin",
    component: Linkedin,
    href: "https://www.linkedin.com/in/arianzf/",
    props: {
      height: 32,
      width: 32,
    },
  },
  {
    id: "email",
    component: Email,
    href: "mailto:arianzf@gmail.com",
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
        {LOGOS.map((logo) => (
          <li className="social-nav-list-item" key={logo.id}>
            <Link
              target="_blank"
              rel="noreferrer"
              className="social-nav-link"
              to={logo.href}
            >
              <logo.component className="social-nav-logo" {...logo.props} />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
};
