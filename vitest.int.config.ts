import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["test/setup.ts"],
    include: ["test/integration/**/*.int.spec.ts"],
    testTimeout: 30000,
  },
});
