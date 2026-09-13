import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.js"],
    fileParallelism: false,
    hookTimeout: 15000,
    testTimeout: 15000
  }
});
