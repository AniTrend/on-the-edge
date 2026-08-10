import { describe, it } from '@std/testing/bdd';
import { assertEquals, assertRejects } from '@std/assert';
import { assertSpyCall, assertSpyCalls, spy } from '@std/testing/mock';
import { ForbiddenException, HttpContext } from '@danet/core';
import { HeaderMiddleware } from './header.middleware.ts';
import { ClientContext, ClientHeader } from '@scope/common/types';
import { createMockSecret } from '@scope/common/testing';

const DEFAULT_HEADERS: Record<string, string> = {
  host: 'localhost',
  accept: '*/*',
  'accept-encoding': 'gzip',
  'user-agent': 'okhttp/4.12.0',
  [ClientHeader.appId]: 'ANITREND_V2',
  [ClientHeader.package]: 'com.anitrend.app',
  [ClientHeader.version]: '1.0.0',
  [ClientHeader.versionCode]: '123',
  [ClientHeader.source]: 'play-store',
  [ClientHeader.locale]: 'en-US',
  [ClientHeader.buildType]: 'release',
  [ClientHeader.deviceBuildId]: 'TQ3A.230805.001',
};

const buildContext = (
  method: string,
  path: string,
  headers?: Headers,
) => {
  const setSpy = spy();
  const context = {
    req: {
      raw: new Request(`http://localhost${path}`, { method, headers }),
      path,
    },
    set: setSpy,
  } as unknown as HttpContext;
  return { context, setSpy };
};

const buildHeaders = (
  overrides: Record<string, string | undefined> = {},
): Headers => {
  const headers = new Headers();
  for (const [key, value] of Object.entries(DEFAULT_HEADERS)) {
    headers.set(key, value);
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      headers.delete(key);
    } else {
      headers.set(key, value);
    }
  }
  return headers;
};

const storedClientContext = (
  setSpy: { calls: Array<{ args: unknown[] }> },
): ClientContext => {
  const call = setSpy.calls.find(
    (call) => call.args[0] === 'client-attributes',
  );
  return call!.args[1] as ClientContext;
};

const buildMiddleware = (environment: string = 'production') => {
  const { service } = createMockSecret({ DENO_ENV: environment });
  return new HeaderMiddleware(service);
};

describe('HeaderMiddleware', () => {
  it('allows GET /v1/health without required app headers in production', async () => {
    const middleware = buildMiddleware('production');
    const { context, setSpy } = buildContext('GET', '/v1/health');
    const nextSpy = spy(async () => { });

    await middleware.action(context, nextSpy);

    assertSpyCall(nextSpy, 0);
    assertSpyCalls(setSpy, 0);
  });

  it('does not exempt non-GET requests to /v1/health in production', async () => {
    const middleware = buildMiddleware('production');
    const { context } = buildContext('POST', '/v1/health');
    const nextSpy = spy(async () => { });

    await assertRejects(
      () => middleware.action(context, nextSpy),
      ForbiddenException,
    );

    assertSpyCalls(nextSpy, 0);
  });

  it('still enforces required headers for a normal GET route in production', async () => {
    const middleware = buildMiddleware('production');
    const { context } = buildContext('GET', '/v1/series');
    const nextSpy = spy(async () => { });

    await assertRejects(
      () => middleware.action(context, nextSpy),
      ForbiddenException,
    );

    assertSpyCalls(nextSpy, 0);
  });

  it('rejects a missing x-app-id in production', async () => {
    const middleware = buildMiddleware('production');
    const { context } = buildContext(
      'GET',
      '/v1/series',
      buildHeaders({ [ClientHeader.appId]: undefined }),
    );
    const nextSpy = spy(async () => { });

    await assertRejects(
      () => middleware.action(context, nextSpy),
      ForbiddenException,
    );

    assertSpyCalls(nextSpy, 0);
  });

  it('rejects an unknown x-app-id value in production', async () => {
    const middleware = buildMiddleware('production');
    const { context } = buildContext(
      'GET',
      '/v1/series',
      buildHeaders({ [ClientHeader.appId]: 'SOMETHING_ELSE' }),
    );
    const nextSpy = spy(async () => { });

    await assertRejects(
      () => middleware.action(context, nextSpy),
      ForbiddenException,
    );

    assertSpyCalls(nextSpy, 0);
  });

  it('rejects a missing x-app-package in production', async () => {
    const middleware = buildMiddleware('production');
    const { context } = buildContext(
      'GET',
      '/v1/series',
      buildHeaders({ [ClientHeader.package]: undefined }),
    );
    const nextSpy = spy(async () => { });

    await assertRejects(
      () => middleware.action(context, nextSpy),
      ForbiddenException,
    );

    assertSpyCalls(nextSpy, 0);
  });

  for (const versionCode of ['abc', '1.4', '-1', '0']) {
    it(`rejects invalid x-app-code "${versionCode}" in production`, async () => {
      const middleware = buildMiddleware('production');
      const { context } = buildContext(
        'GET',
        '/v1/series',
        buildHeaders({ [ClientHeader.versionCode]: versionCode }),
      );
      const nextSpy = spy(async () => { });

      await assertRejects(
        () => middleware.action(context, nextSpy),
        ForbiddenException,
      );

      assertSpyCalls(nextSpy, 0);
    });
  }

  it('rejects an empty x-app-version in production', async () => {
    const middleware = buildMiddleware('production');
    const { context } = buildContext(
      'GET',
      '/v1/series',
      buildHeaders({ [ClientHeader.version]: '' }),
    );
    const nextSpy = spy(async () => { });

    await assertRejects(
      () => middleware.action(context, nextSpy),
      ForbiddenException,
    );

    assertSpyCalls(nextSpy, 0);
  });

  it('accepts a valid build type and propagates it into the client context', async () => {
    const middleware = buildMiddleware('production');
    const { context, setSpy } = buildContext(
      'GET',
      '/v1/series',
      buildHeaders({ [ClientHeader.buildType]: 'benchmark' }),
    );
    const nextSpy = spy(async () => { });

    await middleware.action(context, nextSpy);

    assertSpyCalls(nextSpy, 1);
    assertEquals(storedClientContext(setSpy).buildType, 'benchmark');
  });

  it('propagates the device build ID into the client context', async () => {
    const middleware = buildMiddleware('production');
    const { context, setSpy } = buildContext(
      'GET',
      '/v1/series',
      buildHeaders({ [ClientHeader.deviceBuildId]: 'TQ3A.230805.001' }),
    );
    const nextSpy = spy(async () => { });

    await middleware.action(context, nextSpy);

    assertSpyCalls(nextSpy, 1);
    assertEquals(
      storedClientContext(setSpy).platform.deviceBuildId,
      'TQ3A.230805.001',
    );
  });

  it('stores a canonical client context with a numeric version code', async () => {
    const middleware = buildMiddleware('production');
    const { context, setSpy } = buildContext(
      'GET',
      '/v1/series',
      buildHeaders(),
    );
    const nextSpy = spy(async () => { });

    await middleware.action(context, nextSpy);

    assertSpyCalls(nextSpy, 1);
    const client = storedClientContext(setSpy);
    assertEquals(client.appId, 'ANITREND_V2');
    assertEquals(client.packageName, 'com.anitrend.app');
    assertEquals(client.version, '1.0.0');
    assertEquals(typeof client.versionCode, 'number');
    assertEquals(client.versionCode, 123);
    assertEquals(client.source, 'play-store');
    assertEquals(client.locale, 'en-US');
    assertEquals(client.buildType, 'release');
  });

  it('warns but does not reject an invalid value in development', async () => {
    const middleware = buildMiddleware('development');
    const { context, setSpy } = buildContext(
      'GET',
      '/v1/series',
      buildHeaders({ [ClientHeader.versionCode]: 'not-a-number' }),
    );
    const nextSpy = spy(async () => { });

    await middleware.action(context, nextSpy);

    assertSpyCalls(nextSpy, 1);
    assertEquals(storedClientContext(setSpy).versionCode, 0);
  });
});
