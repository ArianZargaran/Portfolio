import React from "react";

interface EditorialHeaderProps {
  heading: string;
  data: {
    highlighted: string;
    data: string | string[];
  }[];
  authors: string[];
  institution: string;
  publicationDate: string;
}

export const EditorialHeader: React.FC<EditorialHeaderProps> = ({
  heading = "Analysis of Artificial Intelligence Model Efficiency in Real-Time Applications",
  data = [{
    highlighted: "Authors:",
    data: ["Dr. John Doe, Dr. Jane Smith"]
  },
  {
    highlighted: "Institution:",
    data: "Example University"
  },
  {
    highlighted: "Publication Date:",
    data: "November 2024"
  }]
}) => {
  return (
    <header>
      <h1>{heading}</h1>
      {data.map(info => {
        return (
        <p key={info.highlighted}>
          <strong>{info.highlighted}</strong>{" "}
          <ul>
            {Array.isArray(info.data) ? info.data.map(author => <li key={author}>{author}</li>) : info.data}
          </ul>
        </p>)
      })}
    </header>
  )
} 