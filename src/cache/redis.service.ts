import { Injectable, SCOPE } from '@danet/core';
import { OnAppBootstrap, OnAppClose } from '@danet/core/hook';
import { CacheKey, CacheOptions } from './cache.types.ts';
import { SecretService } from '@scope/secret';
import { LoggerService } from '@scope/logger';
import { createLazyClient, type Redis } from '@db/redis';
import { between } from '@onjara/optic/profileMeasure';
import { CacheService } from './cache.service.ts';

@Injectable({ scope: SCOPE.GLOBAL })
export class RedisService implements CacheService, OnAppBootstrap, OnAppClose {
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

  async has<T>(key: CacheKey): Promise<boolean> {
    this.logger.instance.debug(`Checking cache existence for key: ${key}`);
    this.logger.instance.mark('redis-has-start');
    const raw = await this.redis.exists(key);
    this.logger.instance.mark('redis-has-end');
    this.logger.instance.measure(between('redis-has-start', 'redis-has-end'));
    return raw === 1;
  }

  async get<T>(key: CacheKey): Promise<T | null> {
    this.logger.instance.debug(`Fetching cache for key: ${key}`);
    this.logger.instance.mark('redis-get-start');
    const raw = await this.redis.get(key);
    this.logger.instance.mark('redis-get-end');
    this.logger.instance.measure(between('redis-get-start', 'redis-get-end'));
    if (!raw) return null;
    return JSON.parse(raw) as T;
  }

  async set<T>(key: CacheKey, value: T, opts?: CacheOptions): Promise<void> {
    this.logger.instance.debug(`Setting cache for key: ${key}`);
    this.logger.instance.mark('redis-set-start');

    const redisOpts: { ex?: number; nx?: boolean } = {};
    if (opts?.ttl) redisOpts.ex = opts.ttl; // seconds
    if (opts?.overwrite === false) redisOpts.nx = true; // only set if not exists

    const result = await this.redis.set(key, JSON.stringify(value), redisOpts)
      .catch((err) => {
        this.logger.instance.error(
          `Redis SET operation failed for key: ${key}`,
          { cause: err },
        );
        return undefined;
      });

    if (result === 'OK') {
      this.logger.instance.debug(`Successfully set key: ${key}`);
    } else if (result === null) {
      this.logger.instance.debug(
        `SET returned null (NX prevented overwrite) for key: ${key}`,
      );
    } else {
      this.logger.instance.warn(
        `Redis SET returned unexpected result: ${result} for key: ${key}`,
      );
    }

    this.logger.instance.mark('redis-set-end');
    this.logger.instance.measure(between('redis-set-start', 'redis-set-end'));
  }

  async del(key: CacheKey): Promise<void> {
    this.logger.instance.debug(`Deleting cache for key: ${key}`);
    this.logger.instance.mark('redis-del-start');
    await this.redis.del(key);
    this.logger.instance.mark('redis-del-end');
    this.logger.instance.measure(between('redis-del-start', 'redis-del-end'));
  }

  async onAppBootstrap(): Promise<void> {
    try {
      this.logger.instance.mark('redis-connect-start');
      await this.redis.connect();
      const pong = await this.redis.ping();
      this.logger.instance.debug(`Redis connection validated: ${pong}`);
    } catch (err) {
      this.logger.instance.error('Redis connection failed during bootstrap', {
        cause: err,
      });
      throw err;
    } finally {
      this.logger.instance.mark('redis-connect-end');
      this.logger.instance.measure(
        between('redis-connect-start', 'redis-connect-end'),
      );
    }
  }

  async onAppClose(): Promise<void> {
    if (this.redis.isConnected) {
      this.redis.close();
    }
  }
}
