import React, { DetailedHTMLProps, HTMLAttributes } from "react";

interface EditorialFooterSection
  extends DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> {
  children?: string;
}

export const EditorialFooterSection: React.FC<EditorialFooterSection> = ({
  children = `<p>&copy; 2024 Example University. All rights reserved.</p>`,
  ...rest
}) => {
  return <footer {...rest}>{children}</footer>;
};
