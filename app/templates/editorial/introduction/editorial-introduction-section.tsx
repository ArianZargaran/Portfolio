import { LinksFunction } from "@remix-run/node";
import parse from "html-react-parser";
import React, { DetailedHTMLProps, HTMLAttributes } from "react";

import editorialIntroSectionStyles from "./editorial-intro-section.css";

interface EditorialIntroductionSectionProps
  extends DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> {
  heading?: string;
  introduction: string;
  quote?: {
    copy: string;
    cite?: string;
  };
}

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: editorialIntroSectionStyles },
];

export const EditorialIntroductionSection: React.FC<
  EditorialIntroductionSectionProps
> = ({
  id = "intro",
  heading = "Introduction",
  introduction = `<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer sit amet <mark>lacinia libero</mark>. Cras convallis nibh sit amet velit malesuada, nec malesuada sem tincidunt. <abbr title="Artificial Intelligence">AI</abbr> in real-time applications poses a challenge in terms of efficiency and accuracy.</p>`,
  quote = {
    copy: "Artificial intelligence has revolutionized multiple industries, changing the way we approach complex problems.",
    cite: "https://example.com",
  },
  ...rest
}) => {
  return (
    <section className="editorialIntroSection" id={id} {...rest}>
      <h2 className="editorialIntroSection_heading">{heading}</h2>
      {parse(introduction)}
      <blockquote cite={quote.cite}>{quote.copy}</blockquote>
    </section>
  );
};
