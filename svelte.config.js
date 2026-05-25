import adapter from "@sveltejs/adapter-cloudflare";
import { withVoidTSConfig } from "void/sveltekit";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    // adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
    // If your environment is not supported, or you settled on a specific environment, switch out the adapter.
    // See https://svelte.dev/docs/kit/adapters for more information about adapters.
    adapter: adapter(),
    serviceWorker: {
      register: false, // Manual registration in layout for better control
    },
    experimental: {
      tracing: {
        server: false,
      },
      instrumentation: {
        server: false,
      },
      remoteFunctions: true,
    },
    typescript: {
      config: withVoidTSConfig(),
    },
  },
  compilerOptions: {
    experimental: {
      async: true,
    },
  },
  vitePlugin: {
    dynamicCompileOptions: ({ filename }) =>
      filename.includes("node_modules") ? undefined : { runes: true },
  },
};

export default config;
