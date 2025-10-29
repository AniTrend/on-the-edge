import { Module } from '@danet/core';
import { SecretModule } from '@scope/secret';
import { LoggerModule } from '@scope/logger';
import { JikanService } from './jikan.service.ts';

@Module({
  imports: [SecretModule, LoggerModule],
  injectables: [JikanService],
})
export class JikanModule {}
