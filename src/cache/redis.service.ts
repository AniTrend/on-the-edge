import { Injectable, Logger, SCOPE } from '@danet/core';
import { OnAppBootstrap, OnAppClose } from '@danet/core/hook';
import { CacheKey, CacheOptions } from './cache.types.ts';
import { SecretService } from '@scope/secret';
import { LoggerService } from '@scope/logger';
import { connect, Redis } from '@db/redis';
import { between } from '@onjara/optic/profileMeasure';
import { CacheService } from './cache.service.ts';

@Injectable({ scope: SCOPE.GLOBAL })
export class RedisService implements CacheService, OnAppBootstrap, OnAppClose {
  private redis?: Redis;
  private readonly logger = new Logger(RedisService.name);

  constructor(
    private readonly secret: SecretService,
    private readonly loggerService: LoggerService,
  ) {
  }

  onAppClose(): void | Promise<void> {
    this.redis?.close();
  }

  async get<T>(key: CacheKey): Promise<T | null> {
    const keyStr = String(key);
    const raw = await this.redis?.get(keyStr);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  }

  async set<T>(key: CacheKey, value: T, opts?: CacheOptions): Promise<void> {
    const keyStr = String(key);
    const ttlSeconds = opts?.ttl;
    if (ttlSeconds !== undefined) {
      // px expects milliseconds
      await this.redis?.set(keyStr, JSON.stringify(value), {
        px: ttlSeconds * 1000,
      });
      return;
    }
    await this.redis?.set(keyStr, JSON.stringify(value));
  }

  async del(key: CacheKey): Promise<void> {
    const keyStr = String(key);
    await this.redis?.del(keyStr);
  }

  async onAppBootstrap(): Promise<void> {
    try {
      const host = this.secret.get<string>('REDIS_HOST');
      const port = this.secret.get<number>('REDIS_PORT');
      this.loggerService.instance.mark('redis-connect-start');
      this.redis = await connect({ hostname: host, port });
      this.loggerService.instance.mark('redis-connect-end');
    } catch (err) {
      this.logger.error(
        `Redis connection failed during bootstrap: ${String(err)}`,
      );
      throw err;
    } finally {
      this.loggerService.instance.measure(between('redis-connect-start', 'redis-connect-end'));
    }
  }
}
