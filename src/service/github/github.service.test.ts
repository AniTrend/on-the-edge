import { afterEach, beforeEach, describe, it } from '@std/testing/bdd';
import { assertEquals } from '@std/assert';
import { assertSpyCalls } from '@std/testing/mock';
import { mockFetch, resetFetch } from '@c4spar/mock-fetch';
import {
  GithubService,
  isHttpsUrl,
  parseSemverTag,
  parseVersionProperties,
} from '@scope/service/github';
import { createMockLogger, createMockSecret } from '@scope/common/testing';

const LATEST_URL =
  'https://api.github.com/repos/AniTrend/anitrend-app/releases/latest';
const LIST_URL =
  'https://api.github.com/repos/AniTrend/anitrend-app/releases?per_page=100';
const PROPERTIES_URL =
  'https://raw.githubusercontent.com/AniTrend/anitrend-app/v2.4.0/gradle/version.properties';

const releasePayload = (overrides: Record<string, unknown> = {}) => ({
  tag_name: 'v2.4.0',
  name: 'Release 2.4.0',
  body: 'Release notes',
  published_at: '2026-01-02T03:04:05Z',
  prerelease: false,
  draft: false,
  html_url: 'https://github.com/AniTrend/anitrend-app/releases/tag/v2.4.0',
  assets: [{
    name: 'app-release.apk',
    browser_download_url:
      'https://github.com/AniTrend/anitrend-app/releases/download/v2.4.0/app-release.apk',
    size: 1024,
  }],
  ...overrides,
});

/** Build a GithubService with an optional GITHUB_TOKEN secret. */
const buildService = (
  logger: ReturnType<typeof createMockLogger>['logger'],
  token?: string,
): GithubService => {
  const overrides: Record<string, string> = { CLIENT_REQUEST_TIMEOUT: '5000' };
  if (token) {
    overrides.GITHUB_TOKEN = token;
  }
  const { service: secret } = createMockSecret(overrides);
  return new GithubService(secret, logger);
};

interface RecordedRequest {
  url: string;
  headers: Headers;
}

/**
 * Wrap the mock-installed fetch so tests can assert on the exact
 * request headers that were sent.
 */
const captureRequests = (): { requests: RecordedRequest[] } => {
  const requests: RecordedRequest[] = [];
  const mockedFetch = globalThis.fetch;
  const recordingFetch: typeof fetch = async (input, init) => {
    const url = typeof input === 'string'
      ? input
      : input instanceof URL
      ? input.href
      : input.url;
    requests.push({ url, headers: new Headers(init?.headers) });
    return mockedFetch(input, init);
  };
  Object.defineProperty(globalThis, 'fetch', {
    value: recordingFetch,
    writable: true,
    enumerable: true,
    configurable: true,
  });
  return { requests };
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

  it('fetches and parses the latest release with its ETag', async () => {
    mockFetch(
      { url: LATEST_URL },
      {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'etag': '"abc123"',
        },
        body: JSON.stringify(releasePayload()),
      },
    );

    const service = new GithubService(secret, logger);
    const result = await service.fetchLatestRelease('AniTrend', 'anitrend-app');

    assertEquals(result?.status, 'ok');
    if (result?.status === 'ok') {
      assertEquals(result.release?.tagName, 'v2.4.0');
      assertEquals(result.release?.name, 'Release 2.4.0');
      assertEquals(result.release?.body, 'Release notes');
      assertEquals(
        result.release?.publishedAt,
        Date.parse('2026-01-02T03:04:05Z'),
      );
      assertEquals(result.release?.prerelease, false);
      assertEquals(result.release?.draft, false);
      assertEquals(result.release?.assets.length, 1);
      assertEquals(result.release?.assets[0].name, 'app-release.apk');
      assertEquals(result.etag, '"abc123"');
    }
  });

  it('resolves to not-modified on a 304 response', async () => {
    mockFetch({ url: LATEST_URL }, { status: 304 });

    const service = new GithubService(secret, logger);
    const result = await service.fetchLatestRelease(
      'AniTrend',
      'anitrend-app',
      '"abc123"',
    );

    assertEquals(result?.status, 'not-modified');
  });

  it('returns undefined and warns when the release lookup fails', async () => {
    mockFetch({ url: LATEST_URL }, { status: 500, body: 'boom' });

    const service = new GithubService(secret, logger);
    const result = await service.fetchLatestRelease('AniTrend', 'anitrend-app');

    assertEquals(result, undefined);
    assertSpyCalls(spies.warn, 1);
  });

  it('selects the newest stable release and excludes drafts and prereleases', async () => {
    mockFetch(
      { url: LIST_URL },
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify([
          releasePayload({
            tag_name: 'v2.4.1',
            published_at: '2026-02-01T00:00:00Z',
            prerelease: true,
          }),
          releasePayload({
            tag_name: 'v2.4.0',
            published_at: '2026-01-02T03:04:05Z',
          }),
          releasePayload({
            tag_name: 'v2.3.9',
            published_at: '2026-01-10T00:00:00Z',
            draft: true,
          }),
        ]),
      },
    );

    const service = new GithubService(secret, logger);
    const result = await service.fetchReleases('AniTrend', 'anitrend-app', {
      selector: 'stable',
    });

    assertEquals(result?.status, 'ok');
    if (result?.status === 'ok') {
      // v2.4.1 is a prerelease, v2.3.9 is a draft: v2.4.0 wins despite
      // being older than the draft.
      assertEquals(result.release?.tagName, 'v2.4.0');
    }
  });

  it('selects the newest prerelease for the prerelease selector', async () => {
    mockFetch(
      { url: LIST_URL },
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify([
          releasePayload({
            tag_name: 'v2.4.0',
            published_at: '2026-01-02T03:04:05Z',
          }),
          releasePayload({
            tag_name: 'v2.5.0-rc.1',
            published_at: '2026-03-01T00:00:00Z',
            prerelease: true,
          }),
          releasePayload({
            tag_name: 'v2.5.0-rc.2',
            published_at: '2026-03-02T00:00:00Z',
            prerelease: true,
            draft: true,
          }),
        ]),
      },
    );

    const service = new GithubService(secret, logger);
    const result = await service.fetchReleases('AniTrend', 'anitrend-app', {
      selector: 'prerelease',
    });

    assertEquals(result?.status, 'ok');
    if (result?.status === 'ok') {
      assertEquals(result.release?.tagName, 'v2.5.0-rc.1');
    }
  });

  it('sorts deterministically by published_at with a tag tie-break', async () => {
    const publishedAt = '2026-01-02T03:04:05Z';
    mockFetch(
      { url: LIST_URL },
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify([
          releasePayload({
            tag_name: 'v2.4.0',
            published_at: publishedAt,
          }),
          releasePayload({
            tag_name: 'v2.4.1',
            published_at: publishedAt,
          }),
        ]),
      },
    );

    const service = new GithubService(secret, logger);
    const result = await service.fetchReleases('AniTrend', 'anitrend-app', {
      selector: 'stable',
    });

    assertEquals(result?.status, 'ok');
    if (result?.status === 'ok') {
      // Equal published_at: the higher tag wins deterministically.
      assertEquals(result.release?.tagName, 'v2.4.1');
    }
  });

  it('applies the rolling window to the release list', async () => {
    mockFetch(
      { url: LIST_URL },
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify([
          releasePayload({
            tag_name: 'v2.4.0',
            published_at: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000)
              .toISOString(),
          }),
          releasePayload({
            tag_name: 'v2.5.0',
            published_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
              .toISOString(),
          }),
        ]),
      },
    );

    const service = new GithubService(secret, logger);
    const result = await service.fetchReleases('AniTrend', 'anitrend-app', {
      selector: 'stable',
      rollingWindowDays: 90,
    });

    assertEquals(result?.status, 'ok');
    if (result?.status === 'ok') {
      assertEquals(result.release?.tagName, 'v2.5.0');
    }
  });

  it('returns no release when the rolling window excludes everything', async () => {
    mockFetch(
      { url: LIST_URL },
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify([
          releasePayload({
            tag_name: 'v2.4.0',
            published_at: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000)
              .toISOString(),
          }),
        ]),
      },
    );

    const service = new GithubService(secret, logger);
    const result = await service.fetchReleases('AniTrend', 'anitrend-app', {
      selector: 'stable',
      rollingWindowDays: 90,
    });

    assertEquals(result?.status, 'ok');
    if (result?.status === 'ok') {
      assertEquals(result.release, undefined);
    }
  });

  it('resolves the release list to not-modified on 304', async () => {
    mockFetch({ url: LIST_URL }, { status: 304 });

    const service = new GithubService(secret, logger);
    const result = await service.fetchReleases('AniTrend', 'anitrend-app', {
      selector: 'prerelease',
    });

    assertEquals(result?.status, 'not-modified');
  });

  it('fetches tagged version properties as text', async () => {
    mockFetch(
      { url: PROPERTIES_URL },
      { status: 200, body: 'VERSION_NAME=2.4.0\nVERSION_CODE=20400\n' },
    );

    const service = new GithubService(secret, logger);
    const result = await service.fetchVersionProperties(
      'AniTrend',
      'anitrend-app',
      'v2.4.0',
      'gradle/version.properties',
    );

    assertEquals(result, 'VERSION_NAME=2.4.0\nVERSION_CODE=20400\n');
  });

  it('returns undefined when tagged version properties are absent', async () => {
    mockFetch({ url: PROPERTIES_URL }, { status: 404 });

    const service = new GithubService(secret, logger);
    const result = await service.fetchVersionProperties(
      'AniTrend',
      'anitrend-app',
      'v2.4.0',
      'gradle/version.properties',
    );

    assertEquals(result, undefined);
    assertSpyCalls(spies.warn, 0);
  });

  it('sends the bearer token and API headers on the latest path when GITHUB_TOKEN is set', async () => {
    mockFetch(
      { url: LATEST_URL },
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(releasePayload()),
      },
    );
    const { requests } = captureRequests();

    const service = buildService(logger, 'ghp_test_token');
    const result = await service.fetchLatestRelease('AniTrend', 'anitrend-app');

    assertEquals(result?.status, 'ok');
    assertEquals(requests.length, 1);
    assertEquals(
      requests[0].headers.get('authorization'),
      'Bearer ghp_test_token',
    );
    assertEquals(
      requests[0].headers.get('accept'),
      'application/vnd.github+json',
    );
    assertEquals(requests[0].headers.get('x-github-api-version'), '2022-11-28');
  });

  it('sends the bearer token and API headers on the list path when GITHUB_TOKEN is set', async () => {
    mockFetch(
      { url: LIST_URL },
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify([releasePayload()]),
      },
    );
    const { requests } = captureRequests();

    const service = buildService(logger, 'ghp_list_token');
    const result = await service.fetchReleases('AniTrend', 'anitrend-app', {
      selector: 'stable',
    });

    assertEquals(result?.status, 'ok');
    assertEquals(requests.length, 1);
    assertEquals(
      requests[0].headers.get('authorization'),
      'Bearer ghp_list_token',
    );
    assertEquals(
      requests[0].headers.get('accept'),
      'application/vnd.github+json',
    );
    assertEquals(requests[0].headers.get('x-github-api-version'), '2022-11-28');
  });

  it('does not send an Authorization header without a token', async () => {
    mockFetch(
      { url: LATEST_URL },
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(releasePayload()),
      },
    );
    const { requests } = captureRequests();

    const service = buildService(logger);
    const result = await service.fetchLatestRelease('AniTrend', 'anitrend-app');

    assertEquals(result?.status, 'ok');
    assertEquals(requests[0].headers.has('authorization'), false);
  });

  it('does not send the token to raw.githubusercontent.com', async () => {
    mockFetch(
      { url: PROPERTIES_URL },
      { status: 200, body: 'VERSION_NAME=2.4.0\nVERSION_CODE=20400\n' },
    );
    const { requests } = captureRequests();

    const service = buildService(logger, 'ghp_test_token');
    await service.fetchVersionProperties(
      'AniTrend',
      'anitrend-app',
      'v2.4.0',
      'gradle/version.properties',
    );

    assertEquals(requests.length, 1);
    assertEquals(requests[0].headers.has('authorization'), false);
  });

  it('parses rate-limit headers on the latest release path', async () => {
    mockFetch(
      { url: LATEST_URL },
      {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'x-ratelimit-limit': '60',
          'x-ratelimit-remaining': '42',
          'x-ratelimit-reset': '1700000000',
        },
        body: JSON.stringify(releasePayload()),
      },
    );

    const service = buildService(logger);
    const result = await service.fetchLatestRelease('AniTrend', 'anitrend-app');

    assertEquals(result?.status, 'ok');
    if (result?.status === 'ok') {
      assertEquals(result.rateLimit, {
        limit: 60,
        remaining: 42,
        reset: 1700000000,
      });
    }
  });

  it('parses rate-limit headers on the release list path', async () => {
    mockFetch(
      { url: LIST_URL },
      {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'x-ratelimit-limit': '60',
          'x-ratelimit-remaining': '1',
          'x-ratelimit-reset': '1700000060',
        },
        body: JSON.stringify([releasePayload()]),
      },
    );

    const service = buildService(logger);
    const result = await service.fetchReleases('AniTrend', 'anitrend-app', {
      selector: 'stable',
    });

    assertEquals(result?.status, 'ok');
    if (result?.status === 'ok') {
      assertEquals(result.rateLimit, {
        limit: 60,
        remaining: 1,
        reset: 1700000060,
      });
    }
  });

  it('returns undefined and warns when the GitHub request times out', async () => {
    const abortingFetch = async (
      _input: RequestInfo | URL,
      init?: RequestInit,
    ): Promise<Response> => {
      return await new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });
    };
    Object.defineProperty(globalThis, 'fetch', {
      value: abortingFetch,
      writable: true,
      enumerable: true,
      configurable: true,
    });
    const { service: timeoutSecret } = createMockSecret({
      CLIENT_REQUEST_TIMEOUT: '10',
    });
    const service = new GithubService(timeoutSecret, logger);

    const result = await service.fetchLatestRelease('AniTrend', 'anitrend-app');

    assertEquals(result, undefined);
    assertSpyCalls(spies.warn, 1);
  });

  it('returns undefined and warns on a malformed payload', async () => {
    mockFetch(
      { url: LATEST_URL },
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: 'not-json',
      },
    );

    const service = buildService(logger);
    const result = await service.fetchLatestRelease('AniTrend', 'anitrend-app');

    assertEquals(result, undefined);
    assertSpyCalls(spies.warn, 1);
  });

  it('passes through asset content type and digest when GitHub reports them', async () => {
    mockFetch(
      { url: LATEST_URL },
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(releasePayload({
          assets: [{
            name: 'app-release.apk',
            browser_download_url:
              'https://github.com/AniTrend/anitrend-app/releases/download/v2.4.0/app-release.apk',
            size: 1024,
            content_type: 'application/vnd.android.package-archive',
            digest: 'sha256:abcdef123456',
          }],
        })),
      },
    );

    const service = buildService(logger);
    const result = await service.fetchLatestRelease('AniTrend', 'anitrend-app');

    assertEquals(result?.status, 'ok');
    if (result?.status === 'ok') {
      assertEquals(
        result.release?.assets[0].contentType,
        'application/vnd.android.package-archive',
      );
      assertEquals(result.release?.assets[0].digest, 'sha256:abcdef123456');
    }
  });

  it('leaves content type and digest unset when GitHub omits them', async () => {
    mockFetch(
      { url: LATEST_URL },
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(releasePayload()),
      },
    );

    const service = buildService(logger);
    const result = await service.fetchLatestRelease('AniTrend', 'anitrend-app');

    assertEquals(result?.status, 'ok');
    if (result?.status === 'ok') {
      assertEquals(result.release?.assets[0].contentType, undefined);
      assertEquals(result.release?.assets[0].digest, undefined);
    }
  });
});

describe('parseVersionProperties', () => {
  it('parses version, code, and name with comments and blank lines', () => {
    const text = [
      '# Generated by the build',
      '',
      'VERSION_NAME=2.4.0',
      'VERSION_CODE=20400',
      'APP_NAME=AniTrend',
      '',
    ].join('\n');
    assertEquals(parseVersionProperties(text), {
      version: '2.4.0',
      code: 20400,
      name: 'AniTrend',
    });
  });

  it('accepts case variations and whitespace around keys and values', () => {
    const text = '  version_name = 3.1.2 \nversion_code=31200\n';
    assertEquals(parseVersionProperties(text), {
      version: '3.1.2',
      code: 31200,
      name: undefined,
    });
  });

  it('ignores non-numeric or non-positive codes', () => {
    const text = 'VERSION_NAME=2.4.0\nVERSION_CODE=not-a-number\n';
    assertEquals(parseVersionProperties(text), {
      version: '2.4.0',
      code: undefined,
      name: undefined,
    });
  });

  it('returns partial results for incomplete documents', () => {
    assertEquals(parseVersionProperties('VERSION_CODE=42\n'), {
      version: undefined,
      code: 42,
      name: undefined,
    });
    assertEquals(parseVersionProperties(''), {
      version: undefined,
      code: undefined,
      name: undefined,
    });
  });
});

describe('parseSemverTag', () => {
  it('parses bare semver tags with or without the v prefix', () => {
    assertEquals(parseSemverTag('v2.4.0'), {
      version: '2.4.0',
      code: 2_004_000_000,
    });
    assertEquals(parseSemverTag('2.4.0'), {
      version: '2.4.0',
      code: 2_004_000_000,
    });
    assertEquals(parseSemverTag('v0.1.2'), {
      version: '0.1.2',
      code: 1_002_000,
    });
  });

  it('derives exact version codes per AniTrend convention', () => {
    assertEquals(parseSemverTag('0.1.0'), {
      version: '0.1.0',
      code: 1_000_000,
    });
    assertEquals(parseSemverTag('1.12.1'), {
      version: '1.12.1',
      code: 1_012_001_000,
    });
    assertEquals(parseSemverTag('1.13.0'), {
      version: '1.13.0',
      code: 1_013_000_000,
    });
    assertEquals(parseSemverTag('v2.4.0'), {
      version: '2.4.0',
      code: 2_004_000_000,
    });
  });

  it('rejects tags that are not plain semver', () => {
    assertEquals(parseSemverTag('v2.4.0-rc.1'), undefined);
    assertEquals(parseSemverTag('release-2'), undefined);
    assertEquals(parseSemverTag('v2.4'), undefined);
    assertEquals(parseSemverTag(''), undefined);
  });
});

describe('isHttpsUrl', () => {
  it('accepts only https URLs', () => {
    assertEquals(isHttpsUrl('https://api.github.com/repos/a/b/releases'), true);
    assertEquals(isHttpsUrl('http://insecure.test/version.json'), false);
    assertEquals(isHttpsUrl('ftp://example.test/x'), false);
    assertEquals(isHttpsUrl('not-a-url'), false);
  });
});
