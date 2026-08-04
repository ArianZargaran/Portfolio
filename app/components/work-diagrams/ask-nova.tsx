export const AskNovaRef = () => (
  <div style={{ maxWidth: "960px", margin: "0 auto", padding: "clamp(1.2rem, 4vw, 2.6rem)" }}>
    <style>{`
      :root {
        --bg: #f6f7f9;
        --surface: #fff;
        --surface-2: #eef1f5;
        --ink: #14181f;
        --ink-soft: #55606f;
        --ink-faint: #8a94a3;
        --line: #e0e5ec;
        --line-strong: #cdd4de;
        --accent: #5850ec;
        --accent-soft: #eeedfd;
        --code-bg: #f1f3f7;
        --code-ink: #2a3140;
        --ok: #16a34a;
        --ok-soft: #dcefe0;
        --guard: #c2410c;
        --guard-soft: #fbe6d9;
        --mono: ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace;
        --sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      }

      @media (prefers-color-scheme: dark) {
        :root {
          --bg: #0f1319;
          --surface: #161b23;
          --surface-2: #1d232d;
          --ink: #eef2f7;
          --ink-soft: #a7b1c0;
          --ink-faint: #6f7987;
          --line: #28303b;
          --line-strong: #3a4451;
          --accent: #8b85ff;
          --accent-soft: #232041;
          --code-bg: #0c1016;
          --code-ink: #cfd6e0;
          --ok: #4ade80;
          --ok-soft: #132a1a;
          --guard: #f0834a;
          --guard-soft: #331c10;
        }
      }

      .eyebrow {
        font-family: var(--mono);
        font-size: 0.72rem;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: var(--accent);
        margin: 0 0 0.6rem;
      }

      h1 {
        font-size: clamp(1.8rem, 4vw, 2.6rem);
        letter-spacing: -0.025em;
        margin: 0 0 1rem;
        line-height: 1.05;
      }

      .thesis {
        font-size: 1.05rem;
        color: var(--ink-soft);
        max-width: 66ch;
        margin: 0 0 2rem;
        line-height: 1.5;
      }

      .thesis b {
        color: var(--ink);
        font-weight: 620;
      }

      h2 {
        font-size: 1.3rem;
        letter-spacing: -0.015em;
        margin: 2.2rem 0 1rem;
        line-height: 1.1;
        color: var(--ink);
      }

      h3 {
        font-family: var(--mono);
        font-size: 0.72rem;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: var(--ink-faint);
        margin: 1.8rem 0 0.8rem;
      }

      p {
        margin: 0 0 1rem;
        color: var(--ink-soft);
        max-width: 72ch;
      }

      p b {
        color: var(--ink);
      }

      code {
        font-family: var(--mono);
        font-size: 0.86em;
        background: var(--code-bg);
        color: var(--code-ink);
        border-radius: 5px;
        padding: 0.1em 0.35em;
      }

      .block {
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 12px;
        padding: 1.2rem;
        margin-bottom: 1.2rem;
      }

      .block-label {
        font-family: var(--mono);
        font-size: 0.68rem;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--ink-faint);
      }

      .block h4 {
        margin: 0;
        font-size: 1rem;
        font-weight: 620;
        color: var(--ink);
      }

      .block p {
        margin: 0.5rem 0 0;
        font-size: 0.9rem;
      }

      .pipeline {
        display: flex;
        flex-wrap: wrap;
        gap: 0.45rem;
        align-items: center;
        margin: 1rem 0;
      }

      .node {
        background: var(--surface);
        border: 1px solid var(--line-strong);
        border-radius: 8px;
        padding: 0.45rem 0.7rem;
      }

      .node-title {
        font-weight: 640;
        font-size: 0.82rem;
      }

      .node-desc {
        font-family: var(--mono);
        font-size: 0.65rem;
        color: var(--ink-faint);
        margin-top: 0.1rem;
      }

      .node.model {
        border-color: var(--accent);
        background: var(--accent-soft);
      }

      .node.model .node-title {
        color: var(--accent);
      }

      .arrow {
        font-family: var(--mono);
        color: var(--ink-faint);
        font-size: 0.75rem;
      }

      .concept-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 1rem;
        margin: 1.2rem 0;
      }

      .concept-card {
        background: var(--surface-2);
        border: 1px solid var(--line);
        border-radius: 10px;
        padding: 0.9rem 1rem;
      }

      .concept-card h4 {
        margin: 0 0 0.4rem;
        font-size: 0.95rem;
        font-weight: 620;
        color: var(--ink);
      }

      .concept-card p {
        margin: 0;
        font-size: 0.84rem;
      }

      .stack-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 0.6rem;
        margin: 1.2rem 0;
      }

      .badge {
        font-family: var(--mono);
        font-size: 0.75rem;
        font-weight: 600;
        padding: 0.4em 0.8em;
        border-radius: 7px;
        border: 1px solid var(--line-strong);
        color: var(--ink-soft);
        background: var(--surface-2);
      }

      .badge.hot {
        border-color: var(--accent);
        color: var(--accent);
        background: var(--accent-soft);
      }

      .guardrail {
        background: var(--guard-soft);
        border: 1px solid var(--guard);
        border-radius: 12px;
        padding: 1.2rem;
        margin: 1.4rem 0;
      }

      .guardrail h4 {
        margin: 0 0 0.4rem;
        color: var(--ink);
        font-size: 1rem;
        font-weight: 620;
      }

      .guardrail p {
        margin: 0.3rem 0 0;
        font-size: 0.9rem;
      }

      .decision-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 1rem;
        margin: 1.2rem 0;
      }

      .decision-card {
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 10px;
        padding: 1rem 1.2rem;
      }

      .decision-card .label {
        font-family: var(--mono);
        font-size: 0.68rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--accent);
        margin-bottom: 0.3rem;
      }

      .decision-card h4 {
        margin: 0 0 0.5rem;
        font-size: 1rem;
        font-weight: 620;
        color: var(--ink);
      }

      .decision-card p {
        margin: 0;
        font-size: 0.85rem;
      }

      .divider {
        height: 1px;
        background: var(--line);
        margin: 2rem 0;
      }

      ol {
        color: var(--ink-soft);
        line-height: 1.8;
      }

      footer {
        margin-top: 1.4rem;
        font-family: var(--mono);
        font-size: 0.72rem;
        color: var(--ink-faint);
        text-align: center;
      }

      a {
        color: var(--accent);
        text-decoration: none;
      }

      a:hover {
        text-decoration: underline;
      }
    `}</style>

    <div className="header">
      <p className="eyebrow">AI Mode · Embedded Assistant · Reference</p>
      <h1>Ask Nova — Design & Architecture</h1>
      <p className="thesis">
        A production-shaped embedded assistant that treats reliability as <b>architecture</b>: deterministic answers where they must be exact, retrieval-grounded generation where they can't be, and guardrails that move policy into code. This reference explains the approach, the pipeline, and the design decisions that make it work.
      </p>
    </div>

    <h2>Core Principle</h2>
    <p>
      <b>"Exact things stay exact. Generated things stay grounded. Sensitive things stay human."</b>
    </p>
    <p>
      The system divides problems into three categories and treats each differently:
    </p>
    <div className="concept-grid">
      <div className="concept-card">
        <h4>Exact</h4>
        <p>High-traffic, deterministic intents like "summarize this page" are pre-computed per route and streamed from cache. Zero latency, always on-message.</p>
      </div>
      <div className="concept-card">
        <h4>Grounded</h4>
        <p>Knowledge questions go through retrieval-augmented generation with real citations, reranking, and a confidence threshold. The answer is only as good as the docs.</p>
      </div>
      <div className="concept-card">
        <h4>Sensitive</h4>
        <p>Pricing, sales, billing — structurally unreachable. Intercepted at query time and absent from the vector index so the model can't invent an answer.</p>
      </div>
    </div>

    <div className="divider" />

    <h2>The Pipeline</h2>
    <p>Ask Nova's retrieval follows a two-stage recall → rerank pattern:</p>

    <div className="pipeline">
      <div className="node">
        <div className="node-title">Docs</div>
        <div className="node-desc">markdown corpus</div>
      </div>
      <span className="arrow">→</span>
      <div className="node">
        <div className="node-title">Chunk</div>
        <div className="node-desc">heading-aware, ~900ch</div>
      </div>
      <span className="arrow">→</span>
      <div className="node">
        <div className="node-title">Embed</div>
        <div className="node-desc">Voyage 3-lite</div>
      </div>
      <span className="arrow">→</span>
      <div className="node">
        <div className="node-title">Index</div>
        <div className="node-desc">pgvector or file</div>
      </div>
      <span className="arrow">→</span>
      <div className="node">
        <div className="node-title">Recall</div>
        <div className="node-desc">cosine, top-12</div>
      </div>
      <span className="arrow">→</span>
      <div className="node">
        <div className="node-title">Rerank</div>
        <div className="node-desc">rerank-2-lite, top-4</div>
      </div>
      <span className="arrow">→</span>
      <div className="node model">
        <div className="node-title">Generate</div>
        <div className="node-desc">Claude Sonnet, SSE</div>
      </div>
    </div>

    <p>
      <b>Recall (cosine similarity)</b> retrieves 12 candidates. Low recall budget is intentional — the cost of a high-recall-low-precision search is hallucination later on. <b>Rerank (Voyage's rerank-2-lite)</b> uses a cross-encoder to re-score the top 12 and return top 4, filtering noise. The rerank score gates the UI: ≥0.5 shows an answer, &lt;0.5 falls back to a contact-sales card.
    </p>

    <p>
      Follow-up questions are <b>rewritten into standalone queries</b> by Claude Haiku before retrieval, so multi-turn works without expensive context windows. The rewrite also exposes intent for secondary guardrails (e.g., "what would that set me back?" becomes "what is the pricing?" before hitting the gate).
    </p>

    <h3>Storage: Postgres + pgvector or Local File</h3>
    <p>
      The vector index is <b>one interface, two backends</b>. When <code>DATABASE_URL</code> is set, it uses Postgres + pgvector (production pattern, shared across instances). Without it, a file-based in-memory index runs on Vercel. The live demo uses the file backend. Wiring in a free Neon/Supabase Postgres is one env var, zero code changes.
    </p>

    <p>
      Ingestion is <b>hash-incremental</b>: the system hashes each chunk, compares to the index, and only embeds/reranks deltas. A full re-index of the demo docs takes ~200ms. No external cache layers needed.
    </p>

    <div className="divider" />

    <h2>Design Decisions</h2>

    <div className="decision-grid">
      <div className="decision-card">
        <div className="label">Caching</div>
        <h4>Summaries are canned per-route</h4>
        <p>
          High-traffic intents like "summarize" don't hit the model. They're pre-computed and associated with each page's route slug, then streamed as if live. Instant, always on-brand, zero model cost.
        </p>
      </div>

      <div className="decision-card">
        <div className="label">Confidence</div>
        <h4>Rerank scores gate the UI</h4>
        <p>
          Rerank score ≥0.5 shows an answer; below it, the UI falls back to a sales card. This threshold is the confidence bar. Out-of-corpus questions don't trigger hallucination; they trigger handoff.
        </p>
      </div>

      <div className="decision-card">
        <div className="label">Policy</div>
        <h4>Pricing is structurally unreachable</h4>
        <p>
          Pricing questions are intercepted twice: once at query time before condensation, once after rewrite. Pricing docs are excluded from the vector index entirely. The model can't invent a discount it doesn't have.
        </p>
      </div>

      <div className="decision-card">
        <div className="label">Citations</div>
        <h4>Inline numbered citations</h4>
        <p>
          Every answer lists <code>[1][2]</code> inline, tied to a source rail ranked by rerank score. The reader can immediately verify the grounding. No hallucination hides behind a "I don't recall" answer.
        </p>
      </div>

      <div className="decision-card">
        <div className="label">Consent</div>
        <h4>First interaction gates with compliance</h4>
        <p>
          On first use, a dialog surfaces a data-processing notice, a generative-AI disclaimer, and accept/cancel. This is stored in <code>localStorage</code> so it only appears once per browser.
        </p>
      </div>

      <div className="decision-card">
        <div className="label">Persistence</div>
        <h4>Input survives route changes</h4>
        <p>
          The "Ask Nova" input is a bottom-center persistent widget that doesn't unmount on navigation. Questions can be asked from any page. The assistant knows what page you're on, even custom 404s.
        </p>
      </div>
    </div>

    <div className="guardrail">
      <h4>Defense in Depth: Pricing</h4>
      <p>
        Pricing is handled three ways:
      </p>
      <p>
        <b>1. Keyword interception:</b> "cost", "price", "plan", "billing" trigger an immediate hand-off to sales. No retrieval.
      </p>
      <p>
        <b>2. Intent detection after rewrite:</b> Follow-ups like "what would that set me back?" contain zero pricing keywords but expose pricing intent after Haiku's query rewrite. A second gate catches it.
      </p>
      <p>
        <b>3. Index exclusion:</b> Pricing pages are excluded from the vector index during ingestion. Even an out-of-distribution prompt can't fish for pricing context.
      </p>
    </div>

    <h2>Multi-Turn Conversation</h2>
    <p>
      Instead of passing the full chat history to retrieval, Ask Nova uses <b>query condensation</b>: Claude Haiku rewrites each follow-up into a standalone query that includes necessary context from the conversation. This keeps retrieval lightweight and makes the query intent visible for guardrails.
    </p>
    <p>
      Example flow:
    </p>
    <div className="block">
      <div className="block-label">User</div>
      <h4>First message</h4>
      <p>"Does Northline have AI features?"</p>
    </div>
    <div className="block">
      <div className="block-label">Haiku rewrite (same)</div>
      <h4>Pass-through</h4>
      <p>"Does Northline have AI features?"</p>
    </div>
    <div className="block">
      <div className="block-label">User</div>
      <h4>Follow-up</h4>
      <p>"How long until it starts working?"</p>
    </div>
    <div className="block">
      <div className="block-label">Haiku rewrite</div>
      <h4>Standalone query</h4>
      <p>"How long until Northline AI features start working after setup?"</p>
    </div>

    <h2>Streaming & Real-Time Feedback</h2>
    <p>
      All responses stream over SSE (Server-Sent Events), so the user sees text appearing in real-time. This applies to both canned answers (summaries) and generated ones (RAG). The <code>&lt;input&gt;</code> disables while streaming, and citations appear as they're listed in the response.
    </p>

    <h2>Technology Stack</h2>
    <div className="stack-grid">
      <span className="badge hot">Next.js 15 · App Router</span>
      <span className="badge hot">Claude Sonnet · generation</span>
      <span className="badge hot">Claude Haiku · query rewrite</span>
      <span className="badge">Voyage AI · embeddings + rerank</span>
      <span className="badge">Postgres · pgvector (optional)</span>
      <span className="badge">SSE streaming</span>
      <span className="badge">Hash-incremental ingestion</span>
      <span className="badge">Canvas · 3D visualization (no deps)</span>
      <span className="badge">Vercel deployment</span>
      <span className="badge">Per-IP rate limiting</span>
    </div>

    <p>
      The app runs on <b>Next.js 15</b> with the App Router. The retrieval pipeline lives in API routes that run on every request (for caching/deduplication). Vector index updates are triggered on deployment and on-demand. The frontend uses plain JavaScript for interactions — no React state bloat for the chat UI. <b>Voyage 3-lite</b> embeddings are cost-effective and recall-strong; <b>rerank-2-lite</b> is the production cross-encoder. <b>Claude Sonnet</b> generates answers; <b>Haiku</b> rewrites queries to expose intent for guardrails.
    </p>

    <div className="divider" />

    <h2>The Eight Sample Runs</h2>
    <p>
      The <a href="https://ai-mode-lac.vercel.app" target="_blank" rel="noopener">live demo</a> walks through 8 scenarios that illustrate the system's architecture:
    </p>

    <ol>
      <li><b>Consent gate</b> — First interaction shows a compliance dialog before any processing.</li>
      <li><b>Instant page summary</b> — "Summarize this page" returns a pre-computed, streamed answer. Zero model calls.</li>
      <li><b>Cited RAG answer</b> — "Does Northline have AI features?" streams an answer with inline [1][2] citations and source rail ranked by rerank scores.</li>
      <li><b>Follow-up resolution</b> — "How long until it starts working?" resolves "it" via history-aware query rewriting before retrieval.</li>
      <li><b>Pricing guardrail (direct)</b> — "What does Northline cost?" is intercepted and routed to sales, never reaching the model.</li>
      <li><b>Pricing guardrail (indirect)</b> — "…and what would that set me back?" has zero pricing keywords but the query rewrite exposes intent, triggering a second gate. Defense in depth.</li>
      <li><b>Grounded honesty</b> — "Do you integrate with Microsoft Teams?" admits the docs cover it only partially; out-of-corpus questions (like "on-premise version?") admit the docs don't cover them and fall back to sales.</li>
      <li><b>404-aware assistant</b> — On a custom 404 page, "Summarize this page" returns "You're on a page that doesn't exist — here's where to go instead" with links to real pages.</li>
    </ol>

    <footer>Ask Nova · AI Mode · Northline (demo) · Reference</footer>
  </div>
);
