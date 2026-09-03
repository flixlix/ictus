import { build } from "esbuild";
import { gzipSync } from "node:zlib";
import { apply, parseDate } from "../dist/index.js";

function fmtBytes(n) {
  if (n < 1024) return `${n} B`;
  return `${(n / 1024).toFixed(1)} kB`;
}

async function bundle(entry, external = []) {
  const result = await build({
    entryPoints: [entry],
    bundle: true,
    minify: true,
    format: "esm",
    write: false,
    external,
    legalComments: "none",
  });
  const min = result.outputFiles[0].contents;
  const gzip = gzipSync(min, { level: 9 });
  return { min: min.byteLength, gzip: gzip.byteLength };
}

function bench(name, n, fn) {
  fn();
  const start = performance.now();
  for (let i = 0; i < n; i++) fn();
  const ms = performance.now() - start;
  return { name, n, ms, nsPerOp: (ms * 1e6) / n, opsPerSec: (n / ms) * 1000 };
}

function typeDate() {
  let value = "";
  let caret = 0;
  for (const key of ["1", "1", "1", "2", "2", "0", "2", "6"]) {
    const next = apply({ value, caret, key });
    value = next.value;
    caret = next.caret;
  }
  return value;
}

const core = await bundle("src/index.ts");
const react = await bundle("src/react.ts", ["react", "./index.js", "./index.ts"]);

const N = 200_000;
const applyDigit = bench("apply digit on empty", N, () => apply({ value: "", caret: 0, key: "4" }));
const applyReject = bench("apply rejected second digit", N, () =>
  apply({ value: "3", caret: 1, key: "9" }),
);
const applyFull = bench("apply extra year digit", N, () =>
  apply({ value: "11.12.2026", caret: 10, key: "1" }),
);
const applyBackspace = bench("apply backspace", N, () =>
  apply({ value: "11.12.", caret: 6, key: "Backspace" }),
);
const typeFull = bench("type 11.12.2026", N / 20, typeDate);
const parseValid = bench("parseDate valid", N, () => parseDate("11.12.2026"));
const parseInvalid = bench("parseDate invalid", N, () => parseDate("31.02.2020"));

if (typeDate() !== "11.12.2026") {
  throw new Error(`typing sequence produced ${typeDate()}`);
}

const report = {
  size: {
    core: { min: core.min, gzip: core.gzip },
    react: { min: react.min, gzip: react.gzip },
  },
  bench: [applyDigit, applyReject, applyFull, applyBackspace, typeFull, parseValid, parseInvalid],
};

console.log(JSON.stringify(report, null, 2));
console.log("");
console.log(`core   ${fmtBytes(core.min)} min  ·  ${fmtBytes(core.gzip)} gzip`);
console.log(`react  ${fmtBytes(react.min)} min  ·  ${fmtBytes(react.gzip)} gzip  (react external)`);
console.log("");
for (const row of report.bench) {
  console.log(
    `${row.name.padEnd(32)} ${(row.nsPerOp / 1000).toFixed(2)} µs/op  ·  ${Math.round(row.opsPerSec).toLocaleString()} ops/s`,
  );
}
