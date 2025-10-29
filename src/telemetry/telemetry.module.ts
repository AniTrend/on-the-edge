import { Module } from '@danet/core';
import { SecretModule } from '@scope/secret';
import { TelemetryService } from './telemetry.service.ts';
import { TelemetryFactory } from './telemetry.factory.ts';

@Module({
  imports: [SecretModule],
  injectables: [TelemetryFactory, TelemetryService],
})
export class TelemetryModule {}
