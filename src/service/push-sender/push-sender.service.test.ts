import { describe, it } from '@std/testing/bdd';
import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from '@std/assert';
import { PushSenderService } from '@scope/service/push-sender';
import { createMockLogger, createMockSecret } from '@scope/common/testing';

const SUBJECT = 'mailto:dev@example.test';

const warnMessage = (spies: {
  warn: { calls: { args: unknown[] }[] };
}): string => String(spies.warn.calls[0]?.args[0] ?? '');

describe('PushSenderService', () => {
  it('reports missing PUSH_VAPID_KEYS as a configuration gap', async () => {
    const secret = createMockSecret({
      PUSH_VAPID_SUBJECT: SUBJECT,
    }).service;
    const { logger, spies } = createMockLogger();

    const service = new PushSenderService(secret, logger);
    await service.onAppBootstrap();

    assertStringIncludes(
      warnMessage(spies),
      'PUSH_VAPID_KEYS is missing or could not be read',
    );
    await assertRejects(
      () => service.getApplicationServerKey(),
      Error,
      'PushSenderService not initialized',
    );
  });

  it('reports PUSH_VAPID_KEYS that is not base64-encoded JSON', async () => {
    const secret = createMockSecret({
      PUSH_VAPID_KEYS: '!!!not-base64!!!',
      PUSH_VAPID_SUBJECT: SUBJECT,
    }).service;
    const { logger, spies } = createMockLogger();

    const service = new PushSenderService(secret, logger);
    await service.onAppBootstrap();

    assertStringIncludes(
      warnMessage(spies),
      'PUSH_VAPID_KEYS is not valid base64-encoded JSON',
    );
    await assertRejects(
      () => service.getApplicationServerKey(),
      Error,
      'PushSenderService not initialized',
    );
  });

  it('rejects a decoded payload without a VAPID key pair', async () => {
    const secret = createMockSecret({
      PUSH_VAPID_KEYS: btoa(JSON.stringify({ hello: 'world' })),
      PUSH_VAPID_SUBJECT: SUBJECT,
    }).service;
    const { logger, spies } = createMockLogger();

    const service = new PushSenderService(secret, logger);
    await service.onAppBootstrap();

    assertStringIncludes(
      warnMessage(spies),
      'PUSH_VAPID_KEYS does not contain a valid VAPID key pair',
    );
    await assertRejects(
      () => service.getApplicationServerKey(),
      Error,
      'PushSenderService not initialized',
    );
  });

  it('initializes from a valid exported VAPID key pair', async () => {
    const { encoded } = await PushSenderService.generateDevKeys();

    const secret = createMockSecret({
      PUSH_VAPID_KEYS: encoded,
      PUSH_VAPID_SUBJECT: SUBJECT,
    }).service;
    const { logger, spies } = createMockLogger();

    const service = new PushSenderService(secret, logger);
    await service.onAppBootstrap();

    assertEquals(spies.warn.calls.length, 0);
    const applicationServerKey = await service.getApplicationServerKey();
    assert(
      applicationServerKey.length > 0,
      'expected a non-empty base64url application server key',
    );
  });

  it('initializes from key material carrying foreign JWK members', async () => {
    const { encoded } = await PushSenderService.generateDevKeys();
    const keys = JSON.parse(atob(encoded));
    // WebCrypto exports key_ops, alg and ext members; importVapidKeys
    // rejects a JWK whose key_ops conflicts with its usages, so the
    // parse step must drop them.
    keys.publicKey = {
      ...keys.publicKey,
      key_ops: [],
      alg: 'ES256',
      ext: true,
    };

    const secret = createMockSecret({
      PUSH_VAPID_KEYS: btoa(JSON.stringify(keys)),
      PUSH_VAPID_SUBJECT: SUBJECT,
    }).service;
    const { logger, spies } = createMockLogger();

    const service = new PushSenderService(secret, logger);
    await service.onAppBootstrap();

    assertEquals(spies.warn.calls.length, 0);
    await service.getApplicationServerKey();
  });
});
