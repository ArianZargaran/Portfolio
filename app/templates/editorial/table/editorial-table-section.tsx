import React, { DetailedHTMLProps, HTMLAttributes } from "react";

interface EditorialTablePropsSection
  extends DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> {
  headline?: string;
  intro?: string;
  table?: {
    caption: string;
    header: string[];
    rows: string[][];
  };
}

export const EditorialTableSection: React.FC<EditorialTablePropsSection> = ({
  id = "results",
  headline = "Results",
  intro = `<p>The results indicate a significant improvement in model accuracy when optimized <dfn title="Artificial Intelligence">AI</dfn> data is used.</p>`,
  table = {
    caption: "Table 1. Efficiency Comparison across Models",
    header: ["Model", "Accuracy", "Processing Time"],
    rows: [
      ["Model A", "85%", "30ms"],
      ["Model B", "90%", "25ms"],
      ["Model C", "92%", "20ms"],
    ],
  },
  ...rest
}) => {
  return (
    <section id={id} {...rest}>
      <h2>{headline}</h2>
      {intro}
      <table>
        <caption>{table.caption}</caption>
        <thead>
          <tr>
            {table.header.map((entryHeader) => (
              <th key={entryHeader}>{entryHeader}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => {
            return (
              <tr key={row[0]}>
                {row.map((el) => (
                  <td key={el}>{el}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
};
