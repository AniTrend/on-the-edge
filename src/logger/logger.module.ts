import { Module } from '@danet/core';
import { LoggerService } from './logger.service.ts';
import { SecretModule } from '@scope/secret';
import { OtelStream } from './stream/otel.stream.ts';

@Module({
  imports: [SecretModule],
  injectables: [
    OtelStream,
    LoggerService,
  ],
})
export class LoggerModule {}
