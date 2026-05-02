import { createAuth } from "$lib/server/auth";

type Auth = ReturnType<typeof createAuth>;
type AuthSession = Auth["$Infer"]["Session"];

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
  namespace App {
    // interface Error {}
    interface Locals {
      deviceId?: string;
      user?: AuthSession["user"];
      session?: AuthSession["session"];
      auth: Auth;
    }
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

export {};
