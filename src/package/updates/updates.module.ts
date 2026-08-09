import { Module } from '@danet/core';
import { LoggerModule } from '@scope/logger';
import { SecretModule } from '@scope/secret';
import { DatabaseModule } from '@scope/database';
import { GithubModule } from '@scope/service/github';
import { UpdatesController } from './updates.controller.ts';
import { UpdatesService } from './updates.service.ts';
import { UpdatesRepository } from './updates.repository.ts';

@Module({
  imports: [LoggerModule, SecretModule, DatabaseModule, GithubModule],
  controllers: [UpdatesController],
  injectables: [UpdatesService, UpdatesRepository],
})
export class UpdatesModule {}
