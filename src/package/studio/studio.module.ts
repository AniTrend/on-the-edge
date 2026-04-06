import { Module } from '@danet/core';
import { LoggerModule } from '@scope/logger';
import { ServiceModule } from '@scope/service';
import { DatabaseModule } from '@scope/database';
import { StudioController } from './studio.controller.ts';
import { StudioService } from './studio.service.ts';
import { StudioRepository, StudioResolver } from './repository/index.ts';

@Module({
  imports: [LoggerModule, ServiceModule, DatabaseModule],
  controllers: [StudioController],
  injectables: [StudioService, StudioRepository, StudioResolver],
})
export class StudioModule {}
