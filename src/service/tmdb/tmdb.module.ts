import { Module } from '@danet/core';
import { SecretModule } from '@scope/secret';
import { LoggerModule } from '@scope/logger';
import { TmdbService } from './tmdb.service.ts';
import { CacheModule } from '@scope/cache';

@Module({
  imports: [SecretModule, LoggerModule, CacheModule],
  injectables: [TmdbService],
})
export class TmdbModule {}
