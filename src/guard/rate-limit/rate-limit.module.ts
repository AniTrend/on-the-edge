import { Module } from '@danet/core';
import { SecretModule } from '@scope/secret';
import { LoggerModule } from '@scope/logger';
import { RateLimitService } from './rate-limit.service.ts';
import { RateLimitGuard } from './rate-limit.guard.ts';

@Module({
  imports: [SecretModule, LoggerModule],
  injectables: [RateLimitService, RateLimitGuard],
})
export class RateLimitModule {}
