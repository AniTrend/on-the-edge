import { Module } from '@danet/core';
import { LoggerModule } from '@scope/logger';
import { ServiceModule } from '@scope/service';
import { DatabaseModule } from '@scope/database';
import { SeriesController } from './series.controller.ts';
import { SeriesService } from './series.service.ts';
import { SeriesRepository } from './repository/index.ts';
import { SeriesResolver } from './repository/series.resolver.ts';

@Module({
  imports: [
    LoggerModule,
    ServiceModule,
    DatabaseModule,
  ],
  controllers: [SeriesController],
  injectables: [SeriesRepository, SeriesService, SeriesResolver],
})
export class SeriesModule {}
