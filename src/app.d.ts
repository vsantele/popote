import { createAuth } from "#lib/server/auth.js";

type Auth = ReturnType<typeof createAuth>;
type AuthSession = Auth["$Infer"]["Session"];

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
  namespace App {
    // interface Error {}
    interface Locals {
      user?: AuthSession["user"];
      session?: AuthSession["session"];
      auth: Auth;
    }
    // interface PageData {}
    // interface PageState {}
    // Bindings are read from `cloudflare:workers` (env) in SvelteKit 3, not
    // from `event.platform`.
  }
}

export {};
