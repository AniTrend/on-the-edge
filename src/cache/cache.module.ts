import { Module } from '@danet/core';
import { CacheService } from './cache.service.ts';

@Module({
  //imports: [ScheduleModule],
  injectables: [CacheService],
})
export class CacheModule {}
