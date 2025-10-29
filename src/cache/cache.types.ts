export type CacheKey = string | number | symbol;

export type CacheValue = {
  data: string;
  expiresAt?: number; // Timestamp in milliseconds when the cache entry expires
  rank: number; // Priority rank for eviction (lower means higher priority to keep)
  hit: number; // Number of times the cache entry has been accessed
};

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
}
