import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config.js";

// Merge with the main Vite config so tests share the same plugins (React, base path, etc.)
// instead of relying on esbuild's implicit JSX handling.
export default mergeConfig(
  viteConfig({ mode: "test" }),
  defineConfig({
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["./src/__tests__/setup.js"],
      coverage: {
        provider: "v8",
        include: ["src/**/*.{js,jsx}"],
        exclude: ["src/__tests__/**", "src/main.jsx", "src/components/chatAI.js"],
      },
    },
  }),
);
