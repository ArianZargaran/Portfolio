import React from "react";

interface EditorialFooterSection {
  children: string;
}

export const EditorialFooterSection: React.FC<EditorialFooterSection> = ({
  children = `<p>&copy; 2024 Example University. All rights reserved.</p>`,
}) => {
  return <footer>{children}</footer>;
};
