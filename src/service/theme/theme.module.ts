import { Module } from '@danet/core';
import { SecretModule } from '@scope/secret';
import { LoggerModule } from '@scope/logger';
import { ThemeService } from './theme.service.ts';

@Module({
  imports: [SecretModule, LoggerModule],
  injectables: [ThemeService],
})
export class ThemeModule {}
