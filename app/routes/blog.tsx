import { LinksFunction } from "react-router";

import commonThemePage from "~/stylesheets/common-page-themes.css?url";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: commonThemePage },
];

const BlogPage = () => {
  return <section className="page blog"></section>;
};

export default BlogPage;
