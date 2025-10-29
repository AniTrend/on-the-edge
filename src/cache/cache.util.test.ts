import { assertEquals } from '@std/assert';
import { describe, it } from '@std/testing/bdd';
import { computeRank } from './cache.util.ts';

describe('CacheUtil', () => {
  describe('computeRank', () => {
    it('should compute rank with hits only when expiresAt is undefined', () => {
      const rank = computeRank(5, undefined);
      assertEquals(rank, 5000);
    });

    it('should compute rank with hits and remaining time', () => {
      const now = Date.now();
      const expiresAt = now + (10 * 60 * 1000); // 10 minutes from now
      const rank = computeRank(3, expiresAt, now);
      assertEquals(rank, 3010);
    });

    it('should floor remaining minutes at zero for expired entries', () => {
      const now = Date.now();
      const expiresAt = now - (5 * 60 * 1000); // 5 minutes ago
      const rank = computeRank(2, expiresAt, now);
      assertEquals(rank, 2000);
    });

    it('should handle zero hits', () => {
      const now = Date.now();
      const expiresAt = now + (30 * 60 * 1000); // 30 minutes from now
      const rank = computeRank(0, expiresAt, now);
      assertEquals(rank, 30);
    });

    it('should compute higher rank for more hits', () => {
      const now = Date.now();
      const expiresAt = now + (5 * 60 * 1000);
      const rank1 = computeRank(10, expiresAt, now);
      const rank2 = computeRank(5, expiresAt, now);
      assertEquals(rank1 > rank2, true);
    });
  });
});
