import { Module } from '@danet/core';
import { CacheModule } from '@scope/cache';
import { LoggerModule } from '@scope/logger';
import { SecretModule } from '@scope/secret';
import { AnimeThemesService } from './animethemes.service.ts';

@Module({
  imports: [SecretModule, LoggerModule, CacheModule],
  injectables: [AnimeThemesService],
})
export class AnimeThemesModule { }
