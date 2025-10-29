import { Module } from '@danet/core';
import { SecretModule } from '@scope/secret';
import { LoggerModule } from '@scope/logger';
import { NotifyService } from './notify.service.ts';

@Module({
  imports: [SecretModule, LoggerModule],
  injectables: [NotifyService],
})
export class NotifyModule {}
