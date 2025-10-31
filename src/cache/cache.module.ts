import { Module } from '@danet/core';
import { RedisService } from './redis.service.ts';
import { SecretModule } from '@scope/secret';
import { LoggerModule } from '@scope/logger';
import { TOKEN_CACHE_SERVICE } from './constants.ts';

@Module({
  imports: [SecretModule, LoggerModule],
  injectables: [{
    token: TOKEN_CACHE_SERVICE,
    useClass: RedisService,
  }],
})
export class CacheModule {}
