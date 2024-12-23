import type { MetaFunction } from "@remix-run/node";

import { EditorialTemplate } from "~/templates/editorial/editorial-template";

export const meta: MetaFunction = () => [{ title: "Remix Notes" }];

export default function Editorial() {
  return (
    <>
      <EditorialTemplate
        entry={{
          sections: [
            { type: "editorial-header", id: "header" },
            { type: "editorial-abstract-section", id: "abstract" },
            { type: "editorial-intro-section", id: "intro" },
            { type: "editorial-list-section", id: "list" },
            { type: "editorial-links-section", id: "links" },
            { type: "editorial-footer-section", id: "footer" },
            { type: "editorial-table-section", id: "table" },
          ],
        }}
      />
    </>
  );
}
