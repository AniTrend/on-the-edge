import { CacheService } from '../cache.service.ts';
import { CacheKey, CacheOptions } from '../cache.types.ts';

export const createCacheStub = (): CacheService => {
  const map = new Map<CacheKey, unknown>();
  return {
    get: function <T>(key: CacheKey): Promise<T | null> {
      return Promise.resolve(map.get(key) as T | null);
    },
    set: function <T>(
      key: CacheKey,
      value: T,
      _opts?: CacheOptions,
    ): Promise<void> {
      map.set(key, value);
      return Promise.resolve();
    },
    del: function (key: CacheKey): Promise<void> {
      map.delete(key);
      return Promise.resolve();
    },
    has: function (key: CacheKey): Promise<boolean> {
      return Promise.resolve(map.has(key));
    },
  } as CacheService;
};
