import { Module } from '@danet/core';
import { LoggerModule } from '@scope/logger';
import { DatabaseModule } from '@scope/database';
import { ExperimentModule } from '@scope/experiment';
import { RateLimitModule } from '@scope/guard/rate-limit';
import { PushSenderModule } from '@scope/service/push-sender';
import { PushController } from './push.controller.ts';
import { PushService } from './push.service.ts';
import { PushRepository } from './push.repository.ts';
import { PushDeliveryAttemptRepository } from './push-delivery-attempt.repository.ts';
import { PushRetryService } from './push-retry.service.ts';

@Module({
  imports: [
    LoggerModule,
    DatabaseModule,
    ExperimentModule,
    RateLimitModule,
    PushSenderModule,
  ],
  controllers: [PushController],
  injectables: [
    PushService,
    PushRepository,
    PushDeliveryAttemptRepository,
    PushRetryService,
  ],
})
export class PushModule {}
