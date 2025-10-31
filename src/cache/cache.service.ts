import { CacheKey, CacheOptions } from './cache.types.ts';

export interface CacheService {
  get<T>(key: CacheKey): Promise<T | null>;
  set<T>(key: CacheKey, value: T, opts?: CacheOptions): Promise<void>;
  del(key: CacheKey): Promise<void>;
}
