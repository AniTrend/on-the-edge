import { Cron, CronExpression, Injectable, Logger, SCOPE } from '@danet/core';
import { OnAppClose } from '@danet/core/hook';
import { CacheKey, CacheOptions, CacheValue } from './cache.types.ts';
import { computeRank } from './cache.util.ts';

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
    // Simple cleanup logic: remove entries with rank below a threshold
    // In a real-world scenario, this could be more sophisticated
    // e.g., using a priority queue or a sorted set in Redis
    // Here, we just log the cleanup action
    for (const [k, v] of this.client.entries()) {
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
    value.hit += 1;
    value.rank = computeRank(value.hit, value.expiresAt);
    this.client.set(key, value);
    return JSON.parse(value.data) as T;
  }

  async set<T>(key: CacheKey, value: T, opts?: CacheOptions): Promise<void> {
    this.client.set(
      key,
      {
        data: JSON.stringify(value),
        expiresAt: opts?.ttl ? (Date.now() + (opts.ttl * 1000)) : undefined,
        rank: 0,
        hit: 0,
      },
    );
  }

  async del(key: CacheKey): Promise<void> {
    this.client.delete(key);
  }
}
