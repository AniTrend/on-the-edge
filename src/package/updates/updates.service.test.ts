import { describe, it } from '@std/testing/bdd';
import { assertEquals, assertRejects } from '@std/assert';
import { assertSpyCalls, spy } from '@std/testing/mock';
import { NotFoundException } from '@danet/core';
import type { GithubService, GithubVersionJson } from '@scope/service/github';
import { SecretService } from '@scope/secret';
import { createMockLogger, createMockSecret } from '@scope/common/testing';
import { STALE_AFTER_HOURS } from './updates.repository.ts';
import type { UpdatesRepository } from './updates.repository.ts';
import type { UpdateChannel, UpdateRecord } from './updates.types.ts';
import {
  DEFAULT_REFRESH_INTERVAL_HOURS,
  ON_DEMAND_REFRESH_COOLDOWN_MS,
  parseRefreshIntervalHours,
  UpdatesService,
} from './updates.service.ts';

const STABLE_SOURCE =
  'https://raw.githubusercontent.test/anitrend/app/stable/version.json';
const BETA_SOURCE =
  'https://raw.githubusercontent.test/anitrend/app/beta/version.json';

const payload = (
  overrides: Partial<GithubVersionJson> = {},
): GithubVersionJson => ({
  code: 42,
  version: '2.4.0',
  migration: true,
  minSdk: 26,
  releaseNotes: null,
  appId: 'com.anitrend.app',
  ...overrides,
});

const createRecord = (
  overrides: Partial<UpdateRecord> = {},
): UpdateRecord => ({
  channel: 'STABLE',
  code: 42,
  version: '2.4.0',
  migration: true,
  minSdk: 26,
  releaseNotes: null,
  appId: 'com.anitrend.app',
  updatedAt: Date.now(),
  ...overrides,
});

const createHarness = (
  env: Record<string, string> = {},
  fetchImpl?: (sourceUrl: string) => Promise<GithubVersionJson | undefined>,
  seed: UpdateRecord[] = [],
  upsertImpl?: (record: UpdateRecord) => Promise<void>,
) => {
  const { service: secret } = createMockSecret({
    CLIENT_REQUEST_TIMEOUT: '5000',
    DENO_ENV: 'test',
    ...env,
  });
  const loggerStub = createMockLogger();
  const impl: (sourceUrl: string) => Promise<GithubVersionJson | undefined> =
    fetchImpl ?? (async () => payload());
  const fetchVersionJson = spy(impl);
  const github = { fetchVersionJson } as unknown as GithubService;
  const records = new Map<UpdateChannel, UpdateRecord>(
    seed.map((record) => [record.channel, record]),
  );
  const upsert = spy(
    upsertImpl ??
      (async (record: UpdateRecord) => {
        records.set(record.channel, record);
      }),
  );
  const findByChannel = spy(
    async (channel: UpdateChannel) => records.get(channel) ?? null,
  );
  const isStale = spy(
    (
      record: Pick<UpdateRecord, 'updatedAt'>,
      now: number = Date.now(),
    ) => now - record.updatedAt >= STALE_AFTER_HOURS * 60 * 60 * 1000,
  );
  const repository = {
    upsert,
    findByChannel,
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
    fetchVersionJson,
    upsert,
    findByChannel,
    spies: loggerStub.spies,
  };
};

/** Force the per-channel on-demand cooldown timestamp for determinism. */
const setOnDemandRefreshAt = (
  service: UpdatesService,
  channel: UpdateChannel,
  at: number,
) => {
  (
    service as unknown as {
      lastOnDemandRefreshAt: Partial<Record<UpdateChannel, number>>;
    }
  ).lastOnDemandRefreshAt[channel] = at;
};

describe('UpdatesService', () => {
  it('fetches and persists the latest manifest for every configured channel', async () => {
    const { service, fetchVersionJson, upsert } = createHarness({
      UPDATES_SOURCE_STABLE: STABLE_SOURCE,
      UPDATES_SOURCE_BETA: BETA_SOURCE,
    });

    const result = await service.refresh();

    assertEquals(result.skipped, false);
    assertEquals(result.results, [
      { channel: 'STABLE', status: 'updated', code: 42 },
      { channel: 'BETA', status: 'updated', code: 42 },
      { channel: 'EXPERIMENTAL', status: 'skipped' },
    ]);
    assertSpyCalls(fetchVersionJson, 2);
    assertEquals(fetchVersionJson.calls[0].args[0], STABLE_SOURCE);
    assertEquals(fetchVersionJson.calls[1].args[0], BETA_SOURCE);
    assertSpyCalls(upsert, 2);
    assertEquals(upsert.calls[0].args[0].channel, 'STABLE');
    assertEquals(upsert.calls[0].args[0].code, 42);
    assertEquals(upsert.calls[0].args[0].version, '2.4.0');
    assertEquals(upsert.calls[0].args[0].appId, 'com.anitrend.app');
    assertEquals(typeof upsert.calls[0].args[0].updatedAt, 'number');
    // No invented manifest fields are persisted
    assertEquals('url' in upsert.calls[0].args[0], false);
    assertEquals('publishedAt' in upsert.calls[0].args[0], false);
    assertEquals(upsert.calls[1].args[0].channel, 'BETA');
  });

  it('marks unconfigured channels as skipped without fetching', async () => {
    const { service, fetchVersionJson, upsert } = createHarness();

    const result = await service.refresh();

    assertEquals(result.results, [
      { channel: 'STABLE', status: 'skipped' },
      { channel: 'BETA', status: 'skipped' },
      { channel: 'EXPERIMENTAL', status: 'skipped' },
    ]);
    assertSpyCalls(fetchVersionJson, 0);
    assertSpyCalls(upsert, 0);
  });

  it('marks channels as failed when the source is unreachable', async () => {
    const { service, fetchVersionJson, upsert } = createHarness(
      {
        UPDATES_SOURCE_STABLE: STABLE_SOURCE,
        UPDATES_SOURCE_BETA: BETA_SOURCE,
      },
      async (sourceUrl) => sourceUrl === BETA_SOURCE ? undefined : payload(),
    );

    const result = await service.refresh();

    assertEquals(result.results, [
      { channel: 'STABLE', status: 'updated', code: 42 },
      { channel: 'BETA', status: 'failed' },
      { channel: 'EXPERIMENTAL', status: 'skipped' },
    ]);
    assertSpyCalls(fetchVersionJson, 2);
    assertSpyCalls(upsert, 1);
  });

  it('isolates a throwing channel during the scheduled refresh', async () => {
    const { service, fetchVersionJson, upsert, spies } = createHarness(
      {
        UPDATES_SOURCE_STABLE: STABLE_SOURCE,
        UPDATES_SOURCE_BETA: BETA_SOURCE,
      },
      undefined,
      [],
      async (record) => {
        if (record.channel === 'STABLE') {
          throw new Error('persistence failure');
        }
      },
    );

    const result = await service.refresh();

    // STABLE persistence throws; BETA must still refresh successfully
    // and EXPERIMENTAL remains skipped.
    assertEquals(result.results, [
      { channel: 'STABLE', status: 'failed' },
      { channel: 'BETA', status: 'updated', code: 42 },
      { channel: 'EXPERIMENTAL', status: 'skipped' },
    ]);
    assertSpyCalls(fetchVersionJson, 2);
    assertSpyCalls(upsert, 2);
    // Per-channel failure warning plus the failed-summary warning.
    assertEquals(
      spies.warn.calls[0].args[0],
      'Channel refresh failed',
    );
    assertSpyCalls(spies.warn, 2);
  });

  it('skips refresh while another refresh is in progress', async () => {
    let resolveFetch!: (value: GithubVersionJson | undefined) => void;
    const pending = new Promise<GithubVersionJson | undefined>((resolve) => {
      resolveFetch = resolve;
    });
    const { service } = createHarness(
      { UPDATES_SOURCE_STABLE: STABLE_SOURCE },
      () => pending,
    );

    const first = service.refresh();
    const second = await service.refresh();

    assertEquals(second.skipped, true);
    assertEquals(second.results, []);

    resolveFetch(payload());
    const firstResult = await first;
    assertEquals(firstResult.skipped, false);
    assertEquals(firstResult.results, [
      { channel: 'STABLE', status: 'updated', code: 42 },
      { channel: 'BETA', status: 'skipped' },
      { channel: 'EXPERIMENTAL', status: 'skipped' },
    ]);
  });

  it('ignores non-HTTPS source URLs and skips those channels', async () => {
    const { service, fetchVersionJson, upsert, spies } = createHarness({
      UPDATES_SOURCE_STABLE: 'http://insecure.test/version.json',
      UPDATES_SOURCE_BETA: BETA_SOURCE,
    });

    const result = await service.refresh();

    assertEquals(result.results, [
      { channel: 'STABLE', status: 'skipped' },
      { channel: 'BETA', status: 'updated', code: 42 },
      { channel: 'EXPERIMENTAL', status: 'skipped' },
    ]);
    assertSpyCalls(fetchVersionJson, 1);
    assertEquals(fetchVersionJson.calls[0].args[0], BETA_SOURCE);
    assertSpyCalls(upsert, 1);
    assertSpyCalls(spies.warn, 1);
    assertEquals(
      spies.warn.calls[0].args[0],
      'Ignoring non-HTTPS update source URL',
    );
  });

  it('skips the initial refresh in CI mode using the mock secret', async () => {
    const { service, fetchVersionJson, upsert } = createHarness({
      DENO_ENV: 'true',
      UPDATES_SOURCE_STABLE: STABLE_SOURCE,
    });

    await service.onAppBootstrap();
    await service.onAppClose();

    assertSpyCalls(fetchVersionJson, 0);
    assertSpyCalls(upsert, 0);
  });

  it('skips the initial refresh in CI mode using CI=true semantics', async () => {
    const previousCi = Deno.env.get('CI');
    const previousStable = Deno.env.get('UPDATES_SOURCE_STABLE');
    Deno.env.set('CI', 'true');
    Deno.env.set('UPDATES_SOURCE_STABLE', STABLE_SOURCE);
    try {
      const loggerStub = createMockLogger();
      const fetchVersionJson = spy(async (_url: string) => payload());
      const github = { fetchVersionJson } as unknown as GithubService;
      const upsert = spy(async (_record: UpdateRecord) => {});
      const repository = { upsert } as unknown as UpdatesRepository;
      const service = new UpdatesService(
        github,
        repository,
        new SecretService(),
        loggerStub.logger,
      );

      await service.onAppBootstrap();
      assertSpyCalls(fetchVersionJson, 0);
      assertSpyCalls(upsert, 0);
      await service.onAppClose();
    } finally {
      if (previousCi === undefined) {
        Deno.env.delete('CI');
      } else {
        Deno.env.set('CI', previousCi);
      }
      if (previousStable === undefined) {
        Deno.env.delete('UPDATES_SOURCE_STABLE');
      } else {
        Deno.env.set('UPDATES_SOURCE_STABLE', previousStable);
      }
    }
  });

  it('runs an initial refresh on bootstrap outside CI mode', async () => {
    const { service, fetchVersionJson, upsert } = createHarness({
      UPDATES_SOURCE_STABLE: STABLE_SOURCE,
    });

    await service.onAppBootstrap();
    await service.onAppClose();

    assertSpyCalls(fetchVersionJson, 1);
    assertSpyCalls(upsert, 1);
  });

  it('does not create a refresh timer when no source channels are configured', async () => {
    const originalSetInterval = globalThis.setInterval;
    const setIntervalSpy = spy((..._args: unknown[]) => 0);
    globalThis.setInterval = setIntervalSpy as unknown as typeof setInterval;
    try {
      const { service, fetchVersionJson } = createHarness();

      await service.onAppBootstrap();

      assertSpyCalls(setIntervalSpy, 0);
      assertSpyCalls(fetchVersionJson, 0);
      await service.onAppClose();
    } finally {
      globalThis.setInterval = originalSetInterval;
    }
  });

  it('creates a refresh timer when source channels are configured', async () => {
    const originalSetInterval = globalThis.setInterval;
    const setIntervalSpy = spy((..._args: unknown[]) => 0);
    globalThis.setInterval = setIntervalSpy as unknown as typeof setInterval;
    try {
      const { service } = createHarness({
        UPDATES_SOURCE_STABLE: STABLE_SOURCE,
      });

      await service.onAppBootstrap();
      assertSpyCalls(setIntervalSpy, 1);
      await service.onAppClose();
    } finally {
      globalThis.setInterval = originalSetInterval;
    }
  });

  it('serves a fresh cached record without fetching from GitHub', async () => {
    const { service, fetchVersionJson, upsert, findByChannel } = createHarness(
      { UPDATES_SOURCE_STABLE: STABLE_SOURCE },
      undefined,
      [createRecord({ channel: 'STABLE' })],
    );

    const result = await service.getUpdate('STABLE');

    assertEquals(result.code, 42);
    assertSpyCalls(findByChannel, 1);
    assertSpyCalls(fetchVersionJson, 0);
    assertSpyCalls(upsert, 0);
  });

  it('refreshes a stale cached record once and serves the fresh result', async () => {
    const { service, fetchVersionJson, upsert } = createHarness(
      { UPDATES_SOURCE_STABLE: STABLE_SOURCE },
      undefined,
      [createRecord({
        channel: 'STABLE',
        code: 41,
        updatedAt: Date.now() - 13 * 60 * 60 * 1000,
      })],
    );

    const result = await service.getUpdate('STABLE');

    assertEquals(result.code, 42);
    assertSpyCalls(fetchVersionJson, 1);
    assertSpyCalls(upsert, 1);
  });

  it('serves the stale record when the refresh fails', async () => {
    const staleRecord = createRecord({
      channel: 'STABLE',
      code: 41,
      updatedAt: Date.now() - 13 * 60 * 60 * 1000,
    });
    const { service, fetchVersionJson, upsert } = createHarness(
      { UPDATES_SOURCE_STABLE: STABLE_SOURCE },
      async () => undefined,
      [staleRecord],
    );

    const result = await service.getUpdate('STABLE');

    assertEquals(result.code, 41);
    assertSpyCalls(fetchVersionJson, 1);
    assertSpyCalls(upsert, 0);
  });

  it('refreshes once when no cached record exists and returns it', async () => {
    const { service, fetchVersionJson, upsert } = createHarness({
      UPDATES_SOURCE_STABLE: STABLE_SOURCE,
    });

    const result = await service.getUpdate('STABLE');

    assertEquals(result.code, 42);
    assertSpyCalls(fetchVersionJson, 1);
    assertSpyCalls(upsert, 1);
  });

  it('throws NotFound when the channel is missing and unconfigured', async () => {
    const { service, fetchVersionJson } = createHarness();

    await assertRejects(
      () => service.getUpdate('EXPERIMENTAL'),
      NotFoundException,
    );
    assertSpyCalls(fetchVersionJson, 0);
  });

  it('serves a fresh cached record for an unconfigured channel without fetching', async () => {
    const { service, fetchVersionJson } = createHarness(
      {},
      undefined,
      [createRecord({ channel: 'EXPERIMENTAL' })],
    );

    const result = await service.getUpdate('EXPERIMENTAL');

    assertEquals(result.channel, 'EXPERIMENTAL');
    assertSpyCalls(fetchVersionJson, 0);
  });

  it('does not fetch again while a scheduled refresh is already in flight', async () => {
    let resolveFetch!: (value: GithubVersionJson | undefined) => void;
    const pending = new Promise<GithubVersionJson | undefined>((resolve) => {
      resolveFetch = resolve;
    });
    const staleRecord = createRecord({
      channel: 'STABLE',
      code: 41,
      updatedAt: Date.now() - 13 * 60 * 60 * 1000,
    });
    const { service, fetchVersionJson } = createHarness(
      { UPDATES_SOURCE_STABLE: STABLE_SOURCE },
      () => pending,
      [staleRecord],
    );

    const inFlight = service.refresh();
    const result = await service.getUpdate('STABLE');

    // The in-flight refresh owns the guard; the request path skips and
    // serves the stale record without a second upstream call.
    assertEquals(result.code, 41);
    assertSpyCalls(fetchVersionJson, 1);

    resolveFetch(payload());
    await inFlight;
  });

  it('serves the stale record when the on-demand refresh rejects', async () => {
    const staleRecord = createRecord({
      channel: 'STABLE',
      code: 41,
      updatedAt: Date.now() - 13 * 60 * 60 * 1000,
    });
    const { service, fetchVersionJson } = createHarness(
      { UPDATES_SOURCE_STABLE: STABLE_SOURCE },
      undefined,
      [staleRecord],
      async () => {
        throw new Error('persistence failure');
      },
    );

    const result = await service.getUpdate('STABLE');

    assertEquals(result.code, 41);
    assertSpyCalls(fetchVersionJson, 1);
    // Cooldown applies: an immediate retry must not fetch again.
    await service.getUpdate('STABLE');
    assertSpyCalls(fetchVersionJson, 1);
  });

  it('returns NotFound when the on-demand refresh rejects and no record exists', async () => {
    const { service, fetchVersionJson } = createHarness(
      { UPDATES_SOURCE_STABLE: STABLE_SOURCE },
      undefined,
      [],
      async () => {
        throw new Error('persistence failure');
      },
    );

    await assertRejects(
      () => service.getUpdate('STABLE'),
      NotFoundException,
    );
    assertSpyCalls(fetchVersionJson, 1);
  });

  it('does not retry a failed missing-channel refresh within the cooldown', async () => {
    const { service, fetchVersionJson } = createHarness(
      { UPDATES_SOURCE_STABLE: STABLE_SOURCE },
      async () => undefined,
    );

    await assertRejects(() => service.getUpdate('STABLE'), NotFoundException);
    await assertRejects(() => service.getUpdate('STABLE'), NotFoundException);

    assertSpyCalls(fetchVersionJson, 1);
  });

  it('serves fresh cache hits without refresh attempts or cooldown interaction', async () => {
    const { service, fetchVersionJson, findByChannel } = createHarness(
      { UPDATES_SOURCE_STABLE: STABLE_SOURCE },
      undefined,
      [createRecord({ channel: 'STABLE' })],
    );

    await service.getUpdate('STABLE');
    await service.getUpdate('STABLE');

    assertSpyCalls(findByChannel, 2);
    assertSpyCalls(fetchVersionJson, 0);
  });

  it('retries an on-demand refresh after the cooldown expires', async () => {
    const staleRecord = createRecord({
      channel: 'STABLE',
      code: 41,
      updatedAt: Date.now() - 13 * 60 * 60 * 1000,
    });
    const { service, fetchVersionJson } = createHarness(
      { UPDATES_SOURCE_STABLE: STABLE_SOURCE },
      async () => undefined,
      [staleRecord],
    );

    // First attempt fails; stale record is served.
    assertEquals((await service.getUpdate('STABLE')).code, 41);
    assertSpyCalls(fetchVersionJson, 1);

    // Within the cooldown: no second attempt.
    assertEquals((await service.getUpdate('STABLE')).code, 41);
    assertSpyCalls(fetchVersionJson, 1);

    // After the cooldown: a new attempt is allowed.
    setOnDemandRefreshAt(
      service,
      'STABLE',
      Date.now() - ON_DEMAND_REFRESH_COOLDOWN_MS - 1,
    );
    assertEquals((await service.getUpdate('STABLE')).code, 41);
    assertSpyCalls(fetchVersionJson, 2);
  });

  it('refreshes only the requested channel on demand', async () => {
    const { service, fetchVersionJson, upsert } = createHarness({
      UPDATES_SOURCE_STABLE: STABLE_SOURCE,
      UPDATES_SOURCE_BETA: BETA_SOURCE,
    });

    await service.getUpdate('STABLE');

    assertSpyCalls(fetchVersionJson, 1);
    assertEquals(fetchVersionJson.calls[0].args[0], STABLE_SOURCE);
    assertSpyCalls(upsert, 1);
    assertEquals(upsert.calls[0].args[0].channel, 'STABLE');
  });

  it('omits migration from persisted records when the manifest omits it', async () => {
    const { service, upsert } = createHarness(
      { UPDATES_SOURCE_STABLE: STABLE_SOURCE },
      async () => payload({ migration: null }),
    );

    await service.refresh();

    assertEquals('migration' in upsert.calls[0].args[0], false);
  });

  it('preserves valid boolean and string migration values', async () => {
    const booleanHarness = createHarness(
      { UPDATES_SOURCE_STABLE: STABLE_SOURCE },
      async () => payload({ migration: true }),
    );
    await booleanHarness.service.refresh();
    assertEquals(booleanHarness.upsert.calls[0].args[0].migration, true);

    const falseHarness = createHarness(
      { UPDATES_SOURCE_STABLE: STABLE_SOURCE },
      async () => payload({ migration: false }),
    );
    await falseHarness.service.refresh();
    assertEquals(falseHarness.upsert.calls[0].args[0].migration, false);

    const stringHarness = createHarness(
      { UPDATES_SOURCE_STABLE: STABLE_SOURCE },
      async () => payload({ migration: '3.0.0' }),
    );
    await stringHarness.service.refresh();
    assertEquals(stringHarness.upsert.calls[0].args[0].migration, '3.0.0');
  });

  it('never returns null migration on the request path', async () => {
    // Legacy record carrying migration: null, invalid per the current
    // schema; the response boundary must still omit it.
    const legacy = createRecord({
      channel: 'STABLE',
      migration: null as never,
    });
    const { service, fetchVersionJson } = createHarness(
      { UPDATES_SOURCE_STABLE: STABLE_SOURCE },
      undefined,
      [legacy],
    );

    const result = await service.getUpdate('STABLE');

    assertEquals('migration' in result, false);
    assertEquals((result as Record<string, unknown>).migration, undefined);
    assertSpyCalls(fetchVersionJson, 0);
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
