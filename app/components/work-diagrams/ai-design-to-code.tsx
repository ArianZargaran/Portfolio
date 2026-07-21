import React from "react";

export const AiDesignToCodeDiagram: React.FC = () => (
  <React.Fragment>
    <p className="work-diagram_eyebrow">Freshworks · AI-first design system</p>
    <h1>Structure over agents</h1>
    <p className="work-diagram_thesis">
      Design→code has a <b>right answer</b>, so it shouldn&apos;t be
      improvised. The intelligence goes in the <b>rules and structure</b>,
      not the agent. Structured Figma + written rules + MCP tools →
      components built <b>in one shot.</b>
    </p>

    <div className="work-diagram_flow">
      <div className="work-diagram_stage">
        <div className="work-diagram_rail">
          <div className="work-diagram_num">1</div>
          <div className="work-diagram_stagelink" />
        </div>
        <div className="work-diagram_stagebody">
          <span className="work-diagram_k">Source · the structure</span>
          <h2>Figma, made machine-legible</h2>
          <p>
            Figma is the source of truth. Every component lives in three
            ID-addressable frames:
          </p>
          <div className="work-diagram_frames">
            <div className="work-diagram_frame">
              <div className="work-diagram_ft">Specs</div>
              <div className="work-diagram_fd">
                docs, patterns, procedures, the build philosophy
              </div>
            </div>
            <div className="work-diagram_frame">
              <div className="work-diagram_ft">Breakpoints</div>
              <div className="work-diagram_fd">
                the component rendered across all 4 client sizes
              </div>
            </div>
            <div className="work-diagram_frame">
              <div className="work-diagram_ft">Usage</div>
              <div className="work-diagram_fd">
                scenarios, edge cases, expected behavior
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="work-diagram_stage">
        <div className="work-diagram_rail">
          <div className="work-diagram_num">2</div>
          <div className="work-diagram_stagelink" />
        </div>
        <div className="work-diagram_stagebody">
          <span className="work-diagram_k">
            Context · where the intelligence lives
          </span>
          <h2>Written rules, not a free agent</h2>
          <p>
            <b>agents.md</b> — the AI-first foundation, co-authored with the
            codebase&apos;s original founders. Plus <b>Cursor rules</b> I
            wrote, specific to the design system. This is the deterministic
            core.
          </p>
        </div>
      </div>

      <div className="work-diagram_stage">
        <div className="work-diagram_rail">
          <div className="work-diagram_num">3</div>
          <div className="work-diagram_stagelink" />
        </div>
        <div className="work-diagram_stagebody">
          <span className="work-diagram_k">
            Tools · reads design, verifies output
          </span>
          <h2>Driven by MCP</h2>
          <p>
            Cursor executes within the rules, using MCP servers to see the
            design and check the result:
          </p>
          <div className="work-diagram_badges">
            <span className="work-diagram_badge">Cursor</span>
            <span className="work-diagram_badge work-diagram_mcp">
              Figma MCP · remote + local
            </span>
            <span className="work-diagram_badge work-diagram_mcp">
              Browser MCP
            </span>
          </div>
        </div>
      </div>

      <div className="work-diagram_stage">
        <div className="work-diagram_rail">
          <div className="work-diagram_num">4</div>
        </div>
        <div className="work-diagram_stagebody work-diagram_win">
          <span className="work-diagram_k">Outcome</span>
          <h2>One shot</h2>
          <p>
            Components generate correctly in a single pass —{" "}
            <b>because</b> the context is structured and the rules are
            written. It generalizes: a{" "}
            <b>token update is just an instruction</b>. All
            version-controlled, starting in Figma.
          </p>
          <span className="work-diagram_oneshot">✓ built in one shot</span>
        </div>
      </div>
    </div>

    <div className="work-diagram_philosophy">
      <p className="work-diagram_q">
        &quot;Put the intelligence in the rules, not the agent.&quot;
      </p>
      <p>
        For a deterministic outcome, reliability comes from constraining the
        problem — not from turning a model loose. Agents earn their place in
        open-ended work; a design→code transform wants rails.
      </p>
    </div>

    <footer className="work-diagram_footer">
      AI design-to-code · Freshworks · MCP-driven · Arian Zargaran
    </footer>
  </React.Fragment>
);
