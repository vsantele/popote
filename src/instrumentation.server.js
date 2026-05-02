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
