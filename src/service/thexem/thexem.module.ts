import { Module } from '@danet/core';
import { SecretModule } from '@scope/secret';
import { LoggerModule } from '@scope/logger';
import { TheXemService } from './thexem.service.ts';

@Module({
  imports: [SecretModule, LoggerModule],
  injectables: [TheXemService],
})
export class TheXemModule {}
