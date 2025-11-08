export type CacheKey =
  | `edge:${string}`
  | `edge:${string}:${string}`
  | `edge:${string}:${string}:${string}`
  | `edge:${string}:${string}:${string}:${string}`
  | `edge:${string}:${string}:${string}:${string}:${string}`;

/**
 * Value stored in the cache
 *
 * @property data The cached data as a string
 * @property expiresAt Optional expiration timestamp in milliseconds
 * @property rank Priority rank for eviction
 * @property hit Access count for the cache entry
 */
export type CacheValue = {
  data: string;
  expiresAt?: number;
  rank: number;
  hit: number;
};

/**
 * Options for cache operations
 *
 * @property ttl Time to live in seconds
 * @property overwrite Whether to overwrite existing cache entries
 */
export interface CacheOptions {
  ttl?: number;
  overwrite?: boolean;
}
