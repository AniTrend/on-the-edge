import { Module } from '@danet/core';
import { ConfigService } from './config.service.ts';
import { DatabaseModule } from '@scope/database';
import { ExperimentModule } from '@scope/experiment';
import { LoggerModule } from '@scope/logger';
import { CacheModule } from '@scope/cache';
import { ConfigController } from './config.controller.ts';
import { ConfigRepository } from './config.repository.ts';

@Module({
  imports: [LoggerModule, CacheModule, DatabaseModule, ExperimentModule],
  controllers: [ConfigController],
  injectables: [ConfigRepository, ConfigService],
})
export class ConfigModule {}
