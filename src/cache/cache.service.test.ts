import { assertEquals, assertRejects } from '@std/assert';
import { describe, it } from '@std/testing/bdd';
import { SecretService } from '@scope/secret';
import type { LoggerService } from '@scope/logger';
import { RedisService } from './redis.service.ts';

describe('RedisService', () => {
  it('bails on bootstrap when Redis config is missing or connect fails', async () => {
    // SecretService.get throws to simulate missing env configuration
    const secretStub = {
      get: (_k: string) => {
        throw new Error('missing env');
      },
    } as unknown as SecretService;
    const loggerStub = {
      instance: { mark: () => { }, measure: () => { }, error: () => { } },
    } as unknown as LoggerService;
    const service = new RedisService(secretStub, loggerStub);

    await assertRejects(() => service.onAppBootstrap());
  });

  it('delegates operations to redis client and applies px for ttl', async () => {
    // Minimal fake redis client used to verify interactions
    const store = new Map<string, string>();
    let lastPx: number | undefined;
    const fakeRedis = {
      async get(key: string): Promise<string | null> {
        return store.has(key) ? store.get(key)! : null;
      },
      async set(
        key: string,
        value: string,
        opts?: { px?: number },
      ): Promise<void> {
        if (opts && typeof opts.px === 'number') lastPx = opts.px;
        store.set(key, value);
      },
      async del(key: string): Promise<void> {
        store.delete(key);
      },
    } as unknown as Record<string, unknown>;

    const secretStub = {
      get: (_k: string) => 'unused',
    } as unknown as SecretService;
    const loggerStub = {
      instance: { mark: () => { }, measure: () => { } },
    } as unknown as LoggerService;
    const service = new RedisService(secretStub, loggerStub);

    // Inject fake client into the actual private field
    (service as unknown as { redis: unknown }).redis = fakeRedis;

    await service.set('demo-key', { hello: 'world' }, { ttl: 2 });
    assertEquals(lastPx, 2000);
    assertEquals(await service.get('demo-key'), { hello: 'world' });

    await service.del('demo-key');
    assertEquals(await service.get('demo-key'), null);
  });
});
