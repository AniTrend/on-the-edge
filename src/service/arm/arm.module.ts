import { Module } from '@danet/core';
import { SecretModule } from '@scope/secret';
import { LoggerModule } from '@scope/logger';
import { ArmService } from './arm.service.ts';

@Module({
  imports: [SecretModule, LoggerModule],
  injectables: [ArmService],
})
export class ArmModule {}
