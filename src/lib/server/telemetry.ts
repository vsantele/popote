import { trace } from "@opentelemetry/api";

export type TelemetryBindings = Record<string, string | undefined> & {
  OTEL_EXPORTER_OTLP_ENDPOINT?: string;
  OTEL_EXPORTER_OTLP_TRACES_ENDPOINT?: string;
  OTEL_EXPORTER_OTLP_HEADERS?: string;
  OTEL_SERVICE_NAME?: string;
  OTEL_SERVICE_VERSION?: string;
  SIGNOZ_ENDPOINT?: string;
  SIGNOZ_TRACES_ENDPOINT?: string;
  SIGNOZ_ACCESS_TOKEN?: string;
  SIGNOZ_INGESTION_KEY?: string;
  SIGNOZ_SERVICE_NAME?: string;
  SIGNOZ_SERVICE_VERSION?: string;
};

type TelemetryConfig = {
  exporter: {
    url: string;
    headers: Record<string, string>;
  };
  service: {
    name: string;
    version?: string;
  };
};

/**
 * `waitUntil` from `cloudflare:workers`, which keeps the OTLP export alive
 * after the response has been returned.
 */
type WaitUntil = (promise: Promise<unknown>) => void;

type TelemetryState = {
  configKey?: string;
  provider?: import("@opentelemetry/sdk-trace").TracerProvider | null;
  initPromise?: Promise<
    import("@opentelemetry/sdk-trace").TracerProvider | null
  >;
};

const DEFAULT_SERVICE_NAME = "popote-server";
const telemetryState: TelemetryState = {};

export function parseOtelHeaders(value?: string): Record<string, string> {
  if (!value) {
    return {};
  }

  return value
    .split(/\r?\n|,(?=\s*[^\s=]+=)/)
    .map((header) => header.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((headers, header) => {
      const separatorIndex = header.indexOf("=");

      if (separatorIndex <= 0 || separatorIndex === header.length - 1) {
        throw new Error(`Invalid OpenTelemetry header segment: ${header}`);
      }

      const key = header.slice(0, separatorIndex).trim();
      const headerValue = header.slice(separatorIndex + 1).trim();

      if (!key || !headerValue) {
        throw new Error(`Invalid OpenTelemetry header segment: ${header}`);
      }

      headers[key] = headerValue;
      return headers;
    }, {});
}

function normalizeTracesEndpoint(url: string): string {
  const normalized = new URL(url);

  if (!normalized.pathname || normalized.pathname === "/") {
    normalized.pathname = "/v1/traces";
    return normalized.toString();
  }

  if (!normalized.pathname.endsWith("/v1/traces")) {
    normalized.pathname = `${normalized.pathname.replace(/\/$/, "")}/v1/traces`;
  }

  return normalized.toString();
}

export function resolveCloudflareTelemetryConfig(
  bindings: TelemetryBindings,
): TelemetryConfig | null {
  const tracesEndpoint =
    bindings.SIGNOZ_TRACES_ENDPOINT?.trim() ||
    bindings.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT?.trim() ||
    bindings.SIGNOZ_ENDPOINT?.trim() ||
    bindings.OTEL_EXPORTER_OTLP_ENDPOINT?.trim();

  if (!tracesEndpoint) {
    return null;
  }

  const headers = parseOtelHeaders(bindings.OTEL_EXPORTER_OTLP_HEADERS);
  // SigNoz Cloud authenticates OTLP ingestion with `signoz-ingestion-key`, while
  // a self-hosted SigNoz behind an API key uses `signoz-access-token`. They are
  // distinct headers, so each variable maps to its own.
  const sigNozHeaders = {
    "signoz-ingestion-key": bindings.SIGNOZ_INGESTION_KEY?.trim(),
    "signoz-access-token": bindings.SIGNOZ_ACCESS_TOKEN?.trim(),
  };

  for (const [name, value] of Object.entries(sigNozHeaders)) {
    if (value && !headers[name]) {
      headers[name] = value;
    }
  }

  return {
    exporter: {
      url: normalizeTracesEndpoint(tracesEndpoint),
      headers,
    },
    service: {
      name:
        bindings.SIGNOZ_SERVICE_NAME?.trim() ||
        bindings.OTEL_SERVICE_NAME?.trim() ||
        DEFAULT_SERVICE_NAME,
      version:
        bindings.SIGNOZ_SERVICE_VERSION?.trim() ||
        bindings.OTEL_SERVICE_VERSION?.trim() ||
        undefined,
    },
  };
}

function getConfigKey(config: TelemetryConfig): string {
  return JSON.stringify(config);
}

export async function ensureCloudflareTelemetry(
  bindings: TelemetryBindings,
): Promise<import("@opentelemetry/sdk-trace").TracerProvider | null> {
  const config = resolveCloudflareTelemetryConfig(bindings);
  if (!config) {
    telemetryState.provider = null;
    telemetryState.initPromise = Promise.resolve(null);
    telemetryState.configKey = undefined;
    return null;
  }

  const configKey = getConfigKey(config);

  if (telemetryState.configKey === configKey && telemetryState.initPromise) {
    return telemetryState.initPromise;
  }

  telemetryState.configKey = configKey;
  telemetryState.initPromise = (async () => {
    const [
      { OTLPTraceExporter },
      { TracerProvider, BatchSpanProcessor },
      { resourceFromAttributes },
      { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION },
    ] = await Promise.all([
      import("@opentelemetry/exporter-trace-otlp-http"),
      import("@opentelemetry/sdk-trace"),
      import("@opentelemetry/resources"),
      import("@opentelemetry/semantic-conventions"),
    ]);

    const exporter = new OTLPTraceExporter({
      url: config.exporter.url,
      headers: config.exporter.headers,
    });

    const resource = resourceFromAttributes({
      [ATTR_SERVICE_NAME]: config.service.name,
      ...(config.service.version
        ? { [ATTR_SERVICE_VERSION]: config.service.version }
        : {}),
    });

    const provider = new TracerProvider({
      resource,
      spanProcessors: [new BatchSpanProcessor({ exporter })],
    });

    trace.setGlobalTracerProvider(provider);
    telemetryState.provider = provider;
    return provider;
  })().catch((error) => {
    console.error("Failed to initialize Cloudflare telemetry", error);
    telemetryState.provider = null;
    return null;
  });

  return telemetryState.initPromise;
}

export function flushCloudflareTelemetry(waitUntil?: WaitUntil | null) {
  if (!telemetryState.provider) {
    return;
  }

  const flushPromise = telemetryState.provider.forceFlush().catch((error) => {
    console.error("Failed to flush Cloudflare telemetry", error);
  });

  waitUntil?.(flushPromise);
}
