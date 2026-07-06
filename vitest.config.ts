import { configDefaults, defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    fileParallelism: false,
    testTimeout: 20000,
    setupFiles: ["./vitest.setup.ts"],
    exclude: [...configDefaults.exclude, "**/.worktrees/**", "**/worktrees/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "server-only": path.resolve(__dirname, "__tests__/fixtures/server-only-empty.ts"),
    },
  },
});
