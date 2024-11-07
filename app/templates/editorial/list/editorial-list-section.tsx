import { LinksFunction } from "@remix-run/node";
import React, { DetailedHTMLProps, HTMLAttributes } from "react";

import editorialListSectionStyles from "./editorial-list-section.css";

interface EditorialListSectionProps
  extends DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> {
  heading?: string;
  variant?: "ordered" | "unordered";
  methods?: {
    title: string;
    data: string[];
  };
  figure?: {
    figureId: string;
    figCaption: string;
  };
}

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: editorialListSectionStyles },
];

export const EditorialListSection: React.FC<EditorialListSectionProps> = ({
  heading = "Methodology",
  variant = "unordered",
  methods = {
    title: "This study employed three main methods:",
    data: [
      "Supervised Algorithms",
      "Deep Neural Networks",
      "Unsupervised Learning",
    ],
  },
  figure = {
    figureId: "1",
    figCaption: "Figure 1. Efficiency comparison among models.",
  },
  ...rest
}) => {
  const Component = variant === "unordered" ? "ul" : "ol";

  return (
    <section className="editorialListSection" {...rest} id="methodology">
      <h2 className="editorialListSection_heading">{heading}</h2>
      <p>{methods.title}</p>
      <Component>
        {methods.data.map((method) => (
          <li key={method}>{method}</li>
        ))}
      </Component>
      {figure ? (
        <figure>
          {figure.figureId}
          {figure.figCaption ? (
            <figcaption>{figure.figCaption}</figcaption>
          ) : (
            <></>
          )}
        </figure>
      ) : (
        <></>
      )}
    </section>
  );
};
