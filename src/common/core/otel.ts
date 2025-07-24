import { NodeSDK } from '@otel/sdk-node';
import { getNodeAutoInstrumentations } from '@otel/auto-instrumentations-node';
import { OTLPTraceExporter } from '@otel/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@otel/exporter-metrics-otlp-http';
import { OTLPLogExporter } from '@otel/exporter-logs-otlp-http';
import { PeriodicExportingMetricReader } from '@otel/sdk-metrics';
import { LoggerProvider, BatchLogRecordProcessor } from '@otel/sdk-logs';
import { logs } from '@otel/api-logs';
import { resourceFromAttributes } from '@otel/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@otel/semantic-conventions';
import { env } from './env.ts';

// Create resource with service information
const resource = resourceFromAttributes({
  [ATTR_SERVICE_NAME]: env<string>('OTEL_DENO_SERVICE_NAME'),
  [ATTR_SERVICE_VERSION]: env<string>('DENO_VERSION'),
  'service.instance.id': `deno-${Date.now()}`,
  'deployment.environment': env<string>('DENO_ENV'),
});

// Initialize logs provider if logs endpoint is configured
let loggerProvider: LoggerProvider | undefined;
let logRecordProcessor: BatchLogRecordProcessor | undefined;
try {
  const logsEndpoint = env<string>('OTEL_EXPORTER_OTLP_LOGS_ENDPOINT');
  if (logsEndpoint) {
    const logExporter = new OTLPLogExporter({
      url: logsEndpoint,
    });
    
    logRecordProcessor = new BatchLogRecordProcessor(logExporter, {
      exportTimeoutMillis: 30000,
      maxExportBatchSize: 512,
      maxQueueSize: 2048,
      scheduledDelayMillis: 5000,
    });

    loggerProvider = new LoggerProvider({
      resource,
    });
    
    logs.setGlobalLoggerProvider(loggerProvider);
    console.info('common.core.otel: Logs provider initialized');
  }
} catch (_error) {
  console.warn('common.core.otel: Logs endpoint not configured, skipping logs provider initialization');
}

// Initialize the SDK with current best practices
const sdk = new NodeSDK({
  resource,
  traceExporter: new OTLPTraceExporter({
    url: env<string>('OTEL_EXPORTER_OTLP_TRACES_ENDPOINT'),
  }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: env<string>('OTEL_EXPORTER_OTLP_METRICS_ENDPOINT'),
    }),
    exportIntervalMillis: 30000, // Export metrics every 30 seconds
  }),
  // Add logs exporter if available
  ...(loggerProvider && {
    loggerProvider,
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
  console.debug('otel-init-start');
  console.info('common.core.otel: Initializing OTEL SDK');
  sdk.start();
  console.info('common.core.otel: OTEL SDK initialized successfully');
} catch (error) {
  console.error('common.core.otel: Failed to initialize OTEL SDK:', error);
} finally {
  console.debug('otel-init-end');
}

const shutdown = async (): Promise<void> => {
  console.debug('otel-shutdown-start');
  try {
    await sdk.shutdown();
    // Shutdown logs provider and processor if they were initialized
    if (logRecordProcessor) {
      await logRecordProcessor.shutdown();
    }
    if (loggerProvider) {
      await loggerProvider.shutdown();
    }
    console.info('common.core.otel: OTEL SDK shutdown successfully');
  } catch (error) {
    console.error('common.core.otel: Failed to shutdown OTEL SDK:', error);
  } finally {
    console.debug('otel-shutdown-end');
  }
};

export { shutdown };
