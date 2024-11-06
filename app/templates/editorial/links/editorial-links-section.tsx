import React from "react";

interface EditorialLinksSectionProps {
  id: string;
  heading: string;
  links: {
    href: string;
    copy: string;
  }[];
}

export const EditorialLinksSection: React.FC<EditorialLinksSectionProps> = ({
  id = "references",
  heading = "References",
  links = [
    {
      href: "https://example.com/article1",
      copy: "Author, A. (2023). Title of Article 1. AI Journal.",
    },
    {
      href: "https://example.com/article2",
      copy: "Author, B. (2024). Title of Article 2. Journal of Artificial Intelligence.",
    },
  ],
}) => {
  return (
    <section id={id}>
      <h2>{heading}</h2>
      <ul>
        {links.map((link) => (
          <li key={link.copy}>
            <a href={link.href}>{link.copy}</a>
          </li>
        ))}
      </ul>
    </section>
  );
};
