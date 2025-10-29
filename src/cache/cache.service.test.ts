import { assertEquals } from '@std/assert';
import { describe, it } from '@std/testing/bdd';
import { FakeTime } from '@std/testing/time';
import { CacheService } from './cache.service.ts';

describe('CacheService', () => {
  it('returns cached value while ttl has not elapsed', async () => {
    const time = new FakeTime();
    try {
      const service = new CacheService();
      await service.set('demo-key', { hello: 'world' }, { ttl: 2 });

      assertEquals(await service.get('demo-key'), { hello: 'world' });

      time.tick(1000);
      assertEquals(await service.get('demo-key'), { hello: 'world' });
    } finally {
      time.restore();
    }
  });

  it('purges expired entries on access', async () => {
    const time = new FakeTime();
    try {
      const service = new CacheService();
      await service.set('expiring-key', 'value', { ttl: 1 });

      time.tick(1000);

      assertEquals(await service.get('expiring-key'), null);
      assertEquals(await service.get('expiring-key'), null);
    } finally {
      time.restore();
    }
  });

  it('treats zero-length ttl as immediately expired', async () => {
    const time = new FakeTime();
    try {
      const service = new CacheService();
      await service.set('zero-ttl-key', 'value', { ttl: 0 });

      assertEquals(await service.get('zero-ttl-key'), null);
    } finally {
      time.restore();
    }
  });
});
