import { NodeSDK } from "@otel/sdk-node";
import { getNodeAutoInstrumentations } from "@otel/auto-instrumentations-node";
import { OTLPTraceExporter } from "@otel/exporter-trace-otlp-http";
import { OTLPMetricExporter } from "@otel/exporter-metrics-otlp-http";
import { PeriodicExportingMetricReader } from "npm:@opentelemetry/sdk-metrics@2.0.1";
import { resourceFromAttributes } from "@otel/resources";
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@otel/semantic-conventions";
import { between } from '@optic';
import { logger } from './logger.ts';
import { env } from './env.ts';

// Initialize the SDK with current best practices
const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: env<string>("OTEL_DENO_SERVICE_NAME"),
    [ATTR_SERVICE_VERSION]: "0.5.0",
    "service.instance.id": `deno-${Date.now()}`,
    "deployment.environment": env<string>("DENO_ENV"),
  }),
  traceExporter: new OTLPTraceExporter({
    url: env<string>("OTEL_EXPORTER_OTLP_TRACES_ENDPOINT"),
  }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: env<string>("OTEL_EXPORTER_OTLP_METRICS_ENDPOINT"),
    }),
    exportIntervalMillis: 30000, // Export metrics every 30 seconds
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      // Enable auto-instrumentation for HTTP, MongoDB, etc.
      '@opentelemetry/instrumentation-fs': {
        enabled: false, // Disable file system instrumentation for performance
      },
    }),
  ],
});

try {
  logger.mark('otel-init-start');
  logger.info('common.core.otel: Initializing OTEL SDK');
  sdk.start();
  logger.info('common.core.otel: OTEL SDK initialized successfully');
} catch (error) {
  logger.error("common.core.otel: Failed to initialize OTEL SDK:", error);
} finally {
  logger.mark('otel-init-end');
  logger.measure(between('otel-init-start', 'otel-init-end'));
}

const shutdown = async (): Promise<void> => {
  logger.mark('otel-shutdown-start');
  try {
    await sdk.shutdown();
    logger.info('common.core.otel: OTEL SDK shutdown successfully');
  } catch (error) {
    logger.error("common.core.otel: Failed to shutdown OTEL SDK:", error);
  } finally {
    logger.mark('otel-shutdown-end');
    logger.measure(between('otel-shutdown-start', 'otel-shutdown-end'));
  }
};

export { shutdown };
