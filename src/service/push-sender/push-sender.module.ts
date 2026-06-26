import { Module } from '@danet/core';
import { SecretModule } from '@scope/secret';
import { LoggerModule } from '@scope/logger';
import { PushSenderService } from './push-sender.service.ts';

@Module({
  imports: [SecretModule, LoggerModule],
  injectables: [PushSenderService],
})
export class PushSenderModule {}
