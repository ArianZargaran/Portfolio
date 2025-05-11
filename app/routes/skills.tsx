import { cssBundleHref } from "@remix-run/css-bundle";
import { LinksFunction } from "@remix-run/node";
import { ChangeEvent, useCallback, useState } from "react";

import { Isotype } from "~/components/icons/isotype/isotype";
import { Magnifier } from "~/components/icons/magnifier/magnifier";
import commonThemePage from "~/stylesheets/common-page-themes.css";
import skills from "~/stylesheets/skills.css";

export const links: LinksFunction = () => [
  ...(cssBundleHref ? [{ rel: "stylesheet", href: cssBundleHref }] : []),
  { rel: "stylesheet", href: commonThemePage },
  { rel: "stylesheet", href: skills },
];

const SkillsPage = () => {
  const [value, setValue] = useState<string>("");

  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setValue(event.target.value);
  }, []);

  return (
    <section className="page skills skills-page">
      <header className="header">
        <div className="logo-container">
          <Isotype width={96} height="auto" />
          <h1>Skills</h1>
        </div>
        <div className="search-box">
          <Magnifier width={16} height="auto" />
          <input
            placeholder="Ask me something"
            className="search-input"
            value={value}
            onChange={handleChange}
          />
          <span className="search-hint">1 result</span>
        </div>
      </header>
    </section>
  );
};

export default SkillsPage;
