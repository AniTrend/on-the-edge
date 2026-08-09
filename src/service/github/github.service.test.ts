import { afterEach, beforeEach, describe, it } from '@std/testing/bdd';
import { assertEquals } from '@std/assert';
import { assertSpyCalls, spy } from '@std/testing/mock';
import { mockFetch, resetFetch } from '@c4spar/mock-fetch';
import { GithubService, isHttpsUrl } from '@scope/service/github';
import { createMockLogger, createMockSecret } from '@scope/common/testing';

const SOURCE_URL =
  'https://raw.githubusercontent.test/anitrend/app/main/version.json';

const validPayload = {
  code: 42,
  version: '2.4.0',
  migration: true,
  minSdk: 26,
  releaseNotes: 'Fixed crash on series detail',
  appId: 'com.anitrend.app',
};

describe('GithubService', () => {
  const { service: secret } = createMockSecret({
    CLIENT_REQUEST_TIMEOUT: '5000',
  });
  let logger: ReturnType<typeof createMockLogger>['logger'];
  let spies: ReturnType<typeof createMockLogger>['spies'];

  beforeEach(() => {
    resetFetch();
    const loggerStub = createMockLogger();
    logger = loggerStub.logger;
    spies = loggerStub.spies;
  });

  afterEach(() => {
    resetFetch();
  });

  it('fetches and parses a valid manifest with unknown fields tolerated', async () => {
    mockFetch(
      { url: SOURCE_URL },
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...validPayload,
          url: 'https://example.test/app.apk',
          publishedAt: 1_752_000_000_000,
          extraField: 'ignored',
        }),
      },
    );

    const service = new GithubService(secret, logger);
    const result = await service.fetchVersionJson(SOURCE_URL);

    assertEquals(result?.code, 42);
    assertEquals(result?.version, '2.4.0');
    assertEquals(result?.migration, true);
    assertEquals(result?.minSdk, 26);
    assertEquals(result?.releaseNotes, 'Fixed crash on series detail');
    assertEquals(result?.appId, 'com.anitrend.app');
    assertSpyCalls(spies.warn, 0);
  });

  it('accepts a version-string migration form', async () => {
    mockFetch(
      { url: SOURCE_URL },
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...validPayload, migration: '3.0.0' }),
      },
    );

    const service = new GithubService(secret, logger);
    const result = await service.fetchVersionJson(SOURCE_URL);

    assertEquals(result?.migration, '3.0.0');
  });

  it('returns undefined and warns when a required field is malformed', async () => {
    mockFetch(
      { url: SOURCE_URL },
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...validPayload, code: '42' }),
      },
    );

    const service = new GithubService(secret, logger);
    const result = await service.fetchVersionJson(SOURCE_URL);

    assertEquals(result, undefined);
    assertSpyCalls(spies.warn, 1);
  });

  it('returns undefined and warns when a required field is missing', async () => {
    mockFetch(
      { url: SOURCE_URL },
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          code: 42,
          migration: true,
          minSdk: 26,
          releaseNotes: 'Fixed crash on series detail',
          appId: 'com.anitrend.app',
        }),
      },
    );

    const service = new GithubService(secret, logger);
    const result = await service.fetchVersionJson(SOURCE_URL);

    assertEquals(result, undefined);
    assertSpyCalls(spies.warn, 1);
  });

  it('returns undefined and warns when minSdk is negative', async () => {
    mockFetch(
      { url: SOURCE_URL },
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...validPayload, minSdk: -1 }),
      },
    );

    const service = new GithubService(secret, logger);
    const result = await service.fetchVersionJson(SOURCE_URL);

    assertEquals(result, undefined);
    assertSpyCalls(spies.warn, 1);
  });

  it('rejects non-HTTPS source URLs without making a request', async () => {
    const originalFetch = globalThis.fetch;
    const fetchSpy = spy(async () => new Response('', { status: 200 }));
    globalThis.fetch = fetchSpy as unknown as typeof fetch;
    try {
      const service = new GithubService(secret, logger);
      const result = await service.fetchVersionJson(
        'http://insecure.test/version.json',
      );

      assertEquals(result, undefined);
      assertSpyCalls(fetchSpy, 0);
      assertSpyCalls(spies.warn, 1);
      assertEquals(
        spies.warn.calls[0].args[0],
        'Rejecting non-HTTPS update source URL',
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('returns undefined and warns when the source responds with an error status', async () => {
    mockFetch(
      { url: SOURCE_URL },
      { status: 404, body: 'Not Found' },
    );

    const service = new GithubService(secret, logger);
    const result = await service.fetchVersionJson(SOURCE_URL);

    assertEquals(result, undefined);
    assertSpyCalls(spies.warn, 1);
  });
});

describe('isHttpsUrl', () => {
  it('accepts only https URLs', () => {
    assertEquals(isHttpsUrl('https://example.test/version.json'), true);
    assertEquals(isHttpsUrl('http://example.test/version.json'), false);
    assertEquals(isHttpsUrl('ftp://example.test/version.json'), false);
    assertEquals(isHttpsUrl('not-a-url'), false);
  });
});
