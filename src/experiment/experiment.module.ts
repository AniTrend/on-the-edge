import { Module } from '@danet/core';
import { SecretModule } from '@scope/secret';
import { LoggerModule } from '@scope/logger';
import { ExperimentService } from './experiment.service.ts';

@Module({
  imports: [SecretModule, LoggerModule],
  injectables: [
    ExperimentService,
  ],
})
export class ExperimentModule {}
