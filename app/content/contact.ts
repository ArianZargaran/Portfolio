/**
 * Public contact details for the web pages. Decision (Arian, 2026-10-13):
 * the public address on the site is hello@ari.soy only, and there is no phone
 * number anywhere (enforced by app/content/no-phone-number.test.ts). The
 * resume PDF keeps its own email.
 */
export interface SocialLink {
  id: "github" | "linkedin" | "x" | "codepen";
  label: string;
  href: string;
}

export interface ContactInfo {
  email: "hello@ari.soy";
  headline: string;
  intro: string;
  location: string;
  socials: SocialLink[];
}

export const CONTACT: ContactInfo = {
  email: "hello@ari.soy",
  headline: "Let's build something together.",
  intro:
    "I'm always open to collaborating, a quick chat, or just sharing a quick hello. The fastest way to reach me is by email.",
  location: "Dallas-Fort Worth, TX (Remote)",
  socials: [
    { id: "github", label: "GitHub", href: "https://github.com/arianzargaran" },
    {
      id: "linkedin",
      label: "LinkedIn",
      href: "https://www.linkedin.com/in/arianzf/",
    },
    { id: "x", label: "X", href: "https://x.com/arianfront" },
    {
      id: "codepen",
      label: "CodePen",
      href: "https://codepen.io/Arian-Zargaran",
    },
  ],
};
