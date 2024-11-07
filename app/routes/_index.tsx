import type { MetaFunction } from "@remix-run/node";

import { EditorialTemplate } from "~/templates/editorial/editorial-template";

export const meta: MetaFunction = () => [{ title: "Remix Notes" }];

export default function Index() {
  return (
    <EditorialTemplate
      entry={{
        sections: [
          { type: "editorial-header" },
          { type: "editorial-abstract-section" },
          { type: "editorial-intro-section" },
          { type: "editorial-list-section" },
          { type: "editorial-links-section" },
          { type: "editorial-footer-section" },
          { type: "editorial-table-section" },
        ],
      }}
    />
  );
}
