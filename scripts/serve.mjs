// Local production preview. The Vercel preset writes the server bundle to
// build/server/<function-config-hash>/index.js, so locate it instead of
// hard-coding the hash, then hand off to react-router-serve.
import { spawn } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

const root = "build/server";
const candidates = [path.join(root, "index.js")].concat(
  existsSync(root)
    ? readdirSync(root).map((d) => path.join(root, d, "index.js"))
    : [],
);
const entry = candidates.find((p) => existsSync(p));
if (!entry) {
  console.error("No server build found. Run `npm run build` first.");
  process.exit(1);
}
const child = spawn("npx", ["react-router-serve", entry], {
  stdio: "inherit",
  env: { NODE_ENV: "production", ...process.env },
});
child.on("exit", (code) => process.exit(code ?? 0));
