import { Injectable, Logger, SCOPE } from '@danet/core';
import { OnAppBootstrap, OnAppClose } from '@danet/core/hook';

import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { MongoDBInstrumentation } from '@opentelemetry/instrumentation-mongodb';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { SecretService } from '@scope/secret';
import { TelemetryFactory } from './telemetry.factory.ts';

@Injectable({ scope: SCOPE.GLOBAL })
export class TelemetryService implements OnAppBootstrap, OnAppClose {
  private readonly logger: Logger = new Logger(TelemetryService.name);
  private readonly sdk?: NodeSDK;
  private readonly enabled: boolean;

  constructor(
    private readonly factory: TelemetryFactory,
    secret: SecretService,
  ) {
    this.enabled = !secret.isCI();
    if (!this.enabled) {
      this.logger.log('OpenTelemetry disabled in CI mode');
      return;
    }
    this.sdk = this.initializeSDK(secret);
  }

  private initializeSDK(secret: SecretService): NodeSDK {
    return new NodeSDK({
      resource: this.factory.resource,
      traceExporter: new OTLPTraceExporter({
        url: secret.get('OTEL_EXPORTER_OTLP_TRACES_ENDPOINT'),
      }),
      metricReader: new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({
          url: secret.get('OTEL_EXPORTER_OTLP_METRICS_ENDPOINT'),
        }),
        exportIntervalMillis: 60000 * 5, // Export metrics every 5 minutes
      }),
      instrumentations: [
        new HttpInstrumentation(),
        new MongoDBInstrumentation(),
      ],
    });
  }

  onAppBootstrap(): void | Promise<void> {
    if (!this.enabled || !this.sdk) {
      return;
    }
    this.logger.log('Starting OpenTelemetry');
    return this.sdk.start();
  }

  async onAppClose(): Promise<void> {
    if (!this.enabled || !this.sdk) {
      return;
    }
    this.logger.log('Shutting down OpenTelemetry');
    await this.sdk.shutdown();
    await this.factory.loggerProvider.shutdown();
  }
}
