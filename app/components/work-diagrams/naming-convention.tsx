import React from "react";

export const NamingConventionDiagram: React.FC = () => (
  <React.Fragment>
    <p className="work-diagram_eyebrow">Airtable · Brandkit design system</p>
    <h1>One name, three tools</h1>
    <p className="work-diagram_thesis">
      A single naming convention wired <b>Figma, Contentful, and the
      codebase</b> together. More than a shared language, it became a{" "}
      <b>framework that shifted how everyone thought</b> — design, content,
      and engineering all reasoned the same way, no matter their domain.
    </p>

    <div className="work-diagram_spine">
      <div className="work-diagram_lbl">
        The through-line — one name, everywhere
      </div>
      <span className="work-diagram_name">hero-media-centered</span>
      <div className="work-diagram_note">
        A variant of the <b>Hero</b> organism. The <em>same string</em> is
        the source of truth in all three tools.
      </div>
    </div>

    <div className="work-diagram_flowlbl">
      <span>design</span>
      <span className="work-diagram_arrow">→</span>
      <span>content</span>
      <span className="work-diagram_arrow">→</span>
      <span>code</span>
    </div>

    <div className="work-diagram_lanes">
      <div className="work-diagram_lane work-diagram_figma">
        <div className="work-diagram_lane-h">
          <span className="work-diagram_dot" />
          <span className="work-diagram_t">Figma</span>
        </div>
        <div className="work-diagram_role">Designers — the visual source</div>
        <div className="work-diagram_mini">
          <span className="work-diagram_k">Organisms</span> / Hero
          <br />
          &nbsp;&nbsp;├ hero-media-left
          <br />
          &nbsp;&nbsp;├{" "}
          <span className="work-diagram_hl">hero-media-centered</span>
          <br />
          &nbsp;&nbsp;└ hero-split
        </div>
        <span className="work-diagram_atomic">Atomic: organism</span>
      </div>

      <div className="work-diagram_lane work-diagram_content">
        <div className="work-diagram_lane-h">
          <span className="work-diagram_dot" />
          <span className="work-diagram_t">Contentful</span>
        </div>
        <div className="work-diagram_role">
          Producers — the content model
        </div>
        <div className="work-diagram_mini">
          <span className="work-diagram_k">Hero</span> content model
          <br />
          &nbsp;&nbsp;<span className="work-diagram_muted">field</span>{" "}
          variant:
          <br />
          &nbsp;&nbsp;&nbsp;&nbsp;
          <span className="work-diagram_hl">
            &quot;hero-media-centered&quot;
          </span>
          <br />
          &nbsp;&nbsp;<span className="work-diagram_muted">field</span>{" "}
          heading, media…
        </div>
        <span className="work-diagram_atomic">Editorial governance</span>
      </div>

      <div className="work-diagram_lane work-diagram_code">
        <div className="work-diagram_lane-h">
          <span className="work-diagram_dot" />
          <span className="work-diagram_t">Codebase</span>
        </div>
        <div className="work-diagram_role">Engineers — the render</div>
        <div className="work-diagram_mini">
          &lt;<span className="work-diagram_k">Hero</span>
          <br />
          &nbsp;&nbsp;variant=
          <span className="work-diagram_hl">
            &quot;hero-media-centered&quot;
          </span>
          <br />
          &nbsp;&nbsp;{"{...fields}"}
          <br />
          /&gt;
        </div>
        <span className="work-diagram_atomic">Same variant, 1:1</span>
      </div>
    </div>

    <div className="work-diagram_payoff">
      <h2>What one shared framework unlocked</h2>
      <p className="work-diagram_sub">
        When Figma, Contentful, and code all say the same name, it stops
        being a naming rule and becomes a shared mindset — everyone,
        regardless of domain, reasons about the site the same way.
      </p>
      <div className="work-diagram_grid4">
        <div className="work-diagram_p">
          <div className="work-diagram_h">Locate instantly</div>
          <div className="work-diagram_d">
            Any component is findable across all three tools by one name.
          </div>
        </div>
        <div className="work-diagram_p">
          <div className="work-diagram_h">One vocabulary</div>
          <div className="work-diagram_d">
            Design, content, and eng discuss the exact same thing, the same
            way.
          </div>
        </div>
        <div className="work-diagram_p">
          <div className="work-diagram_h">Traceable change</div>
          <div className="work-diagram_d">
            A tweak in Figma has an obvious home in content and code.
          </div>
        </div>
        <div className="work-diagram_p">
          <div className="work-diagram_h">Producers self-serve</div>
          <div className="work-diagram_d">
            Pick a variant in Contentful → the right component renders. No
            dev.
          </div>
        </div>
        <div className="work-diagram_p">
          <div className="work-diagram_h">Ramp fast</div>
          <div className="work-diagram_d">
            New hires and contractors onboard onto one framework, not three
            paradigms.
          </div>
        </div>
        <div className="work-diagram_p">
          <div className="work-diagram_h">Fix with confidence</div>
          <div className="work-diagram_d">
            Issues are locatable — the structure just makes sense.
          </div>
        </div>
        <div className="work-diagram_p">
          <div className="work-diagram_h">Work in parallel</div>
          <div className="work-diagram_d">
            The name is the contract between domains, so they move without
            constant sync.
          </div>
        </div>
        <div className="work-diagram_p">
          <div className="work-diagram_h">Scales without drift</div>
          <div className="work-diagram_d">
            Consistency by construction — no more ten-buttons sprawl.
          </div>
        </div>
      </div>
    </div>

    <footer className="work-diagram_footer">
      Naming convention · Airtable Brandkit · Arian Zargaran
    </footer>
  </React.Fragment>
);
