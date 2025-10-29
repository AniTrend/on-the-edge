import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { Resource, resourceFromAttributes } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';
import { SecretService } from '@scope/secret';
import { Injectable, Logger } from '@danet/core';
import {
  BatchLogRecordProcessor,
  LoggerProvider,
} from '@opentelemetry/sdk-logs';
import { logs } from '@opentelemetry/api-logs';

@Injectable()
export class TelemetryFactory {
  public readonly resource: Resource;
  public readonly logExporter: OTLPLogExporter;
  public readonly loggerProvider: LoggerProvider;
  public readonly batchLogProcessor: BatchLogRecordProcessor;
  private readonly logger = new Logger(TelemetryFactory.name);

  constructor(secret: SecretService) {
    this.logExporter = new OTLPLogExporter({
      url: secret.get('OTEL_EXPORTER_OTLP_LOGS_ENDPOINT'),
    });
    this.resource = resourceFromAttributes({
      [ATTR_SERVICE_NAME]: secret.get('OTEL_DENO_SERVICE_NAME'),
      [ATTR_SERVICE_VERSION]: Deno.version.deno,
      'service.instance.id': `deno-${Date.now()}`,
      'deployment.environment': secret.environment(),
    });
    this.batchLogProcessor = new BatchLogRecordProcessor(
      this.logExporter,
      {
        exportTimeoutMillis: 30000,
        maxExportBatchSize: 512,
        maxQueueSize: 2048,
        scheduledDelayMillis: 5000,
      },
    );
    this.loggerProvider = new LoggerProvider({
      resource: this.resource,
    });
    this.logger.log('Setting global logger provider for OpenTelemetry');
    logs.setGlobalLoggerProvider(this.loggerProvider);
  }
}
