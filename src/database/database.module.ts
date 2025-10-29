import { Module } from '@danet/core';
import { SecretModule } from '@scope/secret';
import { MongoService } from './mongo.service.ts';
import { LoggerModule } from '@scope/logger';

@Module({
  imports: [SecretModule, LoggerModule],
  injectables: [
    MongoService,
  ],
})
export class DatabaseModule {}
