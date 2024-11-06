import React from "react";

interface EditorialMethodologySectionProps {
  heading: string;
  variant: "ordered" | "unordered";
  methods: {
    title: string;
    data: string[];
  };
  figure?: {
    figureId: string;
    figCaption: string;
  };
}

export const EditorialMethodologySection: React.FC<
  EditorialMethodologySectionProps
> = ({
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
}) => {
  const Component = variant === "unordered" ? "ul" : "ol";

  return (
    <section id="methodology">
      <h2>{heading}</h2>
      <p>{methods.title}</p>
      <Component>
        {methods.data.map((method) => (
          <li key={method}>{method}</li>
        ))}
      </Component>
      {figure ? (
        <figure>
          {figure.figureId}
          {/* <img src="sample-graph.png" alt="Model Efficiency Graph" width="600"> */}
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
