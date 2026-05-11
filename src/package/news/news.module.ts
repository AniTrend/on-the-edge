import { Module } from '@danet/core';
import { LoggerModule } from '@scope/logger';
import { ExperimentModule } from '@scope/experiment';
import { OtakumodeModule } from '@scope/service/otakumode';
import { NewsController } from './news.controller.ts';
import { NewsService } from './news.service.ts';
import { NewsRepository } from './news.repository.ts';
import { DatabaseModule } from '@scope/database';
import { CacheModule } from '@scope/cache';

@Module({
  imports: [
    LoggerModule,
    ExperimentModule,
    OtakumodeModule,
    DatabaseModule,
    CacheModule,
  ],
  controllers: [NewsController],
  injectables: [NewsService, NewsRepository],
})
export class NewsModule {}
