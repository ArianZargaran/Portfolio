import { redirect } from "react-router";

/** Old URL. /about is opened by the Queen poster in the home-office scene. */
export const loader = () => redirect("/about", { status: 301 });
