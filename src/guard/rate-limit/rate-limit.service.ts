import { Injectable, SCOPE } from '@danet/core';
import { OnAppBootstrap, OnAppClose } from '@danet/core/hook';
import { createLazyClient, type Redis } from '@db/redis';
import { SecretService } from '@scope/secret';
import { LoggerService } from '@scope/logger';
import { RateLimitResult } from './rate-limit.types.ts';

// TODO(#378): extract shared Redis connection provider if both services survive to production

const RATE_LIMIT_KEY_PREFIX = 'edge:ratelimit:';

@Injectable({ scope: SCOPE.GLOBAL })
export class RateLimitService implements OnAppBootstrap, OnAppClose {
  private readonly redis: Redis;

  constructor(
    secret: SecretService,
    private readonly logger: LoggerService,
  ) {
    this.redis = this.createRedisClient(secret);
  }

  private createRedisClient(secret: SecretService): Redis {
    const url = secret.get<string>('REDIS_URL');
    const { hostname, port, username, password } = new URL(url);
    const options: Parameters<typeof createLazyClient>[0] = {
      hostname,
      port: Number.parseInt(port, 10),
    };

    if (username.length > 0) {
      options.username = username;
    }
    if (password.length > 0) {
      options.password = password;
    }

    return createLazyClient(options);
  }

  private buildKey(key: string): string {
    return `${RATE_LIMIT_KEY_PREFIX}${key}`;
  }

  async checkLimit(
    key: string,
    maxRequests: number,
    windowSeconds: number,
  ): Promise<RateLimitResult> {
    const redisKey = this.buildKey(key);
    const currentCount = await this.redis.incr(redisKey);

    if (currentCount === 1) {
      await this.redis.expire(redisKey, windowSeconds);
    }

    const ttl = await this.redis.ttl(redisKey);
    const resetAt = Math.floor(Date.now() / 1000) + (ttl > 0 ? ttl : 0);

    const allowed = currentCount <= maxRequests;
    const remaining = Math.max(0, maxRequests - currentCount);

    return {
      allowed,
      currentCount,
      limit: maxRequests,
      remaining,
      resetAt,
    };
  }

  async resetLimit(key: string): Promise<void> {
    await this.redis.del(this.buildKey(key));
  }

  async onAppBootstrap(): Promise<void> {
    try {
      await this.redis.connect();
      const pong = await this.redis.ping();
      this.logger.instance.debug(
        `Rate-limit Redis connection validated: ${pong}`,
      );
    } catch (err) {
      this.logger.instance.error(
        'Rate-limit Redis connection failed during bootstrap',
        { cause: err },
      );
      throw err;
    }
  }

  async onAppClose(): Promise<void> {
    if (this.redis.isConnected) {
      this.redis.close();
    }
  }
}
