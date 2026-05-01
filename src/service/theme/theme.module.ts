import { Module } from '@danet/core';
import { CacheModule } from '@scope/cache';
import { ExperimentModule } from '@scope/experiment';
import { LoggerModule } from '@scope/logger';
import { SecretModule } from '@scope/secret';
import { AnimeThemesModule } from '../animethemes/animethemes.module.ts';
import { ThemeService } from './theme.service.ts';

@Module({
  imports: [
    SecretModule,
    LoggerModule,
    ExperimentModule,
    CacheModule,
    AnimeThemesModule,
  ],
  injectables: [ThemeService],
})
export class ThemeModule {}
