// TODO(otel): Re-enable server instrumentation once it works on Cloudflare Workers.
//
// The block below is the previous Node-only OpenTelemetry setup. It cannot be
// bundled for the Cloudflare Workers runtime because:
//   - @opentelemetry/sdk-node + auto-instrumentations-node use require() to
//     dynamically load instrumentations (http, pg, mongodb, ...). Workers
//     don't expose `require`, so the worker fails at module-evaluation time
//     with: Calling `require` for "node:events" in an environment that
//     doesn't expose the `require` function.
//   - The OTLP gRPC exporters depend on node:http2, which Workers don't have.
//   - import-in-the-middle / node:module register hooks are Node ESM loader
//     hooks, not a Workers API.
//
// To restore on Workers, switch to a Workers-native OTel library
// (e.g. @microlabs/otel-cf-workers) instead of @opentelemetry/sdk-node.
//
/*
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { createAddHookMessageChannel } from "import-in-the-middle";
import { register } from "node:module";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-grpc";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-grpc";
import { BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";

const { registerOptions } = createAddHookMessageChannel();
register("import-in-the-middle/hook.mjs", import.meta.url, registerOptions);

const url = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

let cleanUrl = url;
if (url) {
  const urlObj = new URL(url);
  cleanUrl = `${urlObj.protocol}//localhost:${urlObj.port}`;
}

const sdk = new NodeSDK({
  serviceName: "popote-server",
  traceExporter: new OTLPTraceExporter({
    url: cleanUrl,
  }),
  metricReaders: [
    new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({
        url: cleanUrl,
      }),
    }),
  ],
  logRecordProcessors: [
    new BatchLogRecordProcessor(
      new OTLPLogExporter({
        url: cleanUrl,
      }),
    ),
  ],
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
*/
