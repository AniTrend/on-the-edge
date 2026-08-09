import { describe, it } from '@std/testing/bdd';
import { assertEquals } from '@std/assert';
import { assertSpyCalls, spy } from '@std/testing/mock';
import { HttpContext } from '@danet/core';
import type { ExperimentService } from '@scope/experiment';
import { createMockLogger, createMockSecret } from '@scope/common/testing';
import { HeaderMiddleware } from './header.middleware.ts';
import { GrowthBookMiddleware } from './growthbook.middleware.ts';

const buildContext = (method: string, path: string, attributes?: unknown) => {
  const setSpy = spy();
  const context = {
    req: {
      raw: new Request(`http://localhost${path}`, { method }),
      path,
    },
    set: setSpy,
    get: (key: string) => key === 'client-attributes' ? attributes : undefined,
  } as unknown as HttpContext;
  return { context, setSpy };
};

const buildExperiment = () => {
  const setAttributes = spy((_args: unknown) => {});
  const init = spy(async () => ({ error: null as null, source: 'test' }));
  const getInstance = spy(() => ({ setAttributes }));
  const destroy = spy(() => {});
  const service = {
    init,
    getInstance,
    destroy,
  } as unknown as ExperimentService;
  return { service, spies: { init, setAttributes, destroy } };
};

const buildGrowthBookMiddleware = () => {
  const { service: secret } = createMockSecret({ GROWTH_TIME_OUT: '1000' });
  const loggerStub = createMockLogger();
  const { service, spies } = buildExperiment();
  const middleware = new GrowthBookMiddleware(
    loggerStub.logger,
    secret,
    service,
  );
  return { middleware, spies };
};

describe('GrowthBookMiddleware', () => {
  it('bypasses feature loading for headerless GET /v1/health', async () => {
    const { middleware, spies } = buildGrowthBookMiddleware();
    const { context } = buildContext('GET', '/v1/health');
    const nextSpy = spy(async () => {});

    await middleware.action(context, nextSpy);

    assertSpyCalls(nextSpy, 1);
    assertSpyCalls(spies.init, 0);
    assertSpyCalls(spies.setAttributes, 0);
    assertSpyCalls(spies.destroy, 0);
  });

  it('still loads features and sets attributes for normal routes', async () => {
    const { middleware, spies } = buildGrowthBookMiddleware();
    const attributes = { label: 'anitrend-app' };
    const { context } = buildContext('GET', '/v1/series', attributes);
    const nextSpy = spy(async () => {});

    await middleware.action(context, nextSpy);

    assertSpyCalls(spies.init, 1);
    assertEquals(spies.setAttributes.calls[0].args[0], { attributes });
    assertSpyCalls(spies.destroy, 1);
    assertSpyCalls(nextSpy, 1);
  });

  it('does not exempt non-GET requests to /v1/health', async () => {
    const { middleware, spies } = buildGrowthBookMiddleware();
    const { context } = buildContext('POST', '/v1/health');
    const nextSpy = spy(async () => {});

    await middleware.action(context, nextSpy);

    assertSpyCalls(spies.init, 1);
    assertSpyCalls(nextSpy, 1);
  });

  it('passes a headerless health request through the full global chain', async () => {
    const { service: secret } = createMockSecret({ DENO_ENV: 'production' });
    const headerMiddleware = new HeaderMiddleware(secret);
    const { middleware, spies } = buildGrowthBookMiddleware();
    const { context } = buildContext('GET', '/v1/health');
    const headerNextSpy = spy(async () => {});
    const growthbookNextSpy = spy(async () => {});

    await headerMiddleware.action(context, headerNextSpy);
    await middleware.action(context, growthbookNextSpy);

    assertSpyCalls(headerNextSpy, 1);
    assertSpyCalls(growthbookNextSpy, 1);
    assertSpyCalls(spies.init, 0);
    assertSpyCalls(spies.destroy, 0);
  });
});
