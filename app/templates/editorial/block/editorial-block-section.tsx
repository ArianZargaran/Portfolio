import { LinksFunction } from "@remix-run/node";
import parse from "html-react-parser";
import React, { DetailedHTMLProps, HTMLAttributes } from "react";

import editorialBlockSectionStyles from "./editorial-block-section.css";

interface EditoriaBlockSectionProps
  extends DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> {
  heading?: string;
  abstract?: string;
}

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: editorialBlockSectionStyles },
];

export const EditorialBlockSection: React.FC<EditoriaBlockSectionProps> = ({
  id = "abstract",
  heading = "Abstract",
  abstract = "<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. <em>Integer mollis orci eu dui volutpat</em>, at tempus libero fringilla. Nullam non sagittis odio. Fusce gravida, ex et elementum gravida, lectus nisl iaculis erat, sit amet fermentum quam lorem non magna. <strong>Morbi ut purus ex</strong>.</p>",
  ...rest
}) => {
  return (
    <section id={id} {...rest}>
      <h2>{heading}</h2>
      {parse(abstract)}
    </section>
  );
};
