import { LoaderFunctionArgs } from "react-router";

import { LEGACY_DIAGRAM_REDIRECTS } from "~/content/case-studies";

/** Old /work/diagrams/<x> URLs moved to /case-studies (permanent). */
export const loader = ({ params }: LoaderFunctionArgs) => {
  const to = params.diagram && LEGACY_DIAGRAM_REDIRECTS[params.diagram];
  if (!to) throw new Response("Not Found", { status: 404 });
  throw new Response(null, { status: 301, headers: { Location: to } });
};
