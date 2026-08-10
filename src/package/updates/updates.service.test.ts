import { afterEach, describe, it } from '@std/testing/bdd';
import { assertEquals, assertRejects, assertThrows } from '@std/assert';
import { assertSpyCalls, spy } from '@std/testing/mock';
import { stringify } from '@std/yaml';
import { NotFoundException } from '@danet/core';
import type {
  GithubRelease,
  GithubReleaseOutcome,
  GithubReleaseSelector,
  GithubService,
} from '@scope/service/github';
import { SecretService } from '@scope/secret';
import { createMockLogger, createMockSecret } from '@scope/common/testing';
import { STALE_AFTER_HOURS } from './updates.repository.ts';
import type { UpdatesRepository } from './updates.repository.ts';
import {
  computePolicyFingerprint,
  type UpdateSource,
} from './updates.config.ts';
import type {
  UpdateChannel,
  UpdateDecision,
  UpdateProduct,
  UpdateRecord,
  UpdateRelease,
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
  selector: { type: 'stable' },
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
      selector: item.selector,
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
  policyFingerprint: 'fixture-fingerprint',
  ...overrides,
});

const createHarness = (
  options: {
    sources?: UpdateSource[];
    fetchReleasesImpl?: (
      owner: string,
      repo: string,
      options: {
        selector: GithubReleaseSelector;
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
      _fingerprint?: string,
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
    github: { fetchReleases, fetchVersionProperties },
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

/**
 * Narrow an UPDATE_AVAILABLE decision to its release, failing the test
 * on any other status.
 */
const expectAvailable = (decision: UpdateDecision): UpdateRelease => {
  if (decision.status !== 'UPDATE_AVAILABLE') {
    throw new Error(
      `Expected UPDATE_AVAILABLE decision, got ${decision.status}`,
    );
  }
  return decision.release;
};

/**
 * Yield control so pending microtasks (and macrotasks) can run. The
 * refresh path awaits the repository and the policy fingerprint
 * digest (crypto.subtle resolves off the main thread) before issuing
 * the upstream call, so assertions on call counts need the event loop
 * flushed several times first.
 */
const flushAsync = async (): Promise<void> => {
  for (let i = 0; i < 5; i++) {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
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
    const upserted = repository.upsert.calls.map((call) => call.args[0]);
    const appRecord = upserted.find((record) =>
      record.product === 'ANITREND_APP' && record.channel === 'STABLE'
    );
    assertEquals(appRecord?.tag, 'v2.4.0');
    assertEquals(appRecord?.name, 'Release 2.4.0');
    assertEquals(appRecord?.code, 20400);
    assertEquals(appRecord?.version, '2.4.0');
    assertEquals(appRecord?.publishedAt, 1_752_000_000_000);
    assertEquals(appRecord?.prerelease, false);
    assertEquals(appRecord?.htmlUrl, release().htmlUrl);
    assertEquals(typeof appRecord?.updatedAt, 'number');
  });

  it('refreshes with no sources into an empty result', async () => {
    const { service, repository } = createHarness({ sources: [] });

    const result = await service.refresh();

    assertEquals(result.skipped, false);
    assertEquals(result.results, []);
    assertSpyCalls(repository.upsert, 0);
  });

  it('passes the structured selector and rolling window to fetchReleases', async () => {
    const { service, github } = createHarness({
      sources: [
        source({
          channel: 'BETA',
          selector: { type: 'prerelease', identifiers: ['beta', 'rc'] },
          rollingWindowDays: 90,
        }),
      ],
    });

    await service.refresh();

    assertSpyCalls(github.fetchReleases, 1);
    assertEquals(github.fetchReleases.calls[0].args[0], 'AniTrend');
    assertEquals(github.fetchReleases.calls[0].args[1], 'anitrend-app');
    assertEquals(github.fetchReleases.calls[0].args[2].selector, {
      type: 'prerelease',
      identifiers: ['beta', 'rc'],
    });
    assertEquals(github.fetchReleases.calls[0].args[2].rollingWindowDays, 90);
  });

  it('rejects a new release and retains the cached record when properties are absent', async () => {
    const cached = createRecord({
      tag: 'v2.3.9',
      code: 20399,
      version: '2.3.9',
      updatedAt: Date.now() - 13 * 60 * 60 * 1000,
    });
    const { service, repository, github } = createHarness({
      sources: [source()],
      seed: [cached],
      fetchPropertiesImpl: async () => undefined,
    });

    const result = await service.refresh();

    // The fetched release (v2.4.0) is newer than the cached v2.3.9,
    // but version resolution fails, so the source is failed and the
    // previously cached valid record is retained unchanged.
    assertEquals(result.results, [
      { product: 'ANITREND_APP', channel: 'STABLE', status: 'failed' },
    ]);
    assertSpyCalls(github.fetchVersionProperties, 1);
    assertSpyCalls(repository.upsert, 0);
    const served = await service.getUpdate('ANITREND_APP', 'STABLE', 20398);
    assertEquals(served.status, 'UPDATE_AVAILABLE');
    assertEquals(expectAvailable(served).code, 20399);
    assertEquals(expectAvailable(served).version, '2.3.9');
  });

  it('marks the source failed when no properties path is configured', async () => {
    const { service, repository, github } = createHarness({
      sources: [source({ propertiesPath: undefined })],
    });

    const result = await service.refresh();

    assertEquals(result.results, [
      { product: 'ANITREND_APP', channel: 'STABLE', status: 'failed' },
    ]);
    // No authoritative code source: the candidate is rejected without
    // any upstream version-properties call.
    assertSpyCalls(github.fetchVersionProperties, 0);
    assertSpyCalls(repository.upsert, 0);
  });

  it('accepts a 304 when the cached candidate is eligible without a second request', async () => {
    const policyFingerprint = await computePolicyFingerprint(source());
    const staleRecord = createRecord({
      updatedAt: Date.now() - 13 * 60 * 60 * 1000,
      etag: '"abc123"',
      policyFingerprint,
    });
    const { service, repository, github } = createHarness({
      sources: [source()],
      seed: [staleRecord],
      fetchReleasesImpl: async () => ({ status: 'not-modified' }),
    });

    const result = await service.refresh();

    assertEquals(result.results, [
      { product: 'ANITREND_APP', channel: 'STABLE', status: 'unchanged' },
    ]);
    // The conditional request sent the cached ETag and the 304 was
    // trusted, so no unconditional second request happens.
    assertSpyCalls(github.fetchReleases, 1);
    assertEquals(github.fetchReleases.calls[0].args[2].ifNoneMatch, '"abc123"');
    assertSpyCalls(repository.touchFreshness, 1);
    assertSpyCalls(repository.upsert, 0);
    const touched = repository.touchFreshness.calls[0].args;
    assertEquals(touched[0], 'ANITREND_APP');
    assertEquals(touched[1], 'STABLE');
    assertEquals(touched[3], '"abc123"');
    assertEquals(touched[4], policyFingerprint);
  });

  it('rejects a 304 when the cached candidate aged out of its rolling window and re-fetches unconditionally', async () => {
    const prereleaseSource = source({
      selector: { type: 'prerelease' },
      rollingWindowDays: 30,
    });
    const policyFingerprint = await computePolicyFingerprint(prereleaseSource);
    const agedOutRecord = createRecord({
      tag: 'v2.4.0-beta.1',
      prerelease: true,
      publishedAt: Date.now() - 45 * 86_400_000,
      etag: '"abc123"',
      policyFingerprint,
    });
    let calls = 0;
    const { service, repository, github } = createHarness({
      sources: [prereleaseSource],
      seed: [agedOutRecord],
      fetchReleasesImpl: async () => {
        calls += 1;
        if (calls === 1) return { status: 'not-modified' };
        // Unconditional re-fetch: nothing qualifies inside the rolling
        // window, so nothing can replace the aged-out record.
        return { status: 'ok', release: undefined, etag: undefined };
      },
    });

    const result = await service.refresh();

    assertEquals(result.results, [
      { product: 'ANITREND_APP', channel: 'STABLE', status: 'failed' },
    ]);
    // Conditional then unconditional: exactly two upstream calls.
    assertSpyCalls(github.fetchReleases, 2);
    assertEquals(github.fetchReleases.calls[0].args[2].ifNoneMatch, '"abc123"');
    assertEquals(github.fetchReleases.calls[1].args[2].ifNoneMatch, undefined);
    // The expired release is never marked fresh again.
    assertSpyCalls(repository.touchFreshness, 0);
    assertSpyCalls(repository.upsert, 0);
  });

  it('replaces an aged-out cached selection with a newly eligible release after a rejected 304', async () => {
    const prereleaseSource = source({
      selector: { type: 'prerelease' },
      rollingWindowDays: 30,
    });
    const policyFingerprint = await computePolicyFingerprint(prereleaseSource);
    const agedOutRecord = createRecord({
      tag: 'v2.4.0-beta.1',
      prerelease: true,
      publishedAt: Date.now() - 45 * 86_400_000,
      etag: '"abc123"',
      policyFingerprint,
    });
    let calls = 0;
    const { service, repository, github } = createHarness({
      sources: [prereleaseSource],
      seed: [agedOutRecord],
      fetchReleasesImpl: async () => {
        calls += 1;
        if (calls === 1) return { status: 'not-modified' };
        return {
          status: 'ok',
          release: release({ tagName: 'v2.5.0-beta.1', prerelease: true }),
          etag: '"new-etag"',
        };
      },
    });

    const result = await service.refresh();

    assertEquals(result.results, [
      {
        product: 'ANITREND_APP',
        channel: 'STABLE',
        status: 'updated',
        code: 20400,
      },
    ]);
    assertSpyCalls(github.fetchReleases, 2);
    assertSpyCalls(repository.upsert, 1);
    const record = repository.upsert.calls[0].args[0];
    assertEquals(record.tag, 'v2.5.0-beta.1');
    assertEquals(record.policyFingerprint, policyFingerprint);
  });

  it('revalidates without the cached ETag when the policy fingerprint changed', async () => {
    const staleRecord = createRecord({
      updatedAt: Date.now() - 13 * 60 * 60 * 1000,
      etag: '"abc123"',
      policyFingerprint: 'stale-policy-fingerprint',
    });
    const { service, repository, github } = createHarness({
      sources: [source()],
      seed: [staleRecord],
      fetchReleasesImpl: async () => ({
        status: 'ok',
        release: release(),
        etag: '"new-etag"',
      }),
    });

    const result = await service.refresh();

    // The cached ETag must not be sent: the record was selected under a
    // different policy fingerprint, so the revalidation is full.
    assertSpyCalls(github.fetchReleases, 1);
    assertEquals(github.fetchReleases.calls[0].args[2].ifNoneMatch, undefined);
    // Same tag still selected; freshness is refreshed and the current
    // policy fingerprint is stored.
    assertEquals(result.results, [
      { product: 'ANITREND_APP', channel: 'STABLE', status: 'unchanged' },
    ]);
    assertSpyCalls(repository.touchFreshness, 1);
    const policyFingerprint = await computePolicyFingerprint(source());
    assertEquals(repository.touchFreshness.calls[0].args[4], policyFingerprint);
  });

  it('touches freshness when the same release tag is still selected', async () => {
    const policyFingerprint = await computePolicyFingerprint(source());
    const staleRecord = createRecord({
      updatedAt: Date.now() - 13 * 60 * 60 * 1000,
      etag: null,
      policyFingerprint,
    });
    const { service, repository } = createHarness({
      sources: [source()],
      seed: [staleRecord],
      fetchReleasesImpl: async () => ({
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
    // The new ETag and the current policy fingerprint are stored for
    // the next conditional request.
    assertEquals(repository.touchFreshness.calls[0].args[3], '"new-etag"');
    assertEquals(repository.touchFreshness.calls[0].args[4], policyFingerprint);
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

    const result = await service.getUpdate('ANITREND_APP', 'STABLE', 20399);

    assertEquals(result.status, 'UPDATE_AVAILABLE');
    assertEquals(expectAvailable(result).code, 20400);
    assertSpyCalls(github.fetchReleases, 0);
    assertSpyCalls(repository.upsert, 0);
  });

  it('offers an update when the client version code is lower than the release code', async () => {
    const { service } = createHarness({
      sources: [source()],
      seed: [createRecord()],
    });

    const result = await service.getUpdate('ANITREND_APP', 'STABLE', 20399);

    assertEquals(result.status, 'UPDATE_AVAILABLE');
    assertEquals(expectAvailable(result).code, 20400);
  });

  it('is UP_TO_DATE when the client version code equals the release code', async () => {
    const { service } = createHarness({
      sources: [source()],
      seed: [createRecord()],
    });

    const result = await service.getUpdate('ANITREND_APP', 'STABLE', 20400);

    assertEquals(result, { status: 'UP_TO_DATE' });
  });

  it('is UP_TO_DATE when the client version code is higher than the release code', async () => {
    const { service } = createHarness({
      sources: [source()],
      seed: [createRecord()],
    });

    const result = await service.getUpdate('ANITREND_APP', 'STABLE', 20500);

    assertEquals(result, { status: 'UP_TO_DATE' });
  });

  it('returns UNSUPPORTED when no source is configured for the product/channel', async () => {
    const { service, github } = createHarness({ sources: [] });

    const result = await service.getUpdate('ANITREND_APP', 'STABLE', 20399);

    assertEquals(result, { status: 'UNSUPPORTED' });
    assertSpyCalls(github.fetchReleases, 0);
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

    const result = await service.getUpdate('ANITREND_APP', 'STABLE', 20399);

    assertEquals(result.status, 'UPDATE_AVAILABLE');
    assertEquals(expectAvailable(result).code, 20400);
    assertSpyCalls(github.fetchReleases, 1);
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
      fetchReleasesImpl: async () => undefined,
    });

    const result = await service.getUpdate('ANITREND_APP', 'STABLE', 20398);

    assertEquals(result.status, 'UPDATE_AVAILABLE');
    assertEquals(expectAvailable(result).code, 20399);
    assertSpyCalls(github.fetchReleases, 1);
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

    const result = await service.getUpdate('ANITREND_APP', 'STABLE', 20398);

    assertEquals(result.status, 'UPDATE_AVAILABLE');
    assertEquals(expectAvailable(result).code, 20399);
    assertSpyCalls(github.fetchReleases, 1);
    // Cooldown applies: an immediate retry must not fetch again.
    await service.getUpdate('ANITREND_APP', 'STABLE', 20398);
    assertSpyCalls(github.fetchReleases, 1);
  });

  it('returns NotFound when the on-demand refresh rejects and no record exists', async () => {
    const { service } = createHarness({
      sources: [source()],
      upsertImpl: async () => {
        throw new Error('persistence failure');
      },
    });

    await assertRejects(
      () => service.getUpdate('ANITREND_APP', 'STABLE', 20399),
      NotFoundException,
    );
  });

  it('does not retry a failed missing-source refresh within the cooldown', async () => {
    const { service, github } = createHarness({
      sources: [source()],
      fetchReleasesImpl: async () => undefined,
    });

    await assertRejects(
      () => service.getUpdate('ANITREND_APP', 'STABLE', 20399),
      NotFoundException,
    );
    await assertRejects(
      () => service.getUpdate('ANITREND_APP', 'STABLE', 20399),
      NotFoundException,
    );

    assertSpyCalls(github.fetchReleases, 1);
  });

  it('serves fresh cache hits without refresh attempts or cooldown interaction', async () => {
    const { service, repository, github } = createHarness({
      sources: [source()],
      seed: [createRecord()],
    });

    await service.getUpdate('ANITREND_APP', 'STABLE', 20399);
    await service.getUpdate('ANITREND_APP', 'STABLE', 20399);

    assertSpyCalls(repository.findByKey, 2);
    assertSpyCalls(github.fetchReleases, 0);
  });

  it('retries an on-demand refresh after the cooldown expires', async () => {
    const staleRecord = createRecord({
      code: 20399,
      updatedAt: Date.now() - 13 * 60 * 60 * 1000,
    });
    const { service, github } = createHarness({
      sources: [source()],
      seed: [staleRecord],
      fetchReleasesImpl: async () => undefined,
    });

    assertEquals(
      expectAvailable(
        await service.getUpdate('ANITREND_APP', 'STABLE', 20398),
      ).code,
      20399,
    );
    assertSpyCalls(github.fetchReleases, 1);

    assertEquals(
      expectAvailable(
        await service.getUpdate('ANITREND_APP', 'STABLE', 20398),
      ).code,
      20399,
    );
    assertSpyCalls(github.fetchReleases, 1);

    setOnDemandRefreshAt(
      service,
      'ANITREND_APP:STABLE',
      Date.now() - ON_DEMAND_REFRESH_COOLDOWN_MS - 1,
    );
    assertEquals(
      expectAvailable(
        await service.getUpdate('ANITREND_APP', 'STABLE', 20398),
      ).code,
      20399,
    );
    assertSpyCalls(github.fetchReleases, 2);
  });

  it('refreshes only the requested product/channel on demand', async () => {
    const { service, github, repository } = createHarness({
      sources: [
        source(),
        source({ channel: 'BETA' }),
      ],
    });

    await service.getUpdate('ANITREND_APP', 'STABLE', 20399);

    assertSpyCalls(github.fetchReleases, 1);
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
      fetchReleasesImpl: async () => ({
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
      fetchReleasesImpl: async () => ({
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

    const result = await service.getUpdate('ANITREND_APP', 'STABLE', 20399);

    assertEquals(
      expectAvailable(result).assets.map((asset) => asset.name),
      ['app-release.apk'],
    );
    assertSpyCalls(github.fetchReleases, 0);
  });

  it('serves cached records per product identity without cross-product leaks', async () => {
    const { service, github } = createHarness({
      sources: [
        source(),
        source({ product: 'ANITREND_V2', channel: 'EXPERIMENTAL' }),
      ],
      seed: [createRecord({ product: 'ANITREND_V2', channel: 'EXPERIMENTAL' })],
    });

    const v2 = await service.getUpdate('ANITREND_V2', 'EXPERIMENTAL', 20399);
    assertEquals(v2.status, 'UPDATE_AVAILABLE');
    assertEquals(expectAvailable(v2).product, 'ANITREND_V2');

    // Same channel, different product: no source is configured for
    // ANITREND_APP:EXPERIMENTAL, so the decision is UNSUPPORTED with
    // no upstream call and no cross-product fallback.
    const unsupported = await service.getUpdate(
      'ANITREND_APP',
      'EXPERIMENTAL',
      20399,
    );
    assertEquals(unsupported, { status: 'UNSUPPORTED' });
    assertSpyCalls(github.fetchReleases, 0);
  });

  it('awaits the shared in-flight refresh instead of fetching again', async () => {
    let resolveFetch!: (value: GithubReleaseOutcome | undefined) => void;
    const pending = new Promise<GithubReleaseOutcome | undefined>((resolve) => {
      resolveFetch = resolve;
    });
    const staleRecord = createRecord({
      tag: 'v2.3.9',
      code: 20399,
      updatedAt: Date.now() - 13 * 60 * 60 * 1000,
    });
    const { service, github } = createHarness({
      sources: [source()],
      seed: [staleRecord],
      fetchReleasesImpl: () => pending,
    });

    const inFlight = service.refresh();
    // Do not await yet: getUpdate joins the in-flight refresh instead
    // of skipping or issuing a second upstream call.
    const pendingGet = service.getUpdate('ANITREND_APP', 'STABLE', 20399);
    await flushAsync();
    assertSpyCalls(github.fetchReleases, 1);

    resolveFetch({
      status: 'ok',
      release: release(),
      etag: undefined,
    });
    const result = await pendingGet;

    // The request path awaited the shared refresh and serves the fresh
    // record, not the stale one.
    assertEquals(result.status, 'UPDATE_AVAILABLE');
    assertEquals(expectAvailable(result).code, 20400);
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
      assertSpyCalls(github.fetchReleases as never, 0);
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

  it('marks the source failed when version is missing from properties', async () => {
    const { service, repository } = createHarness({
      sources: [source()],
      fetchPropertiesImpl: async () => 'VERSION_CODE=20400\n',
    });

    const result = await service.refresh();

    assertEquals(result.results, [
      { product: 'ANITREND_APP', channel: 'STABLE', status: 'failed' },
    ]);
    assertSpyCalls(repository.upsert, 0);
  });

  it('marks the source failed when code is missing from properties', async () => {
    const { service, repository } = createHarness({
      sources: [source()],
      fetchPropertiesImpl: async () => 'VERSION_NAME=2.4.0\n',
    });

    const result = await service.refresh();

    assertEquals(result.results, [
      { product: 'ANITREND_APP', channel: 'STABLE', status: 'failed' },
    ]);
    assertSpyCalls(repository.upsert, 0);
  });

  it('marks the source failed when the properties code is not positive', async () => {
    for (const code of ['0', '-5', '1.5']) {
      const { service, repository } = createHarness({
        sources: [source()],
        fetchPropertiesImpl: async () =>
          `VERSION_NAME=2.4.0\nVERSION_CODE=${code}\n`,
      });

      const result = await service.refresh();

      assertEquals(result.results, [
        { product: 'ANITREND_APP', channel: 'STABLE', status: 'failed' },
      ]);
      assertSpyCalls(repository.upsert, 0);
    }
  });

  it('marks the source failed when the properties fetch 404s', async () => {
    const { service, repository } = createHarness({
      sources: [source()],
      // A 404 at the GitHub layer resolves to undefined.
      fetchPropertiesImpl: async () => undefined,
    });

    const result = await service.refresh();

    assertEquals(result.results, [
      { product: 'ANITREND_APP', channel: 'STABLE', status: 'failed' },
    ]);
    assertSpyCalls(repository.upsert, 0);
  });

  it('marks the source failed on a properties network failure', async () => {
    const { service, repository } = createHarness({
      sources: [source()],
      // A network failure at the GitHub layer also resolves to
      // undefined.
      fetchPropertiesImpl: async () => undefined,
    });

    const result = await service.refresh();

    assertEquals(result.results, [
      { product: 'ANITREND_APP', channel: 'STABLE', status: 'failed' },
    ]);
    assertSpyCalls(repository.upsert, 0);
  });

  it('marks the source failed on malformed properties text', async () => {
    const { service, repository } = createHarness({
      sources: [source()],
      fetchPropertiesImpl: async () => 'not=a properties document\n',
    });

    const result = await service.refresh();

    assertEquals(result.results, [
      { product: 'ANITREND_APP', channel: 'STABLE', status: 'failed' },
    ]);
    assertSpyCalls(repository.upsert, 0);
  });

  it('single-flights concurrent refreshes for the same source', async () => {
    let resolveFetch!: (value: GithubReleaseOutcome | undefined) => void;
    const pending = new Promise<GithubReleaseOutcome | undefined>((resolve) => {
      resolveFetch = resolve;
    });
    const { service, github } = createHarness({
      sources: [source()],
      fetchReleasesImpl: () => pending,
    });

    const first = service.refreshSource('ANITREND_APP', 'STABLE');
    const second = service.refreshSource('ANITREND_APP', 'STABLE');
    await flushAsync();
    assertSpyCalls(github.fetchReleases, 1);

    resolveFetch({ status: 'ok', release: release(), etag: undefined });
    const [firstResult, secondResult] = await Promise.all([first, second]);

    assertEquals(firstResult, secondResult);
    assertEquals(firstResult.status, 'updated');
    assertSpyCalls(github.fetchReleases, 1);
  });

  it('refreshes different sources concurrently without sharing work', async () => {
    const { service, github } = createHarness({
      sources: [
        source(),
        source({ channel: 'BETA', selector: { type: 'prerelease' } }),
      ],
    });

    const first = service.refreshSource('ANITREND_APP', 'STABLE');
    const second = service.refreshSource('ANITREND_APP', 'BETA');
    await Promise.all([first, second]);

    assertSpyCalls(github.fetchReleases, 2);
  });

  it('bounds scheduled refresh concurrency to the configured limit', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const { service } = createHarness({
      sources: [
        source(),
        source({ channel: 'BETA' }),
        source({ channel: 'EXPERIMENTAL' }),
        source({ product: 'ANITREND_V2', channel: 'STABLE' }),
        source({ product: 'ANITREND_V2', channel: 'BETA' }),
        source({ product: 'ANITREND_V2', channel: 'EXPERIMENTAL' }),
      ],
      fetchReleasesImpl: async () => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((resolve) => setTimeout(resolve, 10));
        inFlight -= 1;
        return { status: 'ok', release: release(), etag: undefined };
      },
    });

    const result = await service.refresh();

    assertEquals(result.skipped, false);
    assertEquals(result.results.length, 6);
    assertEquals(maxInFlight <= 3, true);
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
