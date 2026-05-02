import { defineConfig } from "vite-plus";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { resolve } from "path";

export default defineConfig({
  plugins: [svelte()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/lib/test/setup.ts"],
    include: ["tests/**/*.{test,spec}.{js,ts}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "src/lib/test/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/mockData.ts",
      ],
    },
  },
  resolve: {
    alias: {
      $lib: resolve("./src/lib"),
      $app: resolve("./node_modules/@sveltejs/kit/src/runtime/app"),
    },
  },
});
