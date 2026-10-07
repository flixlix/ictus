import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const root = dirname(fileURLToPath(import.meta.url));
const { version } = JSON.parse(readFileSync(resolve(root, "../package.json"), "utf8")) as {
  version: string;
};

export default defineConfig({
  root,
  base: "./",
  plugins: [
    react(),
    {
      name: "ictus-version",
      transformIndexHtml(html) {
        return html.replaceAll("%ICTUS_VERSION%", version);
      },
    },
  ],
  resolve: {
    alias: {
      "@/components/ui/input": resolve(root, "demos/ui/input.tsx"),
      "ictus/react": resolve(root, "../src/react.ts"),
      ictus: resolve(root, "../src/index.ts"),
    },
  },
  build: {
    outDir: resolve(root, "../docs-dist"),
    emptyOutDir: true,
  },
});
