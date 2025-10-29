import { Module } from '@danet/core';
import { SecretModule } from '@scope/secret';
import { LoggerModule } from '@scope/logger';
import { OtakumodeService } from './otakumode.service.ts';

@Module({
  imports: [SecretModule, LoggerModule],
  injectables: [OtakumodeService],
})
export class OtakumodeModule {}
