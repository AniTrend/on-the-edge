import { Module } from '@danet/core';
import { SecretModule } from '@scope/secret';
import { LoggerModule } from '@scope/logger';
import { TmdbService } from './tmdb.service.ts';

@Module({
  imports: [SecretModule, LoggerModule],
  injectables: [TmdbService],
})
export class TmdbModule {}
