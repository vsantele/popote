import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { voidPlugin } from "void";
import { defineConfig } from "vite-plus";
import { paraglideVitePlugin } from "@inlang/paraglide-js";
import { builtinModules } from "node:module";

export default defineConfig({
  build: {
    rollupOptions: {
      external: [
        /^node:/,
        "async_hooks",
        "crypto",
        "fs",
        "fs/promises",
        "os",
        "path",
        "process",
        "stream",
        "util",
        "buffer",
        ...builtinModules,
      ],
    },
  },
  ssr: { external: [...builtinModules] },
  fmt: {
    pluginSearchDirs: ["."],
    printWidth: 80,
    sortPackageJson: false,
    ignorePatterns: [],
  },
  plugins: [
    voidPlugin({ persistTo: ".void" }),
    tailwindcss(),
    sveltekit(),
    paraglideVitePlugin({
      project: "./project.inlang",
      outdir: "./src/lib/paraglide",
      strategy: ["url", "cookie", "baseLocale"],
    }),
  ],
  staged: { "*": "vp check --fix" },
  // Tell Vitest to use the `browser` entry points in `package.json` files,
  // even though it runs in Node. Guarded by `process.env.VITEST` so it never
  // affects `vp dev` / `vp build`. Recommended by the official Svelte testing
  // docs and `sv add vitest`.
  resolve: process.env.VITEST ? { conditions: ["browser"] } : undefined,
  // `vp test` (Vitest) reads this `test` block. Per the Vite+ docs we keep all
  // test config here in `vite.config.ts` rather than a separate
  // `vitest.config.ts`. A client/server-aware split mirrors `sv add vitest`:
  // component / browser-facing tests run in jsdom, pure server-logic tests run
  // in node. Each project `extends` this config so the real SvelteKit plugin
  // pipeline (and thus `$app/*`, `$lib`, paraglide) is reused.
  test: {
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
    projects: [
      {
        extends: true,
        test: {
          name: "client",
          environment: "jsdom",
          globals: true,
          clearMocks: true,
          setupFiles: ["./src/lib/test/setup.ts"],
          // Component tests and any rune-using `*.svelte.test.ts` files.
          include: [
            "tests/**/*.svelte.{test,spec}.{js,ts}",
            "tests/routes/**/*.{test,spec}.{js,ts}",
          ],
        },
      },
      {
        extends: true,
        test: {
          name: "server",
          environment: "node",
          globals: true,
          // Pure server / node logic (no DOM): telemetry, routing hooks, etc.
          include: ["tests/**/*.{test,spec}.{js,ts}"],
          exclude: [
            "tests/**/*.svelte.{test,spec}.{js,ts}",
            "tests/routes/**/*.{test,spec}.{js,ts}",
          ],
        },
      },
    ],
  },
});
