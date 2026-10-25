import adapter from "@sveltejs/adapter-cloudflare";
import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { voidPlugin } from "void";
import { defineConfig } from "vite-plus";
import { paraglideVitePlugin } from "@inlang/paraglide-js";
import { builtinModules } from "node:module";

export default defineConfig({
  build: {
    rolldownOptions: {
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
    sveltekit({
      compilerOptions: { experimental: { async: true } },
      // adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
      // If your environment is not supported, or you settled on a specific environment, switch out the adapter.
      // See https://svelte.dev/docs/kit/adapters for more information about adapters.
      adapter: adapter({
        config: "./.void-wrangler.jsonc",
        platformProxy: { configPath: "./.void-wrangler.jsonc" },
      }),

      serviceWorker: {
        register: false /* Manual registration in layout for better control */,
      },
      experimental: { remoteFunctions: true },
      tracing: { server: true },
    }),

    paraglideVitePlugin({
      project: "./project.inlang",
      outdir: "./src/lib/paraglide",
      emitTsDeclarations: true,
      strategy: ["url", "cookie", "baseLocale"],
    }),
  ],
  staged: { "*": "vp check --fix" },
  // Tell Vitest to use the `browser` entry points in `package.json` files,
  // even though it runs in Node. Guarded by `process.env.VITEST` so it never
  // affects `vp dev` / `vp build`. Recommended by the official Svelte testing
  // docs and `sv add vitest`.
  resolve: process.env.VITEST ? { conditions: ["browser"] } : undefined,
  server: {
    forwardConsole: true,
  },
  // `vp test` (Vitest) reads this `test` block. Per the Vite+ docs we keep all
  // test config here in `vite.config.ts` rather than a separate
  // `vitest.config.ts`. A client/server-aware split mirrors `sv add vitest`:
  // component / browser-facing tests run in jsdom, pure server-logic tests run
  // in node. Each project `extends` this config so the real SvelteKit plugin
  // pipeline (and thus `$app/*`, `#lib`, paraglide) is reused.
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
