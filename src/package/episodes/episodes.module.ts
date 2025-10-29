import { Module } from '@danet/core';
import { LoggerModule } from '@scope/logger';
import { DatabaseModule } from '@scope/database';
import { ServiceModule } from '@scope/service';
import { EpisodeController } from './episodes.controller.ts';
import { EpisodeService } from './episodes.service.ts';
import { EpisodesRepository } from './repository/index.ts';
import { EpisodesResolver } from './repository/episodes.resolver.ts';
import { ExperimentModule } from '@scope/experiment';

@Module({
  imports: [LoggerModule, DatabaseModule, ServiceModule, ExperimentModule],
  controllers: [EpisodeController],
  injectables: [EpisodeService, EpisodesRepository, EpisodesResolver],
})
export class EpisodeModule {}
