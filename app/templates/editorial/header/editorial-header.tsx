import { LinksFunction } from "@remix-run/node";
import React, { DetailedHTMLProps, HTMLAttributes } from "react";

import editorialHeaderStyles from "./editorial-header-styles.css";

interface EditorialHeaderProps
  extends DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> {
  heading: string;
  data: {
    highlighted: string;
    data: string | string[];
  }[];
  authors: string[];
  institution: string;
  publicationDate: string;
}

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: editorialHeaderStyles },
];

export const EditorialHeader: React.FC<EditorialHeaderProps> = ({
  heading = "Analysis of Artificial Intelligence Model Efficiency in Real-Time Applications",
  data = [
    {
      highlighted: "Authors:",
      data: ["Dr. John Doe, Dr. Jane Smith"],
    },
    {
      highlighted: "Institution:",
      data: "Example University",
    },
    {
      highlighted: "Publication Date:",
      data: "November 2024",
    },
  ],
  ...rest
}) => {
  return (
    <header {...rest} className="editorialHeader">
      <h1 className="editorialHeader_heading">{heading}</h1>
      {data.map((info) => {
        return (
          <p key={info.highlighted}>
            <strong className="editorialHeader_remembrance">
              {info.highlighted}
            </strong>{" "}
            <ul>
              {Array.isArray(info.data)
                ? info.data.map((author) => <li key={author}>{author}</li>)
                : info.data}
            </ul>
          </p>
        );
      })}
    </header>
  );
};
