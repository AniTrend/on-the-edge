import { Module } from '@danet/core';
import { SecretModule } from '@scope/secret';
import { LoggerModule } from '@scope/logger';
import { TraktService } from './trakt.service.ts';

@Module({
  imports: [SecretModule, LoggerModule],
  injectables: [TraktService],
})
export class TraktModule {}
