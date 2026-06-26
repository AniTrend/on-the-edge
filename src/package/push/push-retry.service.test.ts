import { describe, it } from '@std/testing/bdd';
import { assertEquals } from '@std/assert';
import { assertSpyCalls, spy } from '@std/testing/mock';
import { createMockLogger, createMockSecret } from '@scope/common/testing';
import { PushRetryService } from './push-retry.service.ts';
import type { PushSenderService } from '@scope/service/push-sender';
import type { PushRepository } from './push.repository.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockRedis() {
  const store = new Map<string, string>();

  return {
    isConnected: true,
    connect: spy(async () => {}),
    ping: spy(async () => 'PONG'),
    close: spy(() => {}),
    hset: spy(async (_key: string, _field: string, _value: string) => 1),
    hgetall: spy(async () => {
      const result: Record<string, string> = {};
      for (const [k, v] of store.entries()) result[k] = v;
      return result;
    }),
    hdel: spy(async (_key: string, _field: string) => 1),
  };
}

function createService(
  deps: {
    pushSender?: Partial<PushSenderService>;
    pushRepo?: Partial<PushRepository>;
    redisConnected?: boolean;
  } = {},
): PushRetryService {
  const { service: secret } = createMockSecret({
    REDIS_URL: 'redis://localhost:6379',
    DENO_ENV: 'test',
  });
  const { service: logger } = createMockLogger();
  const pushSender = (deps.pushSender ?? {}) as PushSenderService;
  const pushRepo = (deps.pushRepo ?? {}) as PushRepository;

  const service = new PushRetryService(
    secret,
    pushSender,
    pushRepo,
    logger,
  );

  // Override the redis client with our mock
  if (deps.redisConnected !== false) {
    const mockRedis = createMockRedis();
    (service as unknown as { redis: typeof mockRedis }).redis = mockRedis;
  }

  return service;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PushRetryService', () => {
  it('constructs without errors', () => {
    const service = createService();
    assertEquals(typeof service.enqueue, 'function');
    assertEquals(typeof service.poll, 'function');
  });

  it('enqueue stores a job in Redis', async () => {
    const mockRedis = createMockRedis();
    const service = createService();
    (service as unknown as { redis: typeof mockRedis }).redis = mockRedis;

    await service.enqueue({
      installationId: 'inst-1',
      instance: 'default',
      endpoint: 'https://push.test/fcm/endpoint',
      keys: { p256dh: 'p256dh-test', auth: 'auth-test' },
      payload: { type: 'push.test', id: 'msg-1' },
      type: 'push.test',
    });

    assertSpyCalls(mockRedis.hset as never, 1);
  });

  it('enqueue skips when Redis is not connected', async () => {
    const mockRedis = { ...createMockRedis(), isConnected: false };
    const service = createService();
    (service as unknown as { redis: typeof mockRedis }).redis = mockRedis;

    await service.enqueue({
      installationId: 'inst-1',
      instance: 'default',
      endpoint: 'https://push.test/fcm/endpoint',
      keys: { p256dh: 'p256dh-test', auth: 'auth-test' },
      payload: { type: 'push.test', id: 'msg-1' },
      type: 'push.test',
    });

    assertSpyCalls(mockRedis.hset as never, 0);
  });

  it('poll skips when already polling', async () => {
    const service = createService();
    // Set polling to true to simulate concurrent poll
    (service as unknown as { polling: boolean }).polling = true;

    // Should return immediately without error
    await service.poll();
  });

  it('poll skips jobs not yet due', async () => {
    const mockRedis = createMockRedis();
    const service = createService();
    (service as unknown as { redis: typeof mockRedis }).redis = mockRedis;

    // Store a job that's not due for another hour
    const futureJob = JSON.stringify({
      installationId: 'inst-1',
      instance: 'default',
      endpoint: 'https://push.test/fcm/endpoint',
      keys: { p256dh: 'p256dh-test', auth: 'auth-test' },
      payload: { type: 'push.test', id: 'msg-1' },
      type: 'push.test',
      attempt: 1,
      nextRetryAt: Date.now() + 3_600_000,
    });
    const store = new Map<string, string>();
    store.set('inst-1:default:push.test:msg-1', futureJob);
    mockRedis.hgetall = spy(async () => {
      const result: Record<string, string> = {};
      for (const [k, v] of store.entries()) result[k] = v;
      return result;
    });
    (service as unknown as { redis: typeof mockRedis }).redis = mockRedis;

    await service.poll();

    // Job should not be touched - no hdel, no send
    assertSpyCalls(mockRedis.hdel as never, 0);
  });
});
