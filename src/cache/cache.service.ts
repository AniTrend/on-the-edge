import { Cron, CronExpression, Injectable, Logger, SCOPE } from '@danet/core';
import { OnAppClose } from '@danet/core/hook';
import { CacheKey, CacheOptions, CacheValue } from './cache.types.ts';
import { computeRank } from './cache.util.ts';

/**
 * Lightweight in-memory cache for local development and tests.
 * Lacks persistence and memory limits; replace with Redis in production.
 */
@Injectable({ scope: SCOPE.GLOBAL })
export class CacheService implements OnAppClose {
  // TODO: Replace with actual cache client initialization in this instance `@db/redis`
  private readonly client: Map<CacheKey, CacheValue>;
  private readonly logger = new Logger(CacheService.name);

  constructor() {
    this.client = new Map();
  }

  onAppClose(): void | Promise<void> {
    this.client.clear();
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  private handleCron() {
    this.logger.log('Running cache cleanup cron job');
    const now = Date.now();
    for (const [k, v] of this.client.entries()) {
      const isExpired = v.expiresAt !== undefined && v.expiresAt <= now;
      if (isExpired) {
        this.client.delete(k);
        this.logger.log(
          `Disposed expired cache entry with key: ${String(k)}`,
        );
        continue;
      }
      if (v.rank < 0) {
        this.client.delete(k);
        this.logger.log(`Disposed low-rank cache entry with key: ${String(k)}`);
      }
    }
    this.logger.log('Cache cleanup cron job completed');
  }

  async get<T>(key: CacheKey): Promise<T | null> {
    const value = this.client.get(key);
    if (!value) {
      return null;
    }
    if (value.expiresAt !== undefined && value.expiresAt <= Date.now()) {
      this.client.delete(key);
      return null;
    }
    value.hit += 1;
    value.rank = computeRank(value.hit, value.expiresAt);
    this.client.set(key, value);
    return JSON.parse(value.data) as T;
  }

  async set<T>(key: CacheKey, value: T, opts?: CacheOptions): Promise<void> {
    const ttlSeconds = opts?.ttl;
    let expiresAt: number | undefined;
    if (ttlSeconds !== undefined) {
      const normalizedTtl = Math.max(0, ttlSeconds);
      expiresAt = Date.now() + (normalizedTtl * 1000);
    }
    this.client.set(
      key,
      {
        data: JSON.stringify(value),
        expiresAt,
        rank: computeRank(0, expiresAt),
        hit: 0,
      },
    );
  }

  async del(key: CacheKey): Promise<void> {
    this.client.delete(key);
  }
}
