import { build } from "esbuild";
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const output = join(root, "assets/demo.gif");
const work = mkdtempSync(join(tmpdir(), "ictus-demo-"));

const script = await build({
  stdin: {
    contents: `
      import { bindDateMask } from "./src/index.ts";
      import { bindTimeMask } from "./src/time.ts";
      bindDateMask(document.getElementById("date"));
      bindTimeMask(document.getElementById("time"));
    `,
    resolveDir: root,
    loader: "ts",
  },
  bundle: true,
  format: "iife",
  write: false,
});

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box}
html,body{margin:0;background:#fafaf9;font-family:-apple-system,BlinkMacSystemFont,"Inter","Segoe UI",sans-serif;color:#1c1917}
.wrap{width:640px;height:300px;padding:40px 48px;display:flex;flex-direction:column;justify-content:center;gap:22px}
.row{display:flex;align-items:center;gap:20px}
label{width:56px;font-size:15px;color:#78716c}
input{width:260px;font:500 22px/1 ui-monospace,"SF Mono",Menlo,monospace;font-variant-numeric:tabular-nums;padding:12px 14px;border:1px solid #d6d3d1;border-radius:10px;background:#fff;color:#1c1917;outline:none;caret-color:#2563eb}
input:focus{border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.15)}
input::placeholder{color:#c4c0bc}
.keys{display:flex;gap:6px;min-height:30px}
kbd{font:500 14px/1 ui-monospace,"SF Mono",Menlo,monospace;padding:7px 10px;border:1px solid #d6d3d1;border-bottom-width:2px;border-radius:7px;background:#fff;color:#44403c}
</style></head><body><div class="wrap">
<div class="row"><label for="date">Date</label><input id="date" placeholder="DD.MM.YYYY" autocomplete="off"><div class="keys" id="k-date"></div></div>
<div class="row"><label for="time">Time</label><input id="time" placeholder="HH:MM" autocomplete="off"><div class="keys" id="k-time"></div></div>
</div><script>${script.outputFiles[0].text}</script></body></html>`;

const browser = await chromium.launch().catch((error) => {
  console.error("Run `pnpm exec playwright install chromium-headless-shell` first.");
  throw error;
});
const page = await browser.newPage({ viewport: { width: 640, height: 300 }, deviceScaleFactor: 2 });
await page.setContent(html);

const list = [];
let frame = 0;
async function snap(ms) {
  const file = `f${String(frame++).padStart(3, "0")}.png`;
  await page.screenshot({ path: join(work, file), caret: "initial" });
  list.push(`file '${file}'\nduration ${ms / 1000}`);
}

function showKey(field, key) {
  return page.evaluate(
    ([id, k]) => {
      document.getElementById(id).innerHTML = k ? `<kbd>${k}</kbd>` : "";
    },
    [`k-${field}`, key],
  );
}

await snap(700);
for (const [field, keys] of [["date", "4122026"], ["time", "945"]]) {
  await page.focus(`#${field}`);
  await snap(400);
  for (const [i, key] of [...keys].entries()) {
    await page.keyboard.press(key);
    await showKey(field, key);
    await snap(i === keys.length - 1 ? 1000 : 380);
  }
  await showKey(field, "");
}
await snap(1800);
await browser.close();

// The concat demuxer ignores the last entry's duration unless the file is listed again.
list.push(list.at(-1).split("\n")[0]);
writeFileSync(join(work, "list.txt"), `${list.join("\n")}\n`);

execFileSync(
  "ffmpeg",
  [
    "-y", "-loglevel", "error",
    "-f", "concat", "-i", "list.txt",
    "-vf", "scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=64:stats_mode=full[p];[b][p]paletteuse=dither=none",
    "-loop", "0",
    output,
  ],
  { cwd: work, stdio: "inherit" },
);
rmSync(work, { recursive: true, force: true });
console.log(`wrote ${output}`);
