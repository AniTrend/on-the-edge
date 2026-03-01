import { Injectable, Logger, SCOPE } from '@danet/core';
import { OnAppBootstrap, OnAppClose } from '@danet/core/hook';

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { SecretService } from '@scope/secret';
import { TelemetryFactory } from './telemetry.factory.ts';

@Injectable({ scope: SCOPE.GLOBAL })
export class TelemetryService implements OnAppBootstrap, OnAppClose {
  private readonly logger: Logger = new Logger(TelemetryService.name);
  private readonly sdk?: NodeSDK;
  private readonly enabled: boolean;

  constructor(factory: TelemetryFactory, secret: SecretService) {
    this.enabled = !secret.isCI();
    if (!this.enabled) {
      this.logger.log('OpenTelemetry disabled in CI mode');
      return;
    }
    this.sdk = this.initializeSDK(factory, secret);
  }

  private initializeSDK(
    factory: TelemetryFactory,
    secret: SecretService,
  ): NodeSDK {
    return new NodeSDK({
      resource: factory.resource,
      traceExporter: new OTLPTraceExporter({
        url: secret.get('OTEL_EXPORTER_OTLP_TRACES_ENDPOINT'),
      }),
      metricReader: new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({
          url: secret.get('OTEL_EXPORTER_OTLP_METRICS_ENDPOINT'),
        }),
        exportIntervalMillis: 60000 * 5, // Export metrics every 5 minutes
      }),
      logRecordProcessors: [factory.batchLogProcessor],
      instrumentations: [
        getNodeAutoInstrumentations({
          // Enable auto-instrumentation for HTTP, MongoDB, etc.
          '@opentelemetry/instrumentation-mongodb': {
            enabled: true,
          },
          '@opentelemetry/instrumentation-http': {
            enabled: true,
          },
          '@opentelemetry/instrumentation-fs': {
            enabled: false, // Disable file system instrumentation for performance
          },
        }),
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
    return this.sdk.shutdown();
  }
}
