import { Module } from '@danet/core';
import { LoggerModule } from '@scope/logger';
import { SecretModule } from '@scope/secret';
import { AniListService } from './anilist.service.ts';

@Module({
  imports: [SecretModule, LoggerModule],
  injectables: [AniListService],
})
export class AniListModule { }
