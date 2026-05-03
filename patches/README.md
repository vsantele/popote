# Patches

## `@void-sdk__void@0.6.1.patch`

Two bugs in `@void-sdk/void@0.6.1`'s `dist/deploy-GEj13pFE.mjs` that block
`pnpm void deploy` for projects using SvelteKit + sqlite migrations:

1. **Migration handler path resolution** (line ~1327)

   The original looked up `migration-handler.mjs` at `<pkg>/runtime/...` and
   `<pkg>/../dist/runtime/...`, but the file actually ships at
   `<pkg>/dist/runtime/...`. Failed with:

   > Migration handler not found: migration-handler.mjs.
   > Run "pnpm -C packages/void build" first.

   Fix: try `dist/runtime/` first, fall back to the original two paths.

2. **Worker entry filename detection in `bundleEntry`** (line ~1372)

   Used `readdirSync(outDir).filter(f => f.startsWith("index"))[0]` to find
   the bundled entry. With SvelteKit, Vite emits both `index.js` (the entry)
   and `index-server-<hash>.js` (a Svelte runtime chunk), and on Windows
   readdir order picks the chunk first. The wrapper then renames the chunk
   to `__original.js` and tries to import its `default` — which doesn't
   exist. Cloudflare rejects the upload with:

   > The requested module './\_\_original.js' does not provide an export
   > named 'default'

   Fix: match `^index\.(m?js|cjs)$` exactly so chunks are ignored.

Registered in `pnpm-workspace.yaml` under `patchedDependencies`. Once these
fixes ship upstream, drop the patch entry and delete this file.
