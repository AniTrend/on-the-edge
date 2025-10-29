import { Module } from '@danet/core';
import { ConfigModule } from './config/index.ts';
import { NewsModule } from './news/index.ts';
import { EpisodeModule } from './episodes/index.ts';
import { SeriesModule } from './series/index.ts';

@Module({
  imports: [ConfigModule, NewsModule, EpisodeModule, SeriesModule],
})
export class PackageModule {}
