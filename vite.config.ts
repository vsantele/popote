import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { voidPlugin } from "void";
import { defineConfig } from "vite-plus";
import { paraglideVitePlugin } from "@inlang/paraglide-js";

export default defineConfig({
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
