import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  {
    extends: "./vitest.config.ts",
    test: {
      name: "unit",
      include: ["src/**/*.test.ts"],
      exclude: ["src/test/integration/**", "node_modules/**", "dist", ".next"],
      environment: "node",
      setupFiles: ["./src/test/setup.ts"],
    },
  },
  {
    extends: "./vitest.config.ts",
    test: {
      name: "integration",
      include: ["src/test/integration/**/*.test.ts"],
      exclude: ["node_modules/**", "dist", ".next"],
      environment: "node",
      setupFiles: ["./src/test/integration/setup.ts"],
      testTimeout: 30_000,
      hookTimeout: 60_000,
      pool: "forks",
      poolOptions: { forks: { singleFork: false } },
    },
  },
]);
