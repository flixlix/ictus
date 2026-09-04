import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const root = dirname(fileURLToPath(import.meta.url));
const { version } = JSON.parse(readFileSync(resolve(root, "../package.json"), "utf8")) as {
  version: string;
};

export default defineConfig({
  root,
  base: "./",
  plugins: [
    {
      name: "ictus-version",
      transformIndexHtml(html) {
        return html.replaceAll("%ICTUS_VERSION%", version);
      },
    },
  ],
  build: {
    outDir: resolve(root, "../docs-dist"),
    emptyOutDir: true,
  },
});
