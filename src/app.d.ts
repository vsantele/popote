import { createAuth } from "$lib/server/auth";

type Auth = ReturnType<typeof createAuth>;
type AuthSession = Auth["$Infer"]["Session"];

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
  interface CloudflareTelemetryEnv {
    OTEL_EXPORTER_OTLP_ENDPOINT?: string;
    OTEL_EXPORTER_OTLP_TRACES_ENDPOINT?: string;
    OTEL_EXPORTER_OTLP_HEADERS?: string;
    OTEL_SERVICE_NAME?: string;
    OTEL_SERVICE_VERSION?: string;
  }

  namespace App {
    // interface Error {}
    interface Locals {
      user?: AuthSession["user"];
      session?: AuthSession["session"];
      auth: Auth;
    }
    // interface PageData {}
    // interface PageState {}
    interface Platform {
      env?: CloudflareTelemetryEnv & Record<string, unknown>;
      context?: {
        waitUntil(promise: Promise<unknown>): void;
      };
      ctx?: {
        waitUntil(promise: Promise<unknown>): void;
      };
    }
  }
}

export {};
