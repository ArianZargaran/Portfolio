import parse from "html-react-parser";
import React from "react";

interface EditorialAbstractSectionProps {
  id: string;
  heading: string;
  abstract: string;
}

export const EditorialAbstractSection: React.FC<
  EditorialAbstractSectionProps
> = ({
  id = "abstract",
  heading = "Abstract",
  abstract = "<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. <em>Integer mollis orci eu dui volutpat</em>, at tempus libero fringilla. Nullam non sagittis odio. Fusce gravida, ex et elementum gravida, lectus nisl iaculis erat, sit amet fermentum quam lorem non magna. <strong>Morbi ut purus ex</strong>.</p>",
}) => {
  return (
    <section id={id}>
      <h2>{heading}</h2>
      {/* <p>{abstract}</p> */}
      {parse(abstract)}
    </section>
  );
};
