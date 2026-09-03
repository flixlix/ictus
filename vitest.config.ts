import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "dom",
          include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
          exclude: ["tests/budget.test.ts"],
          environment: "jsdom",
        },
      },
      {
        test: {
          name: "budget",
          include: ["tests/budget.test.ts"],
          environment: "node",
        },
      },
    ],
  },
});
