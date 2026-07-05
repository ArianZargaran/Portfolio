import { useEffect, useRef } from "react";

import styles from "./ashes-rain.module.css";

/**
 * Full-viewport ash-rain background for the about page. Grey flakes drift
 * down with slow turbulence, flickering faintly. The pointer acts as a heat
 * source: ashes near the cursor warm into embers — greys shift toward the
 * site's redline glow with a soft halo. Honors prefers-reduced-motion by
 * rendering a static scatter whose warmth still follows the pointer.
 */

/** Ash greys as [r, g, b] — cool tones tuned to the dark navy background. */
const ASH_TONES: ReadonlyArray<readonly [number, number, number]> = [
  [148, 158, 170],
  [122, 132, 146],
  [98, 108, 122],
  [78, 88, 102],
];

/** Ember color ashes warm toward near the pointer (redline-adjacent). */
const EMBER: readonly [number, number, number] = [235, 110, 72];

/** One flake per this many px² of viewport — ashes read denser than confetti. */
const AREA_PER_FLAKE = 6500;
const MIN_FLAKES = 110;
const MAX_FLAKES = 320;
/** Pointer heat reach, px. */
const HEAT_RADIUS = 240;
/** Base alpha for cold flakes. */
const BASE_ALPHA = 0.45;
/** Off-screen margin before a flake wraps, px. */
const WRAP_MARGIN = 10;

interface Flake {
  x: number;
  y: number;
  /** Core radius, px. */
  size: number;
  /** Elongation — some flakes are slivers, some specks. */
  stretch: number;
  /** Irregular flake outline, built once at creation. */
  shape: Path2D;
  tone: readonly [number, number, number];
  fall: number;
  drift: number;
  wanderFreq: number;
  wanderFreq2: number;
  phase: number;
  phase2: number;
  rot: number;
  rotSpeed: number;
  flickerFreq: number;
  flickerPhase: number;
}

/**
 * Real ash is torn, not round: a jagged closed polygon — 6–9 vertices at
 * jittered radii around the center, elongated on x — gives every flake its
 * own irregular silhouette. Built once per flake as a Path2D so drawing it
 * costs the same as an ellipse.
 */
const createShape = (size: number, stretch: number): Path2D => {
  const path = new Path2D();
  const vertices = 6 + Math.floor(Math.random() * 4);
  for (let i = 0; i < vertices; i++) {
    const angle = (i / vertices) * Math.PI * 2;
    const radius = size * (0.55 + Math.random() * 0.75);
    const x = Math.cos(angle) * radius * stretch;
    const y = Math.sin(angle) * radius;
    if (i === 0) path.moveTo(x, y);
    else path.lineTo(x, y);
  }
  path.closePath();
  return path;
};

const createFlake = (width: number, height: number): Flake => {
  const size = 0.9 + Math.random() * 2;
  const stretch = 1 + Math.random() * 2.2;
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    size,
    stretch,
    shape: createShape(size, stretch),
    tone: ASH_TONES[Math.floor(Math.random() * ASH_TONES.length)],
    fall: 0.12 + Math.random() * 0.4,
    drift: 0.15 + Math.random() * 0.35,
    wanderFreq: 0.3 + Math.random() * 0.7,
    wanderFreq2: 1.1 + Math.random() * 1.6,
    phase: Math.random() * Math.PI * 2,
    phase2: Math.random() * Math.PI * 2,
    rot: Math.random() * Math.PI,
    rotSpeed: (Math.random() - 0.5) * 0.02,
    flickerFreq: 0.6 + Math.random() * 1.8,
    flickerPhase: Math.random() * Math.PI * 2,
  };
};

export const AshesRain: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let width = 0;
    let height = 0;
    const flakes: Flake[] = [];
    const heat = { x: window.innerWidth / 2, y: window.innerHeight / 3 };
    let frame = 0;
    let time = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Adjust the field without rebuilding it — a full reset reads as a
      // visible jump in the rain.
      const target = Math.min(
        MAX_FLAKES,
        Math.max(MIN_FLAKES, Math.floor((width * height) / AREA_PER_FLAKE)),
      );
      for (const flake of flakes) {
        if (flake.x > width) flake.x = Math.random() * width;
      }
      while (flakes.length < target) flakes.push(createFlake(width, height));
      if (flakes.length > target) flakes.length = target;
    };

    const drawFlakes = (target: CanvasRenderingContext2D) => {
      for (const flake of flakes) {
        const dx = flake.x - heat.x;
        const dy = flake.y - heat.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const warm = dist < HEAT_RADIUS ? (1 - dist / HEAT_RADIUS) ** 2 : 0;
        const flicker =
          0.7 + 0.3 * Math.sin(time * flake.flickerFreq + flake.flickerPhase);

        const [r, g, b] = flake.tone;
        const mix = warm * 0.9;
        const cr = Math.round(r + (EMBER[0] - r) * mix);
        const cg = Math.round(g + (EMBER[1] - g) * mix);
        const cb = Math.round(b + (EMBER[2] - b) * mix);

        target.save();
        target.translate(flake.x, flake.y);
        target.rotate(flake.rot);

        // Ember halo: warmed ashes glow softly beyond their body.
        if (warm > 0.12) {
          target.globalAlpha = warm * 0.22 * flicker;
          target.fillStyle = `rgb(${EMBER[0]}, ${EMBER[1]}, ${EMBER[2]})`;
          target.beginPath();
          target.ellipse(
            0,
            0,
            flake.size * flake.stretch * 2.4,
            flake.size * 2.4,
            0,
            0,
            Math.PI * 2,
          );
          target.fill();
        }

        target.globalAlpha = Math.min(
          1,
          BASE_ALPHA * flicker + warm * 0.45,
        );
        target.fillStyle = `rgb(${cr}, ${cg}, ${cb})`;
        target.fill(flake.shape);
        target.restore();
      }
    };

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      drawFlakes(ctx);
    };

    const step = () => {
      time += 1 / 60;
      for (const flake of flakes) {
        // Two layered sines make the sideways wander read as turbulence
        // rather than a metronome sway.
        flake.x +=
          Math.sin(time * flake.wanderFreq + flake.phase) * flake.drift +
          Math.sin(time * flake.wanderFreq2 + flake.phase2) *
            flake.drift *
            0.4;
        flake.y += flake.fall;
        flake.rot += flake.rotSpeed;

        // Wrap instead of respawn: the flake keeps its identity, so the rain
        // is one continuous loop with no visible reset.
        if (flake.y > height + WRAP_MARGIN) {
          flake.y -= height + WRAP_MARGIN * 2;
        }
        if (flake.x > width + WRAP_MARGIN) {
          flake.x -= width + WRAP_MARGIN * 2;
        } else if (flake.x < -WRAP_MARGIN) {
          flake.x += width + WRAP_MARGIN * 2;
        }
      }
      render();
      frame = window.requestAnimationFrame(step);
    };

    let heatFrame = 0;
    const onPointerMove = (event: PointerEvent) => {
      heat.x = event.clientX;
      heat.y = event.clientY;
      if (reducedMotion) {
        // Static mode still re-warms on pointer move, throttled to rAF.
        window.cancelAnimationFrame(heatFrame);
        heatFrame = window.requestAnimationFrame(render);
      }
    };

    const onVisibilityChange = () => {
      if (reducedMotion) return;
      window.cancelAnimationFrame(frame);
      if (!document.hidden) frame = window.requestAnimationFrame(step);
    };

    resize();
    if (reducedMotion) {
      render();
    } else {
      frame = window.requestAnimationFrame(step);
    }

    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(heatFrame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return <canvas ref={canvasRef} className={styles.ashes} aria-hidden="true" />;
};
