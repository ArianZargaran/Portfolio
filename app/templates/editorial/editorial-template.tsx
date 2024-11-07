import React from "react";

import { EditorialBlockSection } from "./block/editorial-block-section";
import { EditorialFooterSection } from "./footer/editorial-footer-section";
import { EditorialHeader } from "./header/editorial-header";
import { EditorialIntroductionSection } from "./introduction/editorial-introduction-section";
import { EditorialLinksSection } from "./links/editorial-links-section";
import { EditorialListSection } from "./list/editorial-list-section";
import { EditorialTableSection } from "./table/editorial-table-section";

interface EditorialTemplateProps {
  entry: {
    sections: {
      id?: string;
      type:
        | "editorial-header"
        | "editorial-abstract-section"
        | "editorial-intro-section"
        | "editorial-list-section"
        | "editorial-links-section"
        | "editorial-footer-section"
        | "editorial-table-section";
    }[];
  };
}

export const EditorialTemplate: React.FC<EditorialTemplateProps> = ({
  entry,
}) => {
  return (
    <>
      {entry.sections.map((section) => {
        switch (section.type) {
          case "editorial-header":
            return <EditorialHeader key={section.id} />;
          case "editorial-abstract-section":
            return <EditorialBlockSection key={section.id} />;
          case "editorial-intro-section":
            return <EditorialIntroductionSection key={section.id} />;
          case "editorial-list-section":
            return <EditorialListSection key={section.id} />;
          case "editorial-table-section":
            return <EditorialTableSection key={section.id} />;
          case "editorial-links-section":
            return <EditorialLinksSection key={section.id} />;
          case "editorial-footer-section":
            return <EditorialFooterSection key={section.id} />;
          default:
            return <></>;
        }
      })}
    </>
  );
};
