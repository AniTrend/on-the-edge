import { Module } from '@danet/core';
import { SecretModule } from '@scope/secret';
import { LoggerModule } from '@scope/logger';
import { SkyhookService } from './skyhook.service.ts';

@Module({
  imports: [SecretModule, LoggerModule],
  injectables: [SkyhookService],
})
export class SkyhookModule {}
