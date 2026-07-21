import { redirect } from "@remix-run/node";

/**
 * The page lives at /work now ("Projects" stopped representing what the page
 * is). This route only exists so previously shared /projects links keep
 * resolving; permanent redirect so crawlers update their index too.
 */
export const loader = () => redirect("/work", { status: 301 });
