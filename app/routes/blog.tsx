import { redirect } from "react-router";

/** /blog was an empty page; the notebook now lives at /articles. */
export const loader = () => redirect("/articles", { status: 301 });
