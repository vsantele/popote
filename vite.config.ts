import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { voidPlugin } from "void";
import { defineConfig } from "vite-plus";

export default defineConfig({
  fmt: {
    pluginSearchDirs: ["."],
    printWidth: 80,
    sortPackageJson: false,
    ignorePatterns: [],
  },
  plugins: [voidPlugin({ persistTo: ".void" }), tailwindcss(), sveltekit()],
  staged: { "*": "vp check --fix" },
});
