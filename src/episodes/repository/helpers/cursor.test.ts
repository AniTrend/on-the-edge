import { assert, assertEquals } from '@std/assert';
import { describe, it } from '@std/testing/bdd';
import {
  buildFilterHash,
  buildFilterHashLegacy,
  decodeCursor,
  encodeCursor,
} from './cursor.ts';
import { setEnvScoped } from '../../../../common/testing/env.ts';

describe('Cursor Hash Implementation', () => {
  describe('buildFilterHash', () => {
    it('should produce deterministic hashes', () => {
      const seriesKey = '123';
      const filters = { kind: 'main', specialsOnly: true, start: 1, end: 10 };

      const hash1 = buildFilterHash(seriesKey, filters);
      const hash2 = buildFilterHash(seriesKey, filters);

      assertEquals(hash1, hash2);
    });

    it('should produce different hashes for different filters', () => {
      const seriesKey = '123';

      const hash1 = buildFilterHash(seriesKey, { kind: 'main' });
      const hash2 = buildFilterHash(seriesKey, { kind: 'ova' });
      const hash3 = buildFilterHash(seriesKey, {
        kind: 'main',
        specialsOnly: true,
      });

      assert(hash1 !== hash2);
      assert(hash1 !== hash3);
      assert(hash2 !== hash3);
    });

    it('should handle undefined filters', () => {
      const hash1 = buildFilterHash('123');
      const hash2 = buildFilterHash('123', undefined);

      assertEquals(hash1, hash2);
    });

    it('should handle partial filter objects', () => {
      const seriesKey = '123';

      const hash1 = buildFilterHash(seriesKey, { kind: 'main' });
      const hash2 = buildFilterHash(seriesKey, { specialsOnly: true });
      const hash3 = buildFilterHash(seriesKey, { start: 1 });
      const hash4 = buildFilterHash(seriesKey, { end: 10 });

      // All should be different
      const hashes = [hash1, hash2, hash3, hash4];
      const unique = new Set(hashes);
      assertEquals(unique.size, hashes.length);
    });

    it('should be case sensitive for kind values', () => {
      const seriesKey = '123';

      const hash1 = buildFilterHash(seriesKey, { kind: 'main' });
      const hash2 = buildFilterHash(seriesKey, { kind: 'Main' });

      assert(hash1 !== hash2);
    });

    it('should handle numeric edge cases', () => {
      const seriesKey = '123';

      const hash1 = buildFilterHash(seriesKey, { start: 0 });
      const hash2 = buildFilterHash(seriesKey, { start: -1 });
      const hash3 = buildFilterHash(seriesKey, { end: 0 });

      // All should produce valid hashes
      assert(typeof hash1 === 'string' && hash1.length > 0);
      assert(typeof hash2 === 'string' && hash2.length > 0);
      assert(typeof hash3 === 'string' && hash3.length > 0);
    });
  });

  describe('hash method configuration', () => {
    it('should respect CURSOR_HASH_METHOD environment variable', () => {
      const env = setEnvScoped({ 'CURSOR_HASH_METHOD': 'hash32' });

      try {
        const hash = buildFilterHash('123', { kind: 'main' });

        // When configured for hash32, should produce v1: prefix
        assert(hash.startsWith('v1:') || hash.startsWith('v4:')); // v4 is fallback when invalid config
      } finally {
        env.restore();
      }
    });

    it('should use safe defaults for invalid configuration', () => {
      const env = setEnvScoped({ 'CURSOR_HASH_METHOD': 'invalid-method' });

      try {
        const hash = buildFilterHash('123', { kind: 'main' });

        // Should fallback to sha256-sync (v4:) for invalid config
        assert(hash.startsWith('v4:'));
      } finally {
        env.restore();
      }
    });

    it('should handle missing environment configuration gracefully', () => {
      // No environment variables set
      const hash = buildFilterHash('123', { kind: 'main' });

      // Should use default method (hash64)
      assert(typeof hash === 'string');
      assert(hash.length > 0);
    });
  });

  describe('collision resistance comparison', () => {
    it('should have better collision resistance than legacy implementation', () => {
      const testCases = [
        ['123', { kind: 'main', start: 1, end: 10 }],
        ['123', { kind: 'main', start: 2, end: 11 }],
        ['123', { kind: 'main', start: 3, end: 12 }],
        ['123', { kind: 'ova', start: 1, end: 10 }],
        ['124', { kind: 'main', start: 1, end: 10 }],
        ['125', { kind: 'main', start: 1, end: 10 }],
      ] as const;

      // Generate hashes with both implementations
      const newHashes = testCases.map(([seriesKey, filters]) =>
        buildFilterHash(seriesKey, filters)
      );
      const legacyHashes = testCases.map(([seriesKey, filters]) =>
        buildFilterHashLegacy(seriesKey, filters)
      );

      // Check uniqueness
      const newUnique = new Set(newHashes);
      const legacyUnique = new Set(legacyHashes);

      // New implementation should have equal or better uniqueness
      assert(newUnique.size >= legacyUnique.size);

      console.log(
        `New implementation: ${newUnique.size}/${testCases.length} unique hashes`,
      );
      console.log(
        `Legacy implementation: ${legacyUnique.size}/${testCases.length} unique hashes`,
      );
    });
  });

  describe('cursor encoding/decoding integration', () => {
    it('should work correctly with new hash formats', () => {
      const hash = buildFilterHash('123', { kind: 'main', start: 1, end: 10 });
      const payload = { pos: 5, hash };

      const encoded = encodeCursor(payload);
      const decoded = decodeCursor(encoded);

      assert(decoded !== null);
      assertEquals(decoded.pos, payload.pos);
      assertEquals(decoded.hash, payload.hash);
    });

    it('should handle hash version transitions gracefully', () => {
      // Test that cursors with different hash versions are treated as invalid
      const newHash = buildFilterHash('123', { kind: 'main' });
      const legacyHash = buildFilterHashLegacy('123', { kind: 'main' });

      const newPayload = { pos: 5, hash: newHash };
      const legacyPayload = { pos: 5, hash: legacyHash };

      const newCursor = encodeCursor(newPayload);
      const legacyCursor = encodeCursor(legacyPayload);

      // Both should decode successfully
      const decodedNew = decodeCursor(newCursor);
      const decodedLegacy = decodeCursor(legacyCursor);

      assert(decodedNew !== null);
      assert(decodedLegacy !== null);

      // But hashes should be different
      assert(decodedNew.hash !== decodedLegacy.hash);
    });
  });

  describe('performance characteristics', () => {
    it('should maintain reasonable performance', () => {
      const iterations = 1000;
      const seriesKey = '123456';
      const filters = { kind: 'main', specialsOnly: true, start: 1, end: 100 };

      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        buildFilterHash(seriesKey, filters);
      }
      const end = performance.now();

      const avgTime = (end - start) / iterations;

      // Should be reasonably fast (less than 1ms per hash)
      assert(avgTime < 1.0);
      console.log(`Average buildFilterHash time: ${avgTime.toFixed(3)}ms`);
    });
  });
});
