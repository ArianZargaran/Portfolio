// Safari / real-device probe server (M11a). Run on Ari's Mac from the repo root:
//   npm run probe:safari            (ports 4173 + 4174; PROBE_PORT to change)
// then open http://localhost:4173/ in Safari on the Mac. For the iPhone, run
// PROBE_HOST=0.0.0.0 npm run probe:safari and open http://<mac-lan-ip>:4173/
// (same Wi-Fi). Nothing is deployed and nothing leaves the Mac.
// Serves the probe page, the shipped hero clips (with HTTP Range, which
// Safari needs for <video>), and the laptop still. A second port serves the
// same files cross-origin, with and without Timing-Allow-Origin, for the
// transferSize-0 check. POST /results saves a run to ./results/.
import {
  createReadStream,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:http";
import { networkInterfaces } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const USAGE = `Safari / real-device hero probe (M11a)

  npm run probe:safari                         Mac Safari: open http://localhost:4173/
  PROBE_HOST=0.0.0.0 npm run probe:safari      iPhone on the same Wi-Fi: http://<mac-lan-ip>:4173/
  PROBE_PORT=5000 npm run probe:safari         other ports (PORT and PORT+1)
  npm run probe:safari -- --check              dry start: check the files, print the URLs, exit

Results are saved by the page's "Save on the Mac" button to
scripts/hero/safari-probe/results/run-<time>.json. Needs Node >= 20.`;
if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(USAGE);
  process.exit(0);
}

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../../..");
const media = path.join(repo, "app/scene/hero/media");
const sceneDir = path.join(repo, "public/scene");
const still = readdirSync(sceneDir)
  .map((d) => path.join(sceneDir, d, "laptop-1440.webp"))
  .find((p) => existsSync(p));
const PORT = Number(process.env.PROBE_PORT ?? 4173);
// Loopback only unless asked: PROBE_HOST=0.0.0.0 lets an iPhone on the same
// Wi-Fi reach the Mac (run that only on a trusted home network).
const HOST = process.env.PROBE_HOST ?? "127.0.0.1";
const XPORT = PORT + 1;
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".mp4": "video/mp4",
  ".webp": "image/webp",
};

function sendFile(req, res, file, extra = {}) {
  if (!file || !existsSync(file))
    return void res.writeHead(404).end("not found");
  const size = statSync(file).size;
  const type = TYPES[path.extname(file)] ?? "application/octet-stream";
  const base = { "Content-Type": type, "Accept-Ranges": "bytes", ...extra };
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.range ?? "");
  if (m) {
    const start = m[1] ? Number(m[1]) : size - Number(m[2]);
    const end = m[1] && m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
    res.writeHead(206, {
      ...base,
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Content-Length": end - start + 1,
    });
    return void createReadStream(file, { start, end }).pipe(res);
  }
  res.writeHead(200, { ...base, "Content-Length": size });
  createReadStream(file).pipe(res);
}

// Cache headers: ?cache=1 -> immutable (like /assets/ on Vercel), else no-store.
const cacheOf = (u) =>
  u.searchParams.get("cache") === "1"
    ? { "Cache-Control": "public, max-age=31536000, immutable" }
    : { "Cache-Control": "no-store" };

function route(req, res, crossOrigin) {
  const u = new URL(req.url, "http://x");
  const tao =
    crossOrigin && u.searchParams.get("tao") === "1"
      ? { "Timing-Allow-Origin": "*" }
      : {};
  const cors = crossOrigin ? { "Access-Control-Allow-Origin": "*" } : {};
  if (u.pathname.startsWith("/media/")) {
    const f = path.join(media, path.basename(u.pathname));
    return sendFile(req, res, f, { ...cacheOf(u), ...tao, ...cors });
  }
  if (u.pathname === "/still.webp")
    return sendFile(req, res, still, { ...cacheOf(u), ...tao, ...cors });
  if (crossOrigin) return void res.writeHead(404).end();
  if (u.pathname === "/" || u.pathname === "/index.html")
    return sendFile(req, res, path.join(here, "probe.html"), {
      "Cache-Control": "no-store",
    });
  if (u.pathname === "/results" && req.method === "POST") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      mkdirSync(path.join(here, "results"), { recursive: true });
      const f = path.join(
        here,
        "results",
        `run-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
      );
      writeFileSync(f, body);
      console.log("saved", path.relative(repo, f));
      res
        .writeHead(200, { "Content-Type": "application/json" })
        .end(JSON.stringify({ saved: path.basename(f) }));
    });
    return;
  }
  res.writeHead(404).end("not found");
}

if (process.argv.includes("--check")) {
  const clips = existsSync(media)
    ? readdirSync(media).filter((f) => f.endsWith(".mp4"))
    : [];
  const ok =
    clips.length > 0 && !!still && existsSync(path.join(here, "probe.html"));
  console.log(
    `probe check: ${clips.length} clips in app/scene/hero/media, still ${still ? path.relative(repo, still) : "MISSING"}, probe.html ${existsSync(path.join(here, "probe.html")) ? "ok" : "MISSING"}`,
  );
  console.log(
    `would serve http://${HOST === "0.0.0.0" ? "<lan-ip>" : "localhost"}:${PORT}/ (+ :${XPORT})`,
  );
  process.exit(ok ? 0 : 1);
}

createServer((q, s) => route(q, s, false)).listen(PORT, HOST);
createServer((q, s) => route(q, s, true)).listen(XPORT, HOST);
const ips = Object.values(networkInterfaces())
  .flat()
  .filter((i) => i?.family === "IPv4" && !i.internal)
  .map((i) => i.address);
console.log(
  `Safari probe: http://localhost:${PORT}/  (cross-origin helper on :${XPORT})`,
);
if (HOST === "0.0.0.0")
  ips.forEach((ip) =>
    console.log(`  iPhone on the same Wi-Fi: http://${ip}:${PORT}/`),
  );
else
  console.log(
    "  (loopback only; PROBE_HOST=0.0.0.0 for an iPhone on the same Wi-Fi)",
  );
