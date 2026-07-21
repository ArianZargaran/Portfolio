import { cssBundleHref } from "@remix-run/css-bundle";
import { LinksFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";

import { BlurryBackground } from "~/components/backgrounds/blurry-circles/blurry-circles";
import { Doodles } from "~/components/backgrounds/doodles/doodles";
import { Noise } from "~/components/backgrounds/noise/noise";
import { Download } from "~/components/icons/download";
import { Isotype } from "~/components/icons/isotype/isotype";
import Button from "~/components/interactive-elements/button/button";
import { SocialNav } from "~/components/social-nav/social-nav";
import commonThemePage from "~/stylesheets/common-page-themes.css";
import homeStyles from "~/stylesheets/home.css";

export const links: LinksFunction = () => [
  ...(cssBundleHref ? [{ rel: "stylesheet", href: cssBundleHref }] : []),
  { rel: "stylesheet", href: commonThemePage },
  { rel: "stylesheet", href: homeStyles },
];

const IndexPage = () => {
  return (
    <section className="page home-page">
      <BlurryBackground className="home-background" />
      <Doodles className="home-background" />
      <Noise />
      <SocialNav className="home-social" />
      <div className="home-content_container">
        <Isotype
          className="home-content_isotype home-fade-final"
          height={72}
          width={72}
        />
        <h1 className="home-content_headline home-fade-up">
          Hi, this is{" "}
          <strong className="home-content_upsell">Arian Zargaran</strong>.
        </h1>
        <h2 className="home-content_subheadline home-fade-up-delay-1">
          Welcome to my site!
        </h2>
        <div className="home-cta-wrapper home-fade-up-delay-2">
          <Link to="/work">
            <Button>My Work</Button>
          </Link>
          <Link
            to="/arian-zargaran-resume.pdf"
            target="_blank"
            rel="noopener noreferrer"
            download="/arian-zargaran-resume.pdf"
          >
            <Button variant="secondary">
              Resume <Download height={16} width={16} />
            </Button>
          </Link>
        </div>
      </div>
      <p className="home-footer-note">* Authors: 1.85% AI; 98.15% Ari</p>
    </section>
  );
};

export default IndexPage;
