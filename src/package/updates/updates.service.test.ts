import { afterEach, describe, it } from '@std/testing/bdd';
import { assertEquals, assertRejects, assertThrows } from '@std/assert';
import { assertSpyCalls, spy } from '@std/testing/mock';
import { stringify } from '@std/yaml';
import { NotFoundException } from '@danet/core';
import type {
  GithubRelease,
  GithubReleaseOutcome,
  GithubService,
} from '@scope/service/github';
import { SecretService } from '@scope/secret';
import { createMockLogger, createMockSecret } from '@scope/common/testing';
import { STALE_AFTER_HOURS } from './updates.repository.ts';
import type { UpdatesRepository } from './updates.repository.ts';
import type { UpdateSource } from './updates.config.ts';
import type {
  UpdateChannel,
  UpdateProduct,
  UpdateRecord,
} from './updates.types.ts';
import {
  DEFAULT_REFRESH_INTERVAL_HOURS,
  ON_DEMAND_REFRESH_COOLDOWN_MS,
  parseRefreshIntervalHours,
  UpdatesService,
} from './updates.service.ts';

const source = (overrides: Partial<UpdateSource> = {}): UpdateSource => ({
  product: 'ANITREND_APP',
  channel: 'STABLE',
  repository: 'AniTrend/anitrend-app',
  propertiesPath: 'gradle/version.properties',
  selector: 'stable',
  ...overrides,
});

/**
 * Convert flat sources into the product-centric YAML config document
 * the loader expects, so the harness exercises the real config path.
 */
const sourcesToConfigYaml = (sources: UpdateSource[]): string => {
  const products: Record<
    string,
    {
      repository: string;
      version?: { propertiesPath: string };
      channels: Record<string, unknown>;
    }
  > = {};
  for (const item of sources) {
    const product = products[item.product] ?? {
      repository: item.repository,
      channels: {},
    };
    products[item.product] = product;
    if (item.propertiesPath !== undefined) {
      product.version = { propertiesPath: item.propertiesPath };
    }
    product.channels[item.channel] = {
      selector: item.selector === 'stable'
        ? { type: 'stable' }
        : { type: 'prerelease' },
      ...(item.rollingWindowDays !== undefined
        ? { rollingWindowDays: item.rollingWindowDays }
        : {}),
      ...(item.assets !== undefined
        ? { assets: { preferred: item.assets } }
        : {}),
    };
  }
  return stringify({ schemaVersion: 1, products });
};

/** Temp config files written by the harness, removed after each test. */
const tempConfigPaths: string[] = [];

const writeRawConfig = (text: string): string => {
  const path = Deno.makeTempFileSync({ suffix: '.yml' });
  Deno.writeTextFileSync(path, text);
  tempConfigPaths.push(path);
  return path;
};

const writeSourcesConfig = (sources: UpdateSource[]): string => {
  return writeRawConfig(sourcesToConfigYaml(sources));
};

afterEach(() => {
  for (const path of tempConfigPaths.splice(0)) {
    try {
      Deno.removeSync(path);
    } catch {
      // Already removed; nothing left to clean up.
    }
  }
});

const release = (overrides: Partial<GithubRelease> = {}): GithubRelease => ({
  tagName: 'v2.4.0',
  name: 'Release 2.4.0',
  body: null,
  publishedAt: 1_752_000_000_000,
  prerelease: false,
  draft: false,
  htmlUrl: 'https://github.com/AniTrend/anitrend-app/releases/tag/v2.4.0',
  assets: [],
  ...overrides,
});

const propertiesText = 'VERSION_NAME=2.4.0\nVERSION_CODE=20400\n';

const createRecord = (
  overrides: Partial<UpdateRecord> = {},
): UpdateRecord => ({
  product: 'ANITREND_APP',
  channel: 'STABLE',
  tag: 'v2.4.0',
  name: 'Release 2.4.0',
  releaseNotes: null,
  publishedAt: 1_752_000_000_000,
  prerelease: false,
  htmlUrl: 'https://github.com/AniTrend/anitrend-app/releases/tag/v2.4.0',
  assets: [],
  code: 20400,
  version: '2.4.0',
  updatedAt: Date.now(),
  etag: null,
  ...overrides,
});

const createHarness = (
  options: {
    sources?: UpdateSource[];
    fetchLatestImpl?: (
      owner: string,
      repo: string,
      ifNoneMatch?: string,
    ) => Promise<GithubReleaseOutcome | undefined>;
    fetchReleasesImpl?: (
      owner: string,
      repo: string,
      options: {
        selector: 'stable' | 'prerelease';
        rollingWindowDays?: number;
        ifNoneMatch?: string;
      },
    ) => Promise<GithubReleaseOutcome | undefined>;
    fetchPropertiesImpl?: (
      owner: string,
      repo: string,
      tag: string,
      path: string,
    ) => Promise<string | undefined>;
    upsertImpl?: (record: UpdateRecord) => Promise<void>;
    seed?: UpdateRecord[];
    env?: Record<string, string>;
  } = {},
) => {
  const { service: secret } = createMockSecret({
    CLIENT_REQUEST_TIMEOUT: '5000',
    DENO_ENV: 'test',
    UPDATE_CONFIG_PATH: writeSourcesConfig(options.sources ?? []),
    ...options.env,
  });
  const loggerStub = createMockLogger();
  const fetchLatestRelease = spy(
    options.fetchLatestImpl ??
      (async (_owner: string, _repo: string, _ifNoneMatch?: string) => ({
        status: 'ok' as const,
        release: release(),
        etag: undefined as string | undefined,
      })),
  );
  const fetchReleases = spy(
    options.fetchReleasesImpl ??
      (async (_owner: string, _repo: string) => ({
        status: 'ok' as const,
        release: release(),
        etag: undefined as string | undefined,
      })),
  );
  const fetchVersionProperties = spy(
    options.fetchPropertiesImpl ??
      (async (_owner: string, _repo: string, _tag: string, _path: string) =>
        propertiesText),
  );
  const github = {
    fetchLatestRelease,
    fetchReleases,
    fetchVersionProperties,
  } as unknown as GithubService;
  const records = new Map<string, UpdateRecord>(
    (options.seed ?? []).map((record) => [
      `${record.product}:${record.channel}`,
      record,
    ]),
  );
  const findByKey = spy(
    async (product: UpdateProduct, channel: UpdateChannel) =>
      records.get(`${product}:${channel}`) ?? null,
  );
  const touchFreshness = spy(
    async (
      product: UpdateProduct,
      channel: UpdateChannel,
      _now?: number,
      _etag?: string,
    ) => {
      const key = `${product}:${channel}`;
      const record = records.get(key);
      if (record) {
        records.set(key, { ...record, updatedAt: Date.now() });
      }
    },
  );
  const upsert = spy(
    options.upsertImpl ??
      (async (record: UpdateRecord) => {
        records.set(`${record.product}:${record.channel}`, record);
      }),
  );
  const isStale = spy(
    (
      record: Pick<UpdateRecord, 'updatedAt'>,
      now: number = Date.now(),
    ) => now - record.updatedAt >= STALE_AFTER_HOURS * 60 * 60 * 1000,
  );
  const repository = {
    findByKey,
    touchFreshness,
    upsert,
    isStale,
  } as unknown as UpdatesRepository;
  const service = new UpdatesService(
    github,
    repository,
    secret,
    loggerStub.logger,
  );
  return {
    service,
    github: { fetchLatestRelease, fetchReleases, fetchVersionProperties },
    repository: { findByKey, touchFreshness, upsert, isStale },
    spies: loggerStub.spies,
  };
};

/** Force the per-source on-demand cooldown timestamp for determinism. */
const setOnDemandRefreshAt = (
  service: UpdatesService,
  key: string,
  at: number,
) => {
  (
    service as unknown as {
      lastOnDemandRefreshAt: Partial<Record<string, number>>;
    }
  ).lastOnDemandRefreshAt[key] = at;
};

describe('UpdatesService', () => {
  it('persists release-backed records for every configured source', async () => {
    const { service, repository } = createHarness({
      sources: [
        source(),
        source({ product: 'ANITREND_V2', channel: 'EXPERIMENTAL' }),
      ],
    });

    const result = await service.refresh();

    assertEquals(result.skipped, false);
    assertEquals(result.results, [
      {
        product: 'ANITREND_APP',
        channel: 'STABLE',
        status: 'updated',
        code: 20400,
      },
      {
        product: 'ANITREND_V2',
        channel: 'EXPERIMENTAL',
        status: 'updated',
        code: 20400,
      },
    ]);
    assertSpyCalls(repository.upsert, 2);
    const record = repository.upsert.calls[0].args[0];
    assertEquals(record.product, 'ANITREND_APP');
    assertEquals(record.channel, 'STABLE');
    assertEquals(record.tag, 'v2.4.0');
    assertEquals(record.name, 'Release 2.4.0');
    assertEquals(record.code, 20400);
    assertEquals(record.version, '2.4.0');
    assertEquals(record.publishedAt, 1_752_000_000_000);
    assertEquals(record.prerelease, false);
    assertEquals(record.htmlUrl, release().htmlUrl);
    assertEquals(typeof record.updatedAt, 'number');
  });

  it('refreshes with no sources into an empty result', async () => {
    const { service, repository } = createHarness({ sources: [] });

    const result = await service.refresh();

    assertEquals(result.skipped, false);
    assertEquals(result.results, []);
    assertSpyCalls(repository.upsert, 0);
  });

  it('uses the prerelease list path with the rolling window for prerelease selectors', async () => {
    const { service, github } = createHarness({
      sources: [
        source({
          channel: 'BETA',
          selector: 'prerelease',
          rollingWindowDays: 90,
        }),
      ],
    });

    await service.refresh();

    assertSpyCalls(github.fetchLatestRelease, 0);
    assertSpyCalls(github.fetchReleases, 1);
    assertEquals(github.fetchReleases.calls[0].args[0], 'AniTrend');
    assertEquals(github.fetchReleases.calls[0].args[1], 'anitrend-app');
    assertEquals(github.fetchReleases.calls[0].args[2].selector, 'prerelease');
    assertEquals(github.fetchReleases.calls[0].args[2].rollingWindowDays, 90);
  });

  it('falls back to the strict semver tag when properties are absent', async () => {
    const { service, repository, github } = createHarness({
      sources: [source()],
      fetchPropertiesImpl: async () => undefined,
    });

    await service.refresh();

    assertSpyCalls(github.fetchVersionProperties, 1);
    const record = repository.upsert.calls[0].args[0];
    assertEquals(record.version, '2.4.0');
    assertEquals(record.code, 2_004_000_000);
  });

  it('marks the source failed when neither properties nor the tag resolve', async () => {
    const { service, repository } = createHarness({
      sources: [source()],
      fetchPropertiesImpl: async () => undefined,
      fetchLatestImpl: async () => ({
        status: 'ok',
        release: release({ tagName: 'release-2026-01' }),
        etag: undefined,
      }),
    });

    const result = await service.refresh();

    assertEquals(result.results, [
      { product: 'ANITREND_APP', channel: 'STABLE', status: 'failed' },
    ]);
    assertSpyCalls(repository.upsert, 0);
  });

  it('touches freshness on 304 without replacing the cached release', async () => {
    const staleRecord = createRecord({
      updatedAt: Date.now() - 13 * 60 * 60 * 1000,
      etag: '"abc123"',
    });
    const { service, repository, github } = createHarness({
      sources: [source()],
      seed: [staleRecord],
      fetchLatestImpl: async () => ({ status: 'not-modified' }),
    });

    const result = await service.refresh();

    assertEquals(result.results, [
      { product: 'ANITREND_APP', channel: 'STABLE', status: 'unchanged' },
    ]);
    assertSpyCalls(github.fetchLatestRelease, 1);
    assertSpyCalls(repository.touchFreshness, 1);
    assertSpyCalls(repository.upsert, 0);
    const touched = repository.touchFreshness.calls[0].args;
    assertEquals(touched[0], 'ANITREND_APP');
    assertEquals(touched[1], 'STABLE');
  });

  it('touches freshness when the same release tag is still selected', async () => {
    const staleRecord = createRecord({
      updatedAt: Date.now() - 13 * 60 * 60 * 1000,
      etag: null,
    });
    const { service, repository } = createHarness({
      sources: [source()],
      seed: [staleRecord],
      fetchLatestImpl: async () => ({
        status: 'ok',
        release: release(),
        etag: '"new-etag"',
      }),
    });

    const result = await service.refresh();

    assertEquals(result.results, [
      { product: 'ANITREND_APP', channel: 'STABLE', status: 'unchanged' },
    ]);
    assertSpyCalls(repository.touchFreshness, 1);
    assertSpyCalls(repository.upsert, 0);
    // The new ETag is stored for the next conditional request.
    assertEquals(repository.touchFreshness.calls[0].args[3], '"new-etag"');
  });

  it('isolates a throwing source during the scheduled refresh', async () => {
    const { service, repository, spies } = createHarness({
      sources: [
        source(),
        source({ channel: 'BETA' }),
      ],
      upsertImpl: async (record) => {
        if (record.channel === 'STABLE') {
          throw new Error('persistence failure');
        }
      },
    });

    const result = await service.refresh();

    assertEquals(result.results, [
      { product: 'ANITREND_APP', channel: 'STABLE', status: 'failed' },
      {
        product: 'ANITREND_APP',
        channel: 'BETA',
        status: 'updated',
        code: 20400,
      },
    ]);
    assertSpyCalls(repository.upsert, 2);
    assertEquals(spies.warn.calls[0].args[0], 'Source refresh failed');
  });

  it('serves a fresh cached record without any GitHub calls', async () => {
    const { service, repository, github } = createHarness({
      sources: [source()],
      seed: [createRecord()],
    });

    const result = await service.getUpdate('ANITREND_APP', 'STABLE');

    assertEquals(result.code, 20400);
    assertSpyCalls(github.fetchLatestRelease, 0);
    assertSpyCalls(repository.upsert, 0);
  });

  it('refreshes a stale record once and serves the fresh result', async () => {
    const { service, repository, github } = createHarness({
      sources: [source()],
      seed: [createRecord({
        tag: 'v2.3.9',
        code: 20399,
        updatedAt: Date.now() - 13 * 60 * 60 * 1000,
      })],
    });

    const result = await service.getUpdate('ANITREND_APP', 'STABLE');

    assertEquals(result.code, 20400);
    assertSpyCalls(github.fetchLatestRelease, 1);
    assertSpyCalls(repository.upsert, 1);
  });

  it('serves the stale record when the on-demand refresh fails', async () => {
    const staleRecord = createRecord({
      code: 20399,
      updatedAt: Date.now() - 13 * 60 * 60 * 1000,
    });
    const { service, github } = createHarness({
      sources: [source()],
      seed: [staleRecord],
      fetchLatestImpl: async () => undefined,
    });

    const result = await service.getUpdate('ANITREND_APP', 'STABLE');

    assertEquals(result.code, 20399);
    assertSpyCalls(github.fetchLatestRelease, 1);
  });

  it('serves the stale record when the on-demand refresh rejects', async () => {
    const staleRecord = createRecord({
      code: 20399,
      updatedAt: Date.now() - 13 * 60 * 60 * 1000,
    });
    const { service, github } = createHarness({
      sources: [source()],
      seed: [staleRecord],
      upsertImpl: async () => {
        throw new Error('persistence failure');
      },
    });

    const result = await service.getUpdate('ANITREND_APP', 'STABLE');

    assertEquals(result.code, 20399);
    assertSpyCalls(github.fetchLatestRelease, 1);
    // Cooldown applies: an immediate retry must not fetch again.
    await service.getUpdate('ANITREND_APP', 'STABLE');
    assertSpyCalls(github.fetchLatestRelease, 1);
  });

  it('returns NotFound when the on-demand refresh rejects and no record exists', async () => {
    const { service } = createHarness({
      sources: [source()],
      upsertImpl: async () => {
        throw new Error('persistence failure');
      },
    });

    await assertRejects(
      () => service.getUpdate('ANITREND_APP', 'STABLE'),
      NotFoundException,
    );
  });

  it('does not retry a failed missing-source refresh within the cooldown', async () => {
    const { service, github } = createHarness({
      sources: [source()],
      fetchLatestImpl: async () => undefined,
    });

    await assertRejects(
      () => service.getUpdate('ANITREND_APP', 'STABLE'),
      NotFoundException,
    );
    await assertRejects(
      () => service.getUpdate('ANITREND_APP', 'STABLE'),
      NotFoundException,
    );

    assertSpyCalls(github.fetchLatestRelease, 1);
  });

  it('serves fresh cache hits without refresh attempts or cooldown interaction', async () => {
    const { service, repository, github } = createHarness({
      sources: [source()],
      seed: [createRecord()],
    });

    await service.getUpdate('ANITREND_APP', 'STABLE');
    await service.getUpdate('ANITREND_APP', 'STABLE');

    assertSpyCalls(repository.findByKey, 2);
    assertSpyCalls(github.fetchLatestRelease, 0);
  });

  it('retries an on-demand refresh after the cooldown expires', async () => {
    const staleRecord = createRecord({
      code: 20399,
      updatedAt: Date.now() - 13 * 60 * 60 * 1000,
    });
    const { service, github } = createHarness({
      sources: [source()],
      seed: [staleRecord],
      fetchLatestImpl: async () => undefined,
    });

    assertEquals(
      (await service.getUpdate('ANITREND_APP', 'STABLE')).code,
      20399,
    );
    assertSpyCalls(github.fetchLatestRelease, 1);

    assertEquals(
      (await service.getUpdate('ANITREND_APP', 'STABLE')).code,
      20399,
    );
    assertSpyCalls(github.fetchLatestRelease, 1);

    setOnDemandRefreshAt(
      service,
      'ANITREND_APP:STABLE',
      Date.now() - ON_DEMAND_REFRESH_COOLDOWN_MS - 1,
    );
    assertEquals(
      (await service.getUpdate('ANITREND_APP', 'STABLE')).code,
      20399,
    );
    assertSpyCalls(github.fetchLatestRelease, 2);
  });

  it('refreshes only the requested product/channel on demand', async () => {
    const { service, github, repository } = createHarness({
      sources: [
        source(),
        source({ channel: 'BETA' }),
      ],
    });

    await service.getUpdate('ANITREND_APP', 'STABLE');

    assertSpyCalls(github.fetchLatestRelease, 1);
    assertEquals(repository.upsert.calls[0].args[0].channel, 'STABLE');
  });

  it('persists only configured assets for a source', async () => {
    const releaseWithAssets = release({
      assets: [
        { name: 'app-github-release.apk', url: 'https://x/a.apk', size: 1 },
        { name: 'app-release.apk', url: 'https://x/b.apk', size: 2 },
        { name: 'other-file.txt', url: 'https://x/c.txt', size: 3 },
      ],
    });
    const { service, repository } = createHarness({
      sources: [
        source({ assets: ['app-github-release.apk', 'app-release.apk'] }),
      ],
      fetchLatestImpl: async () => ({
        status: 'ok',
        release: releaseWithAssets,
        etag: undefined,
      }),
    });

    await service.refresh();

    const record = repository.upsert.calls[0].args[0];
    assertEquals(
      record.assets.map((asset) => asset.name),
      ['app-github-release.apk', 'app-release.apk'],
    );
  });

  it('keeps the full release asset list when no filter is configured', async () => {
    const releaseWithAssets = release({
      assets: [
        { name: 'app-release.apk', url: 'https://x/b.apk', size: 2 },
        { name: 'other-file.txt', url: 'https://x/c.txt', size: 3 },
      ],
    });
    const { service, repository } = createHarness({
      sources: [source()],
      fetchLatestImpl: async () => ({
        status: 'ok',
        release: releaseWithAssets,
        etag: undefined,
      }),
    });

    await service.refresh();

    const record = repository.upsert.calls[0].args[0];
    assertEquals(record.assets.length, 2);
  });

  it('filters legacy cached assets at the response boundary', async () => {
    const cachedRecord = createRecord({
      assets: [
        { name: 'app-github-release.apk', url: 'https://x/a.apk', size: 1 },
        { name: 'app-release.apk', url: 'https://x/b.apk', size: 2 },
        { name: 'other-file.txt', url: 'https://x/c.txt', size: 3 },
      ],
    });
    const { service, github } = createHarness({
      sources: [source({ assets: ['app-release.apk'] })],
      seed: [cachedRecord],
    });

    const result = await service.getUpdate('ANITREND_APP', 'STABLE');

    assertEquals(
      result.assets.map((asset) => asset.name),
      ['app-release.apk'],
    );
    assertSpyCalls(github.fetchLatestRelease, 0);
  });

  it('serves cached records per product identity without cross-product leaks', async () => {
    const { service, github } = createHarness({
      sources: [
        source(),
        source({ product: 'ANITREND_V2', channel: 'EXPERIMENTAL' }),
      ],
      seed: [createRecord({ product: 'ANITREND_V2', channel: 'EXPERIMENTAL' })],
    });

    const v2 = await service.getUpdate('ANITREND_V2', 'EXPERIMENTAL');
    assertEquals(v2.product, 'ANITREND_V2');

    // Same channel, different product: no cached record and no
    // configured source for ANITREND_APP:EXPERIMENTAL, so the
    // on-demand refresh skips and NotFound is returned. No
    // cross-product fallback.
    await assertRejects(
      () => service.getUpdate('ANITREND_APP', 'EXPERIMENTAL'),
      NotFoundException,
    );
    assertSpyCalls(github.fetchLatestRelease, 0);
  });

  it('does not fetch again while a scheduled refresh is already in flight', async () => {
    let resolveFetch!: (value: GithubReleaseOutcome | undefined) => void;
    const pending = new Promise<GithubReleaseOutcome | undefined>((resolve) => {
      resolveFetch = resolve;
    });
    const staleRecord = createRecord({
      code: 20399,
      updatedAt: Date.now() - 13 * 60 * 60 * 1000,
    });
    const { service, github } = createHarness({
      sources: [source()],
      seed: [staleRecord],
      fetchLatestImpl: () => pending,
    });

    const inFlight = service.refresh();
    const result = await service.getUpdate('ANITREND_APP', 'STABLE');

    // The in-flight refresh owns the guard; the request path skips and
    // serves the stale record without a second upstream call.
    assertEquals(result.code, 20399);
    assertSpyCalls(github.fetchLatestRelease, 1);

    resolveFetch({
      status: 'ok',
      release: release(),
      etag: undefined,
    });
    await inFlight;
  });

  it('does not create a refresh timer when no sources are configured', async () => {
    const originalSetInterval = globalThis.setInterval;
    const setIntervalSpy = spy((..._args: unknown[]) => 0);
    globalThis.setInterval = setIntervalSpy as unknown as typeof setInterval;
    try {
      const { service } = createHarness({ sources: [] });

      await service.onAppBootstrap();

      assertSpyCalls(setIntervalSpy, 0);
      await service.onAppClose();
    } finally {
      globalThis.setInterval = originalSetInterval;
    }
  });

  it('creates a refresh timer when sources are configured', async () => {
    const originalSetInterval = globalThis.setInterval;
    const setIntervalSpy = spy((..._args: unknown[]) => 0);
    globalThis.setInterval = setIntervalSpy as unknown as typeof setInterval;
    try {
      const { service } = createHarness({ sources: [source()] });

      await service.onAppBootstrap();
      assertSpyCalls(setIntervalSpy, 1);
      await service.onAppClose();
    } finally {
      globalThis.setInterval = originalSetInterval;
    }
  });

  it('skips the initial refresh in CI mode using CI=true semantics', async () => {
    const previousCi = Deno.env.get('CI');
    const previousConfigPath = Deno.env.get('UPDATE_CONFIG_PATH');
    const configPath = writeSourcesConfig([source()]);
    Deno.env.set('CI', 'true');
    Deno.env.set('UPDATE_CONFIG_PATH', configPath);
    try {
      const loggerStub = createMockLogger();
      const github = {
        fetchLatestRelease: spy(async () => ({
          status: 'ok' as const,
          release: release(),
          etag: undefined as string | undefined,
        })),
        fetchReleases: spy(async () => undefined),
        fetchVersionProperties: spy(async () => propertiesText),
      } as unknown as GithubService;
      const repository = {
        findByKey: spy(async () => null),
        touchFreshness: spy(async () => {}),
        upsert: spy(async () => {}),
        isStale: spy(() => false),
      } as unknown as UpdatesRepository;
      const service = new UpdatesService(
        github,
        repository,
        new SecretService(),
        loggerStub.logger,
      );

      await service.onAppBootstrap();
      assertSpyCalls(github.fetchLatestRelease as never, 0);
      await service.onAppClose();
    } finally {
      if (previousCi === undefined) {
        Deno.env.delete('CI');
      } else {
        Deno.env.set('CI', previousCi);
      }
      if (previousConfigPath === undefined) {
        Deno.env.delete('UPDATE_CONFIG_PATH');
      } else {
        Deno.env.set('UPDATE_CONFIG_PATH', previousConfigPath);
      }
    }
  });

  it('rejects a malformed update sources config at construction', () => {
    const configPath = writeRawConfig(
      'schemaVersion: 1\nproducts: [unclosed\n',
    );
    const { service: secret } = createMockSecret({
      CLIENT_REQUEST_TIMEOUT: '5000',
      DENO_ENV: 'test',
      UPDATE_CONFIG_PATH: configPath,
    });
    const loggerStub = createMockLogger();
    const github = {} as unknown as GithubService;
    const repository = {} as unknown as UpdatesRepository;

    assertThrows(
      () => new UpdatesService(github, repository, secret, loggerStub.logger),
      Error,
      'Invalid YAML',
    );
  });

  it('rejects a missing update sources config path at construction', () => {
    const dir = Deno.makeTempDirSync();
    try {
      const { service: secret } = createMockSecret({
        CLIENT_REQUEST_TIMEOUT: '5000',
        DENO_ENV: 'test',
        UPDATE_CONFIG_PATH: `${dir}/missing.yml`,
      });
      const loggerStub = createMockLogger();
      const github = {} as unknown as GithubService;
      const repository = {} as unknown as UpdatesRepository;

      assertThrows(
        () => new UpdatesService(github, repository, secret, loggerStub.logger),
        Error,
        'Unable to read update sources config',
      );
    } finally {
      Deno.removeSync(dir, { recursive: true });
    }
  });
});

describe('parseRefreshIntervalHours', () => {
  it('falls back to the default when the value is missing or invalid', () => {
    assertEquals(parseRefreshIntervalHours(undefined), 6);
    assertEquals(parseRefreshIntervalHours(''), 6);
    assertEquals(parseRefreshIntervalHours('abc'), 6);
    assertEquals(parseRefreshIntervalHours('6.5'), 6);
    assertEquals(parseRefreshIntervalHours('0'), 6);
    assertEquals(parseRefreshIntervalHours('-3'), 6);
    assertEquals(parseRefreshIntervalHours('13'), 6);
    assertEquals(parseRefreshIntervalHours('168'), 6);
    assertEquals(parseRefreshIntervalHours('169'), 6);
    assertEquals(
      parseRefreshIntervalHours('999'),
      DEFAULT_REFRESH_INTERVAL_HOURS,
    );
  });

  it('accepts whole hours within the configured bounds', () => {
    assertEquals(parseRefreshIntervalHours('1'), 1);
    assertEquals(parseRefreshIntervalHours('6'), 6);
    assertEquals(parseRefreshIntervalHours('12'), 12);
  });
});
