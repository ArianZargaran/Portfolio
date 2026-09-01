import React, { useEffect, useRef } from "react";

/* Murmuration — React port of the standalone artifact this page was authored
   in. The hero canvas is a compact edition of the real effect: noise sampled
   into an angle, particles advected along a dictated arc, colour taken from
   position along that arc, batched one stroke per colour bucket. Ported
   mechanism-for-mechanism from the artifact's inline <script> into a ref +
   effect, math and constants unchanged.

   Styles live in app/stylesheets/murmuration.css, scoped entirely under
   .murmuration-page. */

const MurmurationField: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const STOPS = ["#16255f", "#5c1cb4", "#c81f63", "#e8642f", "#e8a25a"];
    const BG = "#07060a";
    const STEPS = 26;
    const INK = 0.3;

    // 2D gradient noise on an integer hash: no permutation table to carry.
    const GN = 16;
    const GX = new Float32Array(GN);
    const GY = new Float32Array(GN);
    for (let i = 0; i < GN; i++) {
      const a = (i / GN) * Math.PI * 2;
      GX[i] = Math.cos(a);
      GY[i] = Math.sin(a);
    }
    function grad(ix: number, iy: number, seed: number) {
      let k =
        Math.imul(ix, 0x27d4eb2d) ^
        Math.imul(iy, 0x165667b1) ^
        Math.imul(seed, 0x9e3779b1);
      k = Math.imul(k ^ (k >>> 15), 0x85ebca6b);
      k ^= k >>> 13;
      return Math.imul(k, 0xc2b2ae35) >>> 28;
    }
    function noise2(x: number, y: number, seed: number) {
      const ix = Math.floor(x);
      const iy = Math.floor(y);
      const fx = x - ix;
      const fy = y - iy;
      const u = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
      const v = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
      const g00 = grad(ix, iy, seed);
      const g10 = grad(ix + 1, iy, seed);
      const g01 = grad(ix, iy + 1, seed);
      const g11 = grad(ix + 1, iy + 1, seed);
      const n00 = GX[g00] * fx + GY[g00] * fy;
      const n10 = GX[g10] * (fx - 1) + GY[g10] * fy;
      const n01 = GX[g01] * fx + GY[g01] * (fy - 1);
      const n11 = GX[g11] * (fx - 1) + GY[g11] * (fy - 1);
      const p = n00 + u * (n10 - n00);
      const q = n01 + u * (n11 - n01);
      return (p + v * (q - p)) * 1.4;
    }

    function mix(c0: number[], c1: number[], f: number) {
      return [
        Math.round(c0[0] + (c1[0] - c0[0]) * f),
        Math.round(c0[1] + (c1[1] - c0[1]) * f),
        Math.round(c0[2] + (c1[2] - c0[2]) * f),
      ];
    }
    const rgb = STOPS.map((s) => {
      const n = parseInt(s.slice(1), 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    });
    const COLORS: string[] = [];
    for (let s = 0; s < STEPS; s++) {
      const t = (s / (STEPS - 1)) * (rgb.length - 1);
      const lo = Math.min(Math.floor(t), rgb.length - 2);
      const c = mix(rgb[lo], rgb[lo + 1], t - lo);
      COLORS.push(`rgba(${c[0]},${c[1]},${c[2]},${INK})`);
    }

    let W = 0;
    let H = 0;
    let dpr = 1;
    let N = 0;
    let px: Float32Array = new Float32Array(0);
    let py: Float32Array = new Float32Array(0);
    let qx: Float32Array = new Float32Array(0);
    let qy: Float32Array = new Float32Array(0);
    let age: Float32Array = new Float32Array(0);
    let life: Float32Array = new Float32Array(0);
    let rate: Float32Array = new Float32Array(0);
    let stray: Float32Array = new Float32Array(0);
    let bucket: Uint16Array = new Uint16Array(0);
    let order: Uint32Array = new Uint32Array(0);
    const counts = new Int32Array(STEPS);
    const cursor = new Int32Array(STEPS);
    const reduced =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function centreY(x: number) {
      return H * (0.5 + 0.13 * Math.sin((x / W) * 2.2 - 0.6));
    }
    function slope(x: number) {
      return ((H * 0.13 * 2.2) / W) * Math.cos((x / W) * 2.2 - 0.6);
    }
    function bell() {
      return Math.random() + Math.random() - 1;
    }

    function spawn(i: number, seed: boolean) {
      const x = Math.random() * W * 1.2 - W * 0.1;
      px[i] = qx[i] = x;
      py[i] = qy[i] = centreY(x) + bell() * H * 0.23;
      life[i] = 1.1 + Math.random() * 3.5;
      age[i] = seed ? Math.random() * life[i] : 0;
      rate[i] = 0.75 + Math.random() * 0.5;
      stray[i] = Math.random() * 2 - 1;
    }

    function size() {
      const w = canvas!.clientWidth;
      const h = canvas!.clientHeight;
      if (!w || !h || (w === W && h === H)) return;
      W = w;
      H = h;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.round(W * dpr);
      canvas!.height = Math.round(H * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.lineCap = "round";
      ctx!.fillStyle = BG;
      ctx!.fillRect(0, 0, W, H);

      N = Math.min(26000, Math.round((W * H) / 34));
      px = new Float32Array(N);
      py = new Float32Array(N);
      qx = new Float32Array(N);
      qy = new Float32Array(N);
      age = new Float32Array(N);
      life = new Float32Array(N);
      rate = new Float32Array(N);
      stray = new Float32Array(N);
      bucket = new Uint16Array(N);
      order = new Uint32Array(N);
      for (let i = 0; i < N; i++) spawn(i, true);
    }

    let t = 0;
    let last = 0;
    const speed = 250;
    const ns = 0.0035;

    function step(dt: number) {
      if (!W || !H) return;
      t += dt * 6 * speed * ns;
      ctx!.globalAlpha = Math.min(1 - Math.exp(-1.6 * dt), 1);
      ctx!.fillStyle = BG;
      ctx!.fillRect(0, 0, W, H);
      ctx!.globalAlpha = 1;

      counts.fill(0);
      const half = H * 0.23;

      for (let i = 0; i < N; i++) {
        const x = px[i];
        const y = py[i];
        const ax = (x * 0.8776 - y * 0.4794) * ns;
        const ay = (x * 0.4794 + y * 0.8776) * ns;
        const dx = (x * 0.7756 + y * 0.6312) * ns;
        const dy = (-x * 0.6312 + y * 0.7756) * ns;
        const n1 = (noise2(ax + t, ay, 0) + noise2(dx - t, dy, 7)) * 0.707;
        const n2 = noise2(
          x * ns * 2.7 - t * 1.9,
          y * ns * 2.7 + t * 0.7,
          101,
        );
        const wob = (n1 + n2 * 0.45) / 1.45;

        const lifeT = age[i] / life[i];
        const d = stray[i];
        const ang =
          Math.atan(slope(x)) +
          wob * 1.15 +
          d * d * d * 2.4 * 0.35 * lifeT * lifeT;

        const edge = Math.min(Math.abs(y - centreY(x)) / half, 1.4);
        const sp = speed * rate[i] * (0.3 + edge * 1.25);

        qx[i] = x;
        qy[i] = y;
        const nx = x + Math.cos(ang) * sp * dt;
        const ny = y + Math.sin(ang) * sp * dt;
        px[i] = nx;
        py[i] = ny;
        age[i] += dt;

        if (
          age[i] >= life[i] ||
          nx > W * 1.08 ||
          nx < -W * 0.12 ||
          ny < -H * 0.2 ||
          ny > H * 1.2
        ) {
          spawn(i, false);
          bucket[i] = 65535;
          continue;
        }
        let ci = ((nx / W) * STEPS + (Math.random() - 0.5) * 4) | 0;
        if (ci < 0) ci = 0;
        else if (ci >= STEPS) ci = STEPS - 1;
        bucket[i] = ci;
        counts[ci]++;
      }

      let acc = 0;
      for (let b = 0; b < STEPS; b++) {
        cursor[b] = acc;
        acc += counts[b];
      }
      for (let j = 0; j < N; j++) {
        const bk = bucket[j];
        if (bk !== 65535) order[cursor[bk]++] = j;
      }

      ctx!.lineWidth = 1;
      for (let c2 = 0; c2 < STEPS; c2++) {
        const n = counts[c2];
        if (!n) continue;
        const end = cursor[c2];
        ctx!.strokeStyle = COLORS[c2];
        ctx!.beginPath();
        for (let k = end - n; k < end; k++) {
          const m = order[k];
          ctx!.moveTo(qx[m], qy[m]);
          ctx!.lineTo(px[m], py[m]);
        }
        ctx!.stroke();
      }
    }

    let raf = 0;
    function frame() {
      raf = requestAnimationFrame(frame);
      size();
      if (!W || !H) return;
      const now = performance.now();
      if (!last) last = now;
      const el = (now - last) / 1000;
      last = now;
      if (el <= 0) return;
      step(Math.min(el, 1 / 30));
    }

    let resizeObserver: ResizeObserver | undefined;
    let resizeListener: (() => void) | undefined;

    if (reduced) {
      // Settle to a still frame rather than animating. A ResizeObserver, not
      // a window listener: the canvas can reach its real size without the
      // window ever resizing, and measuring before layout gives zero.
      const settle = () => {
        const before = W;
        size();
        if (!W || !H || W === before) return;
        for (let g = 0; g < 220; g++) step(1 / 60);
      };
      if (typeof ResizeObserver === "function") {
        resizeObserver = new ResizeObserver(settle);
        resizeObserver.observe(canvas);
      } else {
        resizeListener = settle;
        window.addEventListener("resize", resizeListener);
      }
      settle();
    } else {
      size();
      raf = requestAnimationFrame(frame);
    }

    return () => {
      if (raf) cancelAnimationFrame(raf);
      resizeObserver?.disconnect();
      if (resizeListener) window.removeEventListener("resize", resizeListener);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      id="field"
      aria-label="A field of particles flowing along a curved path"
    />
  );
};

export const Murmuration: React.FC = () => (
  <React.Fragment>
    <div className="hero">
      <MurmurationField />
      <div className="hero-mask">
        <div className="hero-inner">
          <p className="eyebrow">Clean-room rebuild</p>
          <h1>Murmuration</h1>
          <p>
            Tens of thousands of particles advected along a dictated path, on
            a 2D canvas. A tuning studio that exports the code it is running.
          </p>
        </div>
      </div>
    </div>

    <div className="wrap">
      <div className="titleblock">
        <div className="tb-cell">
          <div className="tb-key">Package</div>
          <div className="tb-val">
            <a
              href="https://www.npmjs.com/package/react-murmuration"
              target="_blank"
              rel="noopener noreferrer"
            >
              react-murmuration
            </a>
          </div>
        </div>
        <div className="tb-cell">
          <div className="tb-key">Source</div>
          <div className="tb-val">
            <a
              href="https://github.com/ArianZargaran/react-murmuration"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
          </div>
        </div>
        <div className="tb-cell">
          <div className="tb-key">Studio</div>
          <div className="tb-val">
            <a
              href="https://arianzargaran.github.io/react-murmuration/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Live
            </a>
          </div>
        </div>
        <div className="tb-cell">
          <div className="tb-key">Stack</div>
          <div className="tb-val">Canvas 2D &middot; TS &middot; React</div>
        </div>
        <div className="tb-cell">
          <div className="tb-key">Origin</div>
          <div className="tb-val">Freshworks, rebuilt</div>
        </div>
      </div>

      <section>
        <div className="measure">
          <p className="lede">
            I built the original of this effect at Freshworks. It runs on the
            freshworks.com homepage today. That code belongs to Freshworks, so
            none of it is here.
          </p>
          <p>
            This is a clean-room rebuild from the technique, not a port.
            Advecting particles along a vector field is public knowledge going
            back decades; the implementation is new, written from the
            algorithm rather than from the original source. The rebuild
            became a published package and a tuning studio that exports
            working code.
          </p>
        </div>
      </section>

      <section>
        <p className="eyebrow">The distinction</p>
        <h2>It is not a murmuration</h2>
        <hr className="srule" />
        <div className="thesis">
          <p>
            A real murmuration is <em>emergent</em>. Every starling runs
            local rules &mdash; separation, alignment, cohesion &mdash; and no
            one dictates the global shape.
          </p>
          <p>Here the trajectory is dictated and the particles obey.</p>
        </div>
        <div className="measure">
          <p>
            The name is only about how it looks. There are no neighbour
            lookups anywhere in the package, and there never will be &mdash;
            that constraint is written into the source header so nobody
            mistakes the two later. Calling it emergent would be claiming a
            harder problem than the one actually solved.
          </p>
          <p>
            What produces the look instead: a noise field sampled per
            particle and turned into an <strong>angle</strong>, never
            straight into a velocity. That single choice is what keeps
            neighbouring particles travelling together rather than each
            shimmering on its own.
          </p>
        </div>
      </section>

      <section>
        <p className="eyebrow">Technique</p>
        <h2>What makes it read as alive</h2>
        <hr className="srule" />
        <div className="measure">
          <p>
            Four details do most of the work, and each one is a rule about
            how particles differ from one another rather than an effect
            layered on top.
          </p>
        </div>
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>Detail</th>
                <th>Why it matters</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>Noise becomes an angle</strong>
                </td>
                <td>
                  Sampled per particle position, added to the dictated
                  heading. Coherent motion instead of jitter.
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Speed varies across the flow</strong>
                </td>
                <td>
                  Slow and dense down the core, fast at the rim. Ink per
                  particle stays roughly constant, so fast means a long thin
                  streak and slow means a short fat dot &mdash; from one rule,
                  not two.
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Colour follows the path</strong>
                </td>
                <td>
                  Sampled from position along the arc, so neighbours share a
                  colour. It is the path that is coloured, not the particle.
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Some particles leak</strong>
                </td>
                <td>
                  A minority peel progressively out of the flow. That
                  controlled failure is what stops the whole thing reading as
                  one solid ribbon.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="measure">
          <p>
            Lifespans are jittered so respawns never pulse in unison. The
            field itself reorganises as fast as particles cross it &mdash;
            without that, they collapse onto its attracting streamlines and
            the density bakes into fixed lanes. More on that below; it took
            five attempts to see.
          </p>
        </div>
      </section>

      <section>
        <p className="eyebrow">Decisions</p>
        <h2>Canvas 2D, on purpose</h2>
        <hr className="srule" />
        <div className="measure">
          <p>
            Counterintuitive at this particle count, so here is the
            reasoning. The tool exists so other people can take the code. A
            designer who copies four hundred lines of WebGL boilerplate
            &mdash; context, shaders, buffers, FBO ping-pong &mdash; cannot
            edit any of it. One who copies readable canvas can change it that
            afternoon.
          </p>
          <p>
            <strong>
              If the exported code is not readable, the tool has not done its
              job.
            </strong>{" "}
            WebGL was reserved for the case where canvas genuinely could not
            hold 60fps at a particle count that looked right. It never came
            up.
          </p>
          <p>
            The performance comes from batching instead. Particles are
            counting-sorted into colour &times; width &times; depth buckets,
            and each bucket is stroked as a single path &mdash; a few hundred
            draw calls per frame instead of a hundred thousand. That one
            technique is why the numbers below are possible on a 2D canvas.
          </p>
        </div>

        <div className="stats">
          <div className="stat">
            <div className="stat-n">120k</div>
            <div className="stat-l">particles at 60fps, measured in-browser</div>
          </div>
          <div className="stat">
            <div className="stat-n">13 kB</div>
            <div className="stat-l">published bundle, one file</div>
          </div>
          <div className="stat">
            <div className="stat-n">0</div>
            <div className="stat-l">runtime dependencies</div>
          </div>
          <div className="stat">
            <div className="stat-n">21</div>
            <div className="stat-l">parameters, all optional</div>
          </div>
        </div>

        <h3>The core knows nothing about React</h3>
        <div className="measure">
          <p>
            The simulation imports nothing and touches nothing but a canvas.
            React is a twenty-line wrapper at the bottom of the same file,
            below a banner comment marking the boundary. That separation is
            the architectural argument of the piece: the part worth keeping
            is the part with no framework in it, and a reader can see exactly
            where the framework starts.
          </p>
        </div>
      </section>

      <section>
        <p className="eyebrow">The hard part</p>
        <h2>A bug that took five wrong diagnoses</h2>
        <hr className="srule" />
        <div className="measure">
          <p>
            At high particle counts the field developed regular structure
            &mdash; vertical stripes, then lanes and voids that sat still
            while everything moved. Each diagnosis below was plausible,
            produced a real fix, and did not solve it.
          </p>
        </div>

        <ol className="attempts">
          <li>
            <h4>Axis-aligned noise lattice</h4>
            <p>
              Gradient noise is exactly zero at every lattice point and its
              features align to the sampling axes. Both octaves sampled the
              same un-rotated grid, so the lattice lines sat vertical on
              screen. Rotating each octave fixed the orientation.
            </p>
            <span className="verdict">Real, but secondary</span>
          </li>
          <li>
            <h4>A field that never changes</h4>
            <p>
              Particles moving through a slowly-changing flow field{" "}
              <em>always</em> collapse onto its attracting streamlines. The
              field was drifting at a fifth of one cell over a particle's
              entire life &mdash; effectively static.
            </p>
            <span className="verdict">Right mechanism, wrong magnitude</span>
          </li>
          <li>
            <h4>Drift that does not scale</h4>
            <p>
              Convergence happens faster the faster particles travel, so a
              fixed drift rate fails as soon as speed rises. Made it a ratio
              of the rate particles cross the field. Correct, and still set
              roughly seven times too low.
            </p>
            <span className="verdict">Correct principle, under-set</span>
          </li>
          <li>
            <h4>Translation transports attractors</h4>
            <p>
              Sliding a noise field only moves its attractors; a particle can
              ride one and stay clumped. Two counter-translating copies
              interfere instead, so structure dissolves in place rather than
              sliding past.
            </p>
            <span className="verdict">Genuine improvement</span>
          </li>
          <li>
            <h4>Canvas fills a path&apos;s union once</h4>
            <p>
              The actual second cause, and nothing to do with the simulation.
              Each colour bucket is stroked as one path, and a path composites
              its own overlaps <em>once</em> &mdash; so a dense bucket
              saturates. Particles near a bucket boundary split across two
              less-saturated buckets and composited brighter than the ones
              mid-bucket, drawing stripes at exactly the bucket spacing.
              Fixed by spreading each position across several buckets.
            </p>
            <span className="verdict hit">The one that was it</span>
          </li>
        </ol>
      </section>

      <section>
        <p className="eyebrow">Method</p>
        <h2>The instruments were lying</h2>
        <hr className="srule" />
        <div className="measure">
          <p>
            The reason it took five attempts was not the difficulty of the
            bug. It was that every way of looking at it was broken, and each
            failure produced confident, wrong evidence.
          </p>
          <ul className="plain">
            <li>
              The browser preview only advanced the animation about one frame
              per screenshot, so a field judged &ldquo;even&rdquo; had run for
              seventeen milliseconds. The spawn distribution is smooth by
              construction &mdash; a fresh field <em>always</em> looks fine.
            </li>
            <li>
              Driving it on a timer instead hit the hidden-page throttle:
              measured at 0.20 simulated seconds per real second, so
              &ldquo;ten seconds of settling&rdquo; was half a second.
            </li>
            <li>
              An autocorrelation written to measure the stripe spacing
              returned 446&nbsp;px for four wildly different inputs. That was
              ringing in my own filter, not signal.
            </li>
            <li>
              A stationarity check returned a correlation of exactly 1.0
              &mdash; because out-of-band cells were padded with zeros and
              the zeros dominated.
            </li>
          </ul>
          <p>
            The fix was to stop trusting the browser: a headless renderer
            that runs the real engine against a stub canvas, rasterises the
            strokes, and writes a PNG. Deterministic, exact simulated time,
            seconds per iteration. It reproduced the bug on the first run.
          </p>
          <p>
            <strong>
              A number that stays the same across four different inputs is a
              broken instrument, not a finding.
            </strong>{" "}
            That is the transferable lesson, and it cost more than the bug
            did.
          </p>
        </div>
      </section>

      <section>
        <p className="eyebrow">Defects worth keeping</p>
        <h2>Three bugs with a moral</h2>
        <hr className="srule" />

        <h3>The frame-rate meter lied exactly when it mattered</h3>
        <div className="measure">
          <p>
            The simulation clamps its timestep so a backgrounded tab does not
            teleport every particle on return. The fps readout was computed
            from that clamped value &mdash; so it could never report below
            30. At a true 10fps it read 32. The one instrument meant to tell
            you when you had pushed the particle count too far reported
            healthy while the page ran at a third of that.
          </p>
          <p>
            Measured from the true elapsed time now, with the clamp kept only
            for the simulation. There is a test that drives the field at 10,
            15 and 24fps and asserts what the meter says.
          </p>
        </div>

        <h3>An object compared by identity</h3>
        <div className="measure">
          <p>
            The palette was compared with <code>!==</code>. Both the README
            and the copy-code button hand users an inline{" "}
            <code>palette={"{{ ... }}"}</code> &mdash; a new object on every
            render. So the component rebuilt its 48-entry colour table and
            retriggered its transition fade every single frame.
          </p>
          <p>
            Measured: mean fade alpha <strong>0.0106</strong> with a stable
            reference against <strong>0.2341</strong> with an equal-but-new
            object. Twenty-two times stronger. In practice{" "}
            <code>trail={"{0.9}"}</code> rendered like <code>0.35</code> and
            the user would have no idea why.
          </p>
        </div>

        <h3>A type that could not be named</h3>
        <div className="measure">
          <p>
            Version 0.0.1 shipped without exporting <code>Vec3</code> &mdash;
            the element type of the public <code>path</code> prop. Consumers
            were asked for a value they had no way to declare. Every check
            inside the repository passed, because there the type resolves
            from source; it only failed across the package boundary.
          </p>
          <p>
            Caught by installing the published package from the registry into
            a clean project, which is now a scripted check that runs before
            every publish. 0.0.1 is deprecated on npm with a note saying the
            runtime is identical and the defect is types only.
          </p>
        </div>
      </section>

      <section>
        <p className="eyebrow">Scope</p>
        <h2>What the brief said, and what happened</h2>
        <hr className="srule" />
        <div className="measure">
          <p>
            The brief was unusually strict: five controls, no gallery, no
            saved state, and an explicit instruction to push back if any of
            those were requested mid-flight. Most of it moved anyway &mdash;
            deliberately, and after the objection was made and heard.
          </p>
        </div>
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>Brief</th>
                <th>Shipped</th>
                <th>How it moved</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="num">5 controls</td>
                <td className="num">21</td>
                <td>
                  Each addition argued on its merits. Turbulence and
                  dispersal earned it; the rest followed once the panel was
                  grouped and collapsible.
                </td>
              </tr>
              <tr>
                <td>No gallery</td>
                <td>Gallery</td>
                <td>
                  Objection raised, alternative proposed and taken (tunings
                  as URLs), then the gallery requested again explicitly and
                  built &mdash; with entries sanitised on read so a renamed
                  parameter cannot corrupt them.
                </td>
              </tr>
              <tr>
                <td>Runs pasted into an empty HTML file</td>
                <td>An import and a tag</td>
                <td>
                  Three revisions: standalone HTML, then a single-file React
                  component, then just the call site once the component
                  became a published package.
                </td>
              </tr>
              <tr>
                <td>A 2D ribbon</td>
                <td>A 3D path</td>
                <td>
                  Three orthographic views &mdash; front, zenithal, lateral
                  &mdash; each editing the two axes it can see. Measured at
                  parity with the 2D engine.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="measure">
          <p>
            The version that survived is better than the brief, which is the
            point of writing constraints down and then arguing with them in
            the open rather than drifting past them quietly.
          </p>
        </div>
      </section>

      <section>
        <p className="eyebrow">The 3D path</p>
        <h2>Making &ldquo;dictated&rdquo; literal</h2>
        <hr className="srule" />
        <div className="measure">
          <p>
            The trajectory started as a sine wave with three constants. It
            ended as a path you draw: a list of <code>[x, y, z]</code> points
            inside a box you size, authored through three orthographic views
            the way a part is drawn.
          </p>
          <p>
            A particle stopped being a position and became{" "}
            <em>
              progress along the path plus an offset in the cross-section
              perpendicular to it
            </em>
            . Three things that needed getting right:
          </p>
          <ul className="plain">
            <li>
              <strong>Arc-length resampling.</strong> Sampling a spline by
              its raw parameter makes particles race through tight bends and
              crawl along straight runs. The table is resampled at even
              distance so speed means speed.
            </li>
            <li>
              <strong>Parallel-transport frames.</strong> Each sample carries
              a normal carried forward from the previous one rather than
              recomputed &mdash; otherwise the tube spins as the path turns.
            </li>
            <li>
              <strong>Depth as the outermost sort key.</strong> Walking the
              existing buckets in order then draws far-before-near: a
              painter&apos;s sort for free, with distance fade already baked
              into the stroke colour.
            </li>
          </ul>
        </div>
        <pre>
          <code>{`<Murmuration
  path={[
    [0, 0.5, 0],
    [0.35, 0.2, 1],
    [0.7, 0.8, 0],
    [1, 0.5, 1],
  ]}
  boxDepth={900}
/>`}</code>
        </pre>
      </section>

      <section>
        <p className="eyebrow">Shipped</p>
        <h2>What exists now</h2>
        <hr className="srule" />
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>Piece</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>The package</strong>
                </td>
                <td>
                  <code>react-murmuration</code> on npm. One file,
                  ~13&nbsp;kB, no runtime dependencies, React 18 or 19 as a
                  peer. ESM and CJS with type declarations.
                </td>
              </tr>
              <tr>
                <td>
                  <strong>The studio</strong>
                </td>
                <td>
                  Three routes &mdash; tune, docs, gallery. A three-view path
                  editor, a live code panel, and a frame-rate readout that
                  tells the truth.
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Tunings as links</strong>
                </td>
                <td>
                  Every parameter change writes to the URL, so a composition
                  is a link you can bookmark or send. Nothing is trusted on
                  the way back in: values are clamped, junk ignored, unknown
                  keys dropped.
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Generated docs</strong>
                </td>
                <td>
                  The docs panel and the README props tables are generated
                  from one control spec, so neither can fall behind the
                  component.
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Tests</strong>
                </td>
                <td>
                  21 of them, on <code>node:test</code> with no added
                  dependencies, plus a check that typechecks a consumer
                  against the packed tarball before publishing.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="measure">
          <p className="note">
            Both test suites were verified by reintroducing the bugs they
            were written for and watching them fail. A test that has never
            failed is a guess.
          </p>
        </div>
      </section>

      <footer>
        <span>Murmuration &mdash; clean-room rebuild, 2026</span>
        <a
          href="https://www.npmjs.com/package/react-murmuration"
          target="_blank"
          rel="noopener noreferrer"
        >
          npm
        </a>
        <a
          href="https://github.com/ArianZargaran/react-murmuration"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>
        <a
          href="https://arianzargaran.github.io/react-murmuration/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Studio
        </a>
      </footer>
    </div>
  </React.Fragment>
);
