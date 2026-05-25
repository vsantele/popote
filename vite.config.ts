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
});
