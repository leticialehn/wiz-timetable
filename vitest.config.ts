// Standalone from vite.config.ts on purpose — vite.config.ts wraps
// @lovable.dev/vite-tanstack-config's defineConfig, whose own comment warns
// against re-adding its plugins (CON-4, docs/prd.md). Keeping Vitest's config
// separate avoids that entirely; it only needs the @/* alias, not the rest of
// the app's Vite/TanStack Start setup.
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    // Scoped to src/ on purpose — .aiox-core/ has its own Jest-based test
    // files (jest.mock, @aiox/testing) that aren't Vitest-compatible and
    // belong to the framework, not this app (L1/L2 per the boundary in
    // .claude/CLAUDE.md — never modify, and out of this story's scope).
    include: ["src/**/*.test.ts"],
  },
});
