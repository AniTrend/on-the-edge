import { Module } from '@danet/core';
import { LoggerModule } from '@scope/logger';
import { SecretModule } from '@scope/secret';
import { AnimeThemesService } from './animethemes.service.ts';

@Module({
  imports: [SecretModule, LoggerModule],
  injectables: [AnimeThemesService],
})
export class AnimeThemesModule {}
