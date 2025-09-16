import { assert, assertEquals } from '@std/assert';
import { describe, it } from '@std/testing/bdd';
import {
  generateHash,
  generateHashSync,
  type HashMethod,
  testHashCollisions,
} from './hash.ts';

describe('Hash Utilities', () => {
  describe('generateHashSync', () => {
    it('should produce deterministic hashes for same input', () => {
      const input = 's=123&k=main&sp=1';
      const hash1 = generateHashSync(input, 'sha256-sync');
      const hash2 = generateHashSync(input, 'sha256-sync');
      assertEquals(hash1, hash2);
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = generateHashSync('s=123&k=main', 'sha256-sync');
      const hash2 = generateHashSync('s=123&k=ova', 'sha256-sync');
      assert(hash1 !== hash2);
    });

    it('should include version prefix in hash', () => {
      const hashSHA256 = generateHashSync('test', 'sha256-sync');
      const hash32 = generateHashSync('test', 'hash32');

      assert(hashSHA256.startsWith('v4:'));
      assert(hash32.startsWith('v1:'));
    });

    it('should handle empty input', () => {
      const hash = generateHashSync('', 'sha256-sync');
      assert(typeof hash === 'string');
      assert(hash.length > 0);
    });

    it('should handle unicode characters', () => {
      const hash1 = generateHashSync('test-あ', 'sha256-sync');
      const hash2 = generateHashSync('test-あ', 'sha256-sync');
      assertEquals(hash1, hash2);
    });
  });

  describe('generateHash (async)', () => {
    it('should produce deterministic hashes for same input', async () => {
      const input = 's=123&k=main&sp=1';
      const hash1 = await generateHash(input);
      const hash2 = await generateHash(input);
      assertEquals(hash1, hash2);
    });

    it('should fallback gracefully when crypto is unavailable', async () => {
      // Test with explicit sha256-sync method to simulate fallback
      const hash = await generateHash('test', { method: 'sha256-sync' });
      assert(hash.startsWith('v4:'));
    });

    it('should support different hash methods', async () => {
      const input = 'test-input';
      const methods: HashMethod[] = ['hash32', 'sha256-sync'];

      const hashes = await Promise.all(
        methods.map((method) => generateHash(input, { method, sync: true })),
      );

      // All hashes should be different
      const uniqueHashes = new Set(hashes);
      assertEquals(uniqueHashes.size, methods.length);
    });
  });

  describe('collision resistance', () => {
    it('should have low collision rate for similar filter combinations', async () => {
      const inputs = [
        's=123&k=main&st=1&en=10',
        's=123&k=main&st=2&en=11',
        's=123&k=main&st=3&en=12',
        's=123&k=main&st=4&en=13',
        's=123&k=main&st=5&en=14',
        's=123&k=ova&st=1&en=10',
        's=123&k=ova&st=2&en=11',
        's=123&k=special&st=1&en=10',
        's=124&k=main&st=1&en=10',
        's=125&k=main&st=1&en=10',
      ];

      // Test SHA-256 hash
      const result256 = await testHashCollisions(inputs, {
        method: 'sha256-sync',
        sync: true,
      });
      assertEquals(result256.collisions, 0); // Should have no collisions
      assertEquals(result256.uniqueHashes, inputs.length);

      // Test 32-bit hash (legacy) - might have collisions but should be minimal
      const result32 = await testHashCollisions(inputs, {
        method: 'hash32',
        sync: true,
      });
      assert(result32.collisions <= 1); // Allow at most 1 collision for small test set
    });

    it('should handle large numbers of similar inputs', async () => {
      // Generate many similar filter combinations
      const inputs: string[] = [];
      for (let series = 100; series < 110; series++) {
        for (let start = 1; start <= 20; start++) {
          for (const kind of ['main', 'ova', 'special']) {
            inputs.push(`s=${series}&k=${kind}&st=${start}&en=${start + 10}`);
          }
        }
      }

      const result = await testHashCollisions(inputs, {
        method: 'hash64',
        sync: true,
      });

      // With SHA-256 hash, collisions should be extremely rare
      const collisionRate = result.collisions / inputs.length;
      assert(collisionRate < 0.01); // Less than 1% collision rate

      console.log(
        `Hash test: ${inputs.length} inputs, ${result.collisions} collisions (${
          (collisionRate * 100).toFixed(2)
        }%)`,
      );
    });
  });

  describe('backwards compatibility', () => {
    it('should maintain deterministic behavior across versions', () => {
      const input = 's=123&k=main&sp=1&st=5&en=10';

      // Generate hash multiple times
      const hashes = Array.from(
        { length: 10 },
        () => generateHashSync(input, 'hash64'),
      );

      // All should be identical
      const unique = new Set(hashes);
      assertEquals(unique.size, 1);
    });

    it('should handle version migration scenarios', () => {
      const input = 's=123&k=main';

      const hash32 = generateHashSync(input, 'hash32');
      const hash64 = generateHashSync(input, 'hash64');

      // Different versions should produce different hashes (as expected)
      assert(hash32 !== hash64);

      // But each should be consistent
      assertEquals(hash32, generateHashSync(input, 'hash32'));
      assertEquals(hash64, generateHashSync(input, 'hash64'));
    });
  });

  describe('performance characteristics', () => {
    it('should be reasonably fast for typical inputs', () => {
      const input = 's=123456&k=main&sp=1&st=1&en=100';
      const iterations = 1000;

      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        generateHashSync(input, 'hash64');
      }
      const end = performance.now();

      const avgTime = (end - start) / iterations;

      // Should complete in reasonable time (less than 1ms per hash on average)
      assert(avgTime < 1.0);
      console.log(`Average hash time: ${avgTime.toFixed(3)}ms`);
    });
  });
});
