import { Module } from '@danet/core';
import { ConfigModule } from './config/index.ts';
import { NewsModule } from './news/index.ts';
import { EpisodeModule } from './episodes/index.ts';
import { SeriesModule } from './series/index.ts';
import { StudioModule } from './studio/index.ts';
import { PeopleModule } from './people/index.ts';
import { CharacterModule } from './character/index.ts';
import { PushModule } from './push/index.ts';
import { UpdatesModule } from './updates/index.ts';

@Module({
  imports: [
    ConfigModule,
    NewsModule,
    EpisodeModule,
    SeriesModule,
    StudioModule,
    PeopleModule,
    CharacterModule,
    PushModule,
    UpdatesModule,
  ],
})
export class PackageModule {}
