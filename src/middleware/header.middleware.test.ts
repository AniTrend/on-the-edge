import { describe, it } from '@std/testing/bdd';
import { assertRejects } from '@std/assert';
import { assertSpyCall, assertSpyCalls, spy } from '@std/testing/mock';
import { ForbiddenException, HttpContext } from '@danet/core';
import { HeaderMiddleware } from './header.middleware.ts';
import { createMockSecret } from '@scope/common/testing';

const buildContext = (method: string, path: string) => {
  const setSpy = spy();
  const context = {
    req: {
      raw: new Request(`http://localhost${path}`, { method }),
      path,
    },
    set: setSpy,
  } as unknown as HttpContext;
  return { context, setSpy };
};

const buildMiddleware = (environment: string = 'production') => {
  const { service } = createMockSecret({ DENO_ENV: environment });
  return new HeaderMiddleware(service);
};

describe('HeaderMiddleware', () => {
  it('allows GET /v1/health without required app headers in production', async () => {
    const middleware = buildMiddleware('production');
    const { context, setSpy } = buildContext('GET', '/v1/health');
    const nextSpy = spy(async () => {});

    await middleware.action(context, nextSpy);

    assertSpyCall(nextSpy, 0);
    assertSpyCalls(setSpy, 0);
  });

  it('does not exempt non-GET requests to /v1/health in production', async () => {
    const middleware = buildMiddleware('production');
    const { context } = buildContext('POST', '/v1/health');
    const nextSpy = spy(async () => {});

    await assertRejects(
      () => middleware.action(context, nextSpy),
      ForbiddenException,
    );

    assertSpyCalls(nextSpy, 0);
  });

  it('still enforces required headers for a normal GET route in production', async () => {
    const middleware = buildMiddleware('production');
    const { context } = buildContext('GET', '/v1/series');
    const nextSpy = spy(async () => {});

    await assertRejects(
      () => middleware.action(context, nextSpy),
      ForbiddenException,
    );

    assertSpyCalls(nextSpy, 0);
  });
});
