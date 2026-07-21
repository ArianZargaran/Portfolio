import React from "react";

export const ArchitectureDataFlowDiagram: React.FC = () => (
  <React.Fragment>
    <p className="work-diagram_eyebrow">Airtable · Brandkit design system</p>
    <h1>A convention, wired end to end</h1>
    <p className="work-diagram_thesis">
      Not just a shared language — a <b>framework</b>. Atomic design is the
      spine, shared identically across Figma, Contentful, and code, with{" "}
      <b>Templates as the hinge</b>. Pages render statically at build, data
      flowing top-down into pure components.
    </p>

    <div className="work-diagram_card">
      <div className="work-diagram_step">
        <b>1</b> One framework — atomic design, shared by every tool
      </div>
      <h2>Templates are the hinge</h2>
      <p className="work-diagram_sub">
        The same six layers organize the design files, the content models,
        and the codebase. Templates sit at the center of all three.
      </p>
      <div className="work-diagram_stack">
        <div className="work-diagram_layer">
          <span className="work-diagram_lv">page</span>
          <span className="work-diagram_nm">Page</span>
          <span className="work-diagram_ds">
            a URL · one Contentful entry
          </span>
        </div>
        <div className="work-diagram_layer work-diagram_hinge">
          <span className="work-diagram_lv">template</span>
          <span className="work-diagram_nm">Template</span>
          <span className="work-diagram_ds">
            ◆ the hinge — Figma · Contentful · code
          </span>
        </div>
        <div className="work-diagram_layer">
          <span className="work-diagram_lv">organism</span>
          <span className="work-diagram_nm">Organisms</span>
          <span className="work-diagram_ds">
            sections · dummy, wrapped by an HOC
          </span>
        </div>
        <div className="work-diagram_layer">
          <span className="work-diagram_lv">molecule</span>
          <span className="work-diagram_nm">Molecules</span>
          <span className="work-diagram_ds">pure DS components</span>
        </div>
        <div className="work-diagram_layer">
          <span className="work-diagram_lv">atom</span>
          <span className="work-diagram_nm">Atoms</span>
          <span className="work-diagram_ds">pure DS components</span>
        </div>
        <div className="work-diagram_layer work-diagram_quark">
          <span className="work-diagram_lv">quark</span>
          <span className="work-diagram_nm">Quarks / tokens</span>
          <span className="work-diagram_ds">
            ← semantic theming lives here
          </span>
        </div>
      </div>
      <div className="work-diagram_tools">
        <span className="work-diagram_tool">
          <span
            className="work-diagram_dot"
            style={{ background: "var(--wd-figma)" }}
          />
          Figma
        </span>
        <span className="work-diagram_tool">
          <span
            className="work-diagram_dot"
            style={{ background: "var(--wd-contentful)" }}
          />
          Contentful
        </span>
        <span className="work-diagram_tool">
          <span
            className="work-diagram_dot"
            style={{ background: "var(--wd-code-tool)" }}
          />
          Codebase
        </span>
      </div>
      <p className="work-diagram_note">
        Same names, same layers, everywhere — so{" "}
        <b>design, content, and engineering share one framework.</b>
      </p>
    </div>

    <div className="work-diagram_card">
      <div className="work-diagram_step">
        <b>2</b> How a page renders — statically, at build
      </div>
      <h2>
        Data flows top-down into pure components
        <span className="work-diagram_tag">SSG</span>
      </h2>
      <p className="work-diagram_sub">
        One fetch at the top. Containers inject data. Presentational
        components stay dumb.
      </p>
      <div className="work-diagram_flow">
        <div className="work-diagram_fstep">
          <div className="work-diagram_rail">
            <div className="work-diagram_num">1</div>
            <div className="work-diagram_fline" />
          </div>
          <div className="work-diagram_fbody">
            <div className="work-diagram_ft">
              A URL maps to a Contentful <code>Page</code>
            </div>
            <div className="work-diagram_fd">
              Every Page model has a <code>slug</code>. The Page is a{" "}
              <b>Template</b> type.
            </div>
          </div>
        </div>
        <div className="work-diagram_fstep">
          <div className="work-diagram_rail">
            <div className="work-diagram_num">2</div>
            <div className="work-diagram_fline" />
          </div>
          <div className="work-diagram_fbody">
            <div className="work-diagram_ft">
              Next.js fetches it by slug — at build{" "}
              <span className="work-diagram_tag">SSG</span>
            </div>
            <div className="work-diagram_fd">
              The page template makes <b>all</b> the backend calls at the
              top level. Static output → fast marketing pages.
            </div>
          </div>
        </div>
        <div className="work-diagram_fstep">
          <div className="work-diagram_rail">
            <div className="work-diagram_num">3</div>
            <div className="work-diagram_fline" />
          </div>
          <div className="work-diagram_fbody">
            <div className="work-diagram_ft">
              Each organism is wrapped by a Higher-Order Component
            </div>
            <div className="work-diagram_fd">
              The HOC massages the top-level data and hands each section
              exactly what it needs — the container layer.
            </div>
          </div>
        </div>
        <div className="work-diagram_fstep">
          <div className="work-diagram_rail">
            <div className="work-diagram_num">4</div>
          </div>
          <div className="work-diagram_fbody">
            <div className="work-diagram_ft">Dummy DS components render</div>
            <div className="work-diagram_fd">
              Organisms → molecules → atoms, all <b>pure and
              presentational</b>, straight from the design system. They
              render tokens via <code>var()</code> — theme-agnostic.
            </div>
          </div>
        </div>
      </div>
    </div>

    <footer className="work-diagram_footer">
      Architecture &amp; data flow · Airtable Brandkit · Arian Zargaran
    </footer>
  </React.Fragment>
);
