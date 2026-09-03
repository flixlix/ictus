import { build } from "esbuild";
import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { apply, parseDate } from "../src/index.js";

async function minGzip(entry: string, external: string[] = []) {
  const result = await build({
    entryPoints: [entry],
    bundle: true,
    minify: true,
    format: "esm",
    write: false,
    external,
    legalComments: "none",
  });
  const min = result.outputFiles[0]?.contents;
  if (!min) throw new Error(`no output for ${entry}`);
  return { min: min.byteLength, gzip: gzipSync(min, { level: 9 }).byteLength };
}

describe("bundle size", () => {
  it("core stays under 1.5 kB gzip", async () => {
    const { gzip } = await minGzip("src/index.ts");
    expect(gzip).toBeLessThan(1500);
  });

  it("react entry stays under 0.6 kB gzip", async () => {
    const { gzip } = await minGzip("src/react.ts", ["react", "./index.js", "./index.ts"]);
    expect(gzip).toBeLessThan(600);
  });
});

describe("apply cost", () => {
  it("handles 100,000 keystrokes in well under a frame budget", () => {
    const start = performance.now();
    for (let i = 0; i < 100_000; i++) {
      apply({ value: "", caret: 0, key: "4" });
    }
    expect(performance.now() - start).toBeLessThan(100);
  });

  it("types a complete date in a few microseconds", () => {
    const start = performance.now();
    let last = "";
    for (let i = 0; i < 5_000; i++) {
      let value = "";
      let caret = 0;
      for (const key of ["1", "1", "1", "2", "2", "0", "2", "6"]) {
        const next = apply({ value, caret, key });
        value = next.value;
        caret = next.caret;
      }
      last = value;
    }
    expect(last).toBe("11.12.2026");
    expect(performance.now() - start).toBeLessThan(100);
  });

  it("parses 100,000 dates quickly", () => {
    const start = performance.now();
    for (let i = 0; i < 100_000; i++) {
      parseDate("11.12.2026");
    }
    expect(performance.now() - start).toBeLessThan(150);
  });
});
