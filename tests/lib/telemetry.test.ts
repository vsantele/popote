import { describe, expect, it, vi } from "vite-plus/test";

import {
  ensureCloudflareTelemetry,
  flushCloudflareTelemetry,
  parseOtelHeaders,
  resolveCloudflareTelemetryConfig,
} from "../../src/lib/server/telemetry";

describe("Cloudflare telemetry config", () => {
  it("disables telemetry when no OTLP endpoint is configured", () => {
    expect(resolveCloudflareTelemetryConfig({})).toBeNull();
  });

  it("normalizes a collector base URL to the OTLP traces endpoint", () => {
    expect(
      resolveCloudflareTelemetryConfig({
        OTEL_EXPORTER_OTLP_ENDPOINT: "https://otel.example.com",
      }),
    ).toMatchObject({
      exporter: {
        url: "https://otel.example.com/v1/traces",
        headers: {},
      },
      service: {
        name: "popote-server",
      },
    });
  });

  it("configures SigNoz endpoint with access token header and custom service name", () => {
    expect(
      resolveCloudflareTelemetryConfig({
        SIGNOZ_ENDPOINT: "https://ingest.us.signoz.cloud:443",
        SIGNOZ_ACCESS_TOKEN: "sig-token-12345",
        SIGNOZ_SERVICE_NAME: "popote-custom",
        SIGNOZ_SERVICE_VERSION: "1.2.0",
      }),
    ).toMatchObject({
      exporter: {
        url: "https://ingest.us.signoz.cloud/v1/traces",
        headers: {
          "signoz-access-token": "sig-token-12345",
        },
      },
      service: {
        name: "popote-custom",
        version: "1.2.0",
      },
    });
  });

  it("sends a SigNoz Cloud ingestion key as signoz-ingestion-key", () => {
    expect(
      resolveCloudflareTelemetryConfig({
        SIGNOZ_ENDPOINT: "https://ingest.eu.signoz.cloud:443",
        SIGNOZ_INGESTION_KEY: "ingestion-key-12345",
      }),
    ).toMatchObject({
      exporter: {
        url: "https://ingest.eu.signoz.cloud/v1/traces",
        headers: {
          "signoz-ingestion-key": "ingestion-key-12345",
        },
      },
    });
  });

  it("keeps ingestion key and access token headers separate", () => {
    expect(
      resolveCloudflareTelemetryConfig({
        SIGNOZ_ENDPOINT: "https://ingest.eu.signoz.cloud:443",
        SIGNOZ_INGESTION_KEY: "ingestion-key-12345",
        SIGNOZ_ACCESS_TOKEN: "access-token-67890",
      }),
    ).toMatchObject({
      exporter: {
        headers: {
          "signoz-ingestion-key": "ingestion-key-12345",
          "signoz-access-token": "access-token-67890",
        },
      },
    });
  });

  it("prefers an explicitly configured OTLP header over a SigNoz variable", () => {
    expect(
      resolveCloudflareTelemetryConfig({
        SIGNOZ_ENDPOINT: "https://ingest.eu.signoz.cloud:443",
        SIGNOZ_INGESTION_KEY: "from-binding",
        OTEL_EXPORTER_OTLP_HEADERS: "signoz-ingestion-key=from-header",
      }),
    ).toMatchObject({
      exporter: {
        headers: { "signoz-ingestion-key": "from-header" },
      },
    });
  });

  it("supports self-hosted SigNoz endpoint without token", () => {
    expect(
      resolveCloudflareTelemetryConfig({
        SIGNOZ_ENDPOINT: "http://localhost:4318",
      }),
    ).toMatchObject({
      exporter: {
        url: "http://localhost:4318/v1/traces",
        headers: {},
      },
      service: {
        name: "popote-server",
      },
    });
  });

  it("parses OTLP headers from a newline-delimited bindings string", () => {
    expect(
      parseOtelHeaders("authorization=Bearer token\nx-api-key=abc123"),
    ).toEqual({
      authorization: "Bearer token",
      "x-api-key": "abc123",
    });
  });

  it("throws for malformed OTLP header segments", () => {
    expect(() => parseOtelHeaders("authorization")).toThrow(
      /invalid opentelemetry header/i,
    );
  });

  it("initializes and flushes tracer provider when endpoint is provided", async () => {
    const provider = await ensureCloudflareTelemetry({
      SIGNOZ_ENDPOINT: "http://localhost:4318",
    });
    expect(provider).not.toBeNull();

    const handedToWaitUntil: Promise<unknown>[] = [];
    flushCloudflareTelemetry((promise) => {
      handedToWaitUntil.push(promise);
    });

    expect(handedToWaitUntil).toHaveLength(1);
    await expect(handedToWaitUntil[0]).resolves.toBeUndefined();
  });

  it("does nothing when telemetry is not configured", async () => {
    await ensureCloudflareTelemetry({});

    const waitUntil = vi.fn();
    flushCloudflareTelemetry(waitUntil);

    expect(waitUntil).not.toHaveBeenCalled();
  });
});
