import { describe, expect, it } from "vite-plus/test";

import {
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
});
