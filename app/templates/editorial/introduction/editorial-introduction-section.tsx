import parse from "html-react-parser";
import React from "react";

interface EditorialIntroductionSectionProps {
  id: string;
  heading?: string;
  introduction: string;
  quote?: {
    copy: string;
    cite?: string;
  };
}

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
}) => {
  return (
    <section id={id}>
      <h2>{heading}</h2>
      {parse(introduction)}
      <blockquote cite={quote.cite}>{quote.copy}</blockquote>
    </section>
  );
};
