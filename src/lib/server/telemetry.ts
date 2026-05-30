import { trace } from "@opentelemetry/api";

export type TelemetryBindings = Record<string, string | undefined> & {
  OTEL_EXPORTER_OTLP_ENDPOINT?: string;
  OTEL_EXPORTER_OTLP_TRACES_ENDPOINT?: string;
  OTEL_EXPORTER_OTLP_HEADERS?: string;
  OTEL_SERVICE_NAME?: string;
  OTEL_SERVICE_VERSION?: string;
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

type WaitUntilLike = {
  waitUntil(promise: Promise<unknown>): void;
};

type TelemetryState = {
  configKey?: string;
  provider?: import("@opentelemetry/sdk-trace-base").BasicTracerProvider | null;
  initPromise?: Promise<
    import("@opentelemetry/sdk-trace-base").BasicTracerProvider | null
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
    bindings.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT?.trim() ||
    bindings.OTEL_EXPORTER_OTLP_ENDPOINT?.trim();

  if (!tracesEndpoint) {
    return null;
  }

  return {
    exporter: {
      url: normalizeTracesEndpoint(tracesEndpoint),
      headers: parseOtelHeaders(bindings.OTEL_EXPORTER_OTLP_HEADERS),
    },
    service: {
      name: bindings.OTEL_SERVICE_NAME?.trim() || DEFAULT_SERVICE_NAME,
      version: bindings.OTEL_SERVICE_VERSION?.trim() || undefined,
    },
  };
}

function getConfigKey(config: TelemetryConfig): string {
  return JSON.stringify(config);
}

export async function ensureCloudflareTelemetry(
  bindings: TelemetryBindings,
): Promise<import("@opentelemetry/sdk-trace-base").BasicTracerProvider | null> {
  const config = resolveCloudflareTelemetryConfig(bindings);
  console.log("resolveCloudflareTelemetryConfig", JSON.stringify(config));
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
      { OTLPExporter, BatchTraceSpanProcessor },
      { BasicTracerProvider },
      { resourceFromAttributes },
      { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION },
    ] = await Promise.all([
      import("@microlabs/otel-cf-workers"),
      import("@opentelemetry/sdk-trace-base"),
      import("@opentelemetry/resources"),
      import("@opentelemetry/semantic-conventions"),
    ]);

    const exporter = new OTLPExporter({
      url: config.exporter.url,
      headers: config.exporter.headers,
    });

    const resource = resourceFromAttributes({
      [ATTR_SERVICE_NAME]: config.service.name,
      ...(config.service.version
        ? { [ATTR_SERVICE_VERSION]: config.service.version }
        : {}),
    });

    const provider = new BasicTracerProvider({
      resource,
      spanProcessors: [new BatchTraceSpanProcessor(exporter)],
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

export function flushCloudflareTelemetry(waitUntil?: WaitUntilLike | null) {
  if (!telemetryState.provider) {
    return;
  }

  const flushPromise = telemetryState.provider.forceFlush().catch((error) => {
    console.error("Failed to flush Cloudflare telemetry", error);
  });

  waitUntil?.waitUntil(flushPromise);
}
