import { Module } from '@danet/core';
import { SecretModule } from '@scope/secret';
import { MongoService } from './mongo.service.ts';
import { LoggerModule } from '@scope/logger';
import { DatabaseIndexService } from './index.service.ts';

@Module({
  imports: [SecretModule, LoggerModule],
  injectables: [
    MongoService,
    DatabaseIndexService,
  ],
})
export class DatabaseModule {}
