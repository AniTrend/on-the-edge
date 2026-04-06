import { Module } from '@danet/core';
import { LoggerModule } from '@scope/logger';
import { ServiceModule } from '@scope/service';
import { DatabaseModule } from '@scope/database';
import { PeopleController } from './people.controller.ts';
import { PeopleService } from './people.service.ts';
import { PeopleRepository, PeopleResolver } from './repository/index.ts';

@Module({
  imports: [LoggerModule, ServiceModule, DatabaseModule],
  controllers: [PeopleController],
  injectables: [PeopleService, PeopleRepository, PeopleResolver],
})
export class PeopleModule {}
