import { Module } from '@danet/core';
import { SecretModule } from '@scope/secret';
import { LoggerModule } from '@scope/logger';
import { GithubService } from './github.service.ts';

@Module({
  imports: [SecretModule, LoggerModule],
  injectables: [GithubService],
})
export class GithubModule {}
