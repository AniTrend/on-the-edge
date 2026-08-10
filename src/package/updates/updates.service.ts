import { Injectable, NotFoundException, SCOPE } from '@danet/core';
import { OnAppBootstrap, OnAppClose } from '@danet/core/hook';
import {
  type GithubRelease,
  GithubService,
  parseVersionProperties,
} from '@scope/service/github';
import { SecretService } from '@scope/secret';
import { LoggerService } from '@scope/logger';
import { STALE_AFTER_HOURS, UpdatesRepository } from './updates.repository.ts';
import { transform } from './updates.transformer.ts';
import {
  loadUpdateSources,
  UPDATE_CONFIG_ENV,
  type UpdateSource,
} from './updates.config.ts';
import type {
  UpdateChannel,
  UpdateProduct,
  UpdateRecord,
  UpdateRelease,
  UpdateSourceKey,
} from './updates.types.ts';

export type UpdateChannelStatus =
  | 'updated'
  | 'unchanged'
  | 'skipped'
  | 'failed';

export interface UpdateChannelResult {
  product: UpdateProduct;
  channel: UpdateChannel;
  status: UpdateChannelStatus;
  code?: number;
}

export interface UpdateRefreshResult {
  refreshedAt: number;
  skipped: boolean;
  results: UpdateChannelResult[];
}

const REFRESH_INTERVAL_HOURS_ENV = 'UPDATES_REFRESH_INTERVAL_HOURS';
export const DEFAULT_REFRESH_INTERVAL_HOURS = 6;
const MIN_REFRESH_INTERVAL_HOURS = 1;
/**
 * Refresh must run at least as often as cached records become stale,
 * otherwise the cache would always be stale at serve time.
 */
const MAX_REFRESH_INTERVAL_HOURS = STALE_AFTER_HOURS;

/**
 * Maximum number of sources refreshed concurrently on the scheduled
 * path. On-demand refreshes share per-source in-flight work via the
 * single-flight map, so overlapping refresh() calls do not multiply
 * upstream calls (spec 11.5).
 */
const REFRESH_CONCURRENCY_LIMIT = 3;

/**
 * Minimum time between on-demand (request-path) refresh attempts per
 * (product, channel) source. Bounds request-driven GitHub traffic when
 * the cache is stale/missing and refreshes keep failing; the scheduled
 * refresh is unaffected.
 */
export const ON_DEMAND_REFRESH_COOLDOWN_MS = 5 * 60 * 1000;

/**
 * Strictly parse the refresh interval env value: a whole number of
 * hours within [1, STALE_AFTER_HOURS]. Missing, non-numeric,
 * fractional, or out-of-bounds values fall back to the default.
 */
export const parseRefreshIntervalHours = (
  raw: string | undefined,
): number => {
  if (raw === undefined) return DEFAULT_REFRESH_INTERVAL_HOURS;
  const hours = Number(raw);
  if (!Number.isInteger(hours)) return DEFAULT_REFRESH_INTERVAL_HOURS;
  if (
    hours < MIN_REFRESH_INTERVAL_HOURS ||
    hours > MAX_REFRESH_INTERVAL_HOURS
  ) {
    return DEFAULT_REFRESH_INTERVAL_HOURS;
  }
  return hours;
};

/**
 * Periodically refreshes the cached release records from the
 * configured GitHub Releases sources. Follows the repository's proven
 * lifecycle pattern: manual setInterval started on bootstrap and
 * cleared on close, because ScheduleModule + @Interval crashes during
 * Swagger generation (see PushRetryService). No timer is created when
 * no source is configured. A missing or malformed update sources
 * config throws from the constructor so misconfiguration fails loudly.
 */
@Injectable({ scope: SCOPE.GLOBAL })
export class UpdatesService implements OnAppBootstrap, OnAppClose {
  private readonly sources: Map<UpdateSourceKey, UpdateSource>;
  private readonly refreshIntervalMs: number;
  private readonly lastOnDemandRefreshAt: Partial<
    Record<UpdateSourceKey, number>
  >;
  private refreshTimer: ReturnType<typeof setInterval> | undefined;
  /**
   * Per-source single-flight map: at most one refresh per
   * (product, channel) is in flight at a time, and concurrent callers
   * await the same promise (spec 11.3).
   */
  private readonly inFlightRefresh: Map<
    UpdateSourceKey,
    Promise<UpdateChannelResult>
  > = new Map();

  constructor(
    private readonly github: GithubService,
    private readonly repository: UpdatesRepository,
    private readonly secret: SecretService,
    private readonly logger: LoggerService,
  ) {
    this.lastOnDemandRefreshAt = {};
    const sources = loadUpdateSources(this.optionalSecret(UPDATE_CONFIG_ENV));
    this.sources = new Map(
      sources.map((source) => [
        `${source.product}:${source.channel}`,
        source,
      ]),
    );
    const rawInterval = this.optionalSecret(REFRESH_INTERVAL_HOURS_ENV);
    const intervalHours = parseRefreshIntervalHours(rawInterval);
    this.refreshIntervalMs = intervalHours * 60 * 60 * 1000;
    if (rawInterval !== undefined && intervalHours !== Number(rawInterval)) {
      this.logger.instance.warn(
        'Invalid update refresh interval; using default',
        { raw: rawInterval, defaultHours: DEFAULT_REFRESH_INTERVAL_HOURS },
      );
    }
  }

  private optionalSecret(key: string): string | undefined {
    try {
      return this.secret.get<string>(key);
    } catch {
      return undefined;
    }
  }

  async onAppBootstrap(): Promise<void> {
    if (this.sources.size === 0) {
      this.logger.instance.info(
        'No update sources configured; update refresh disabled',
      );
      return;
    }

    if (this.secret.isCI()) {
      this.logger.instance.debug(
        'Skipping initial update refresh in CI mode',
      );
    } else {
      try {
        await this.refresh();
      } catch (error) {
        this.logger.instance.warn(
          'Initial update refresh failed',
          { cause: error },
        );
      }
    }

    this.refreshTimer = setInterval(() => {
      this.refresh().catch((error) => {
        this.logger.instance.warn(
          'Scheduled update refresh failed',
          { cause: error },
        );
      });
    }, this.refreshIntervalMs);
  }

  async onAppClose(): Promise<void> {
    if (this.refreshTimer !== undefined) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = undefined;
    }
  }

  /**
   * Resolve the cached release for a (product, channel) source.
   *
   * A fresh record is served directly from Mongo without any upstream
   * call. A stale or missing record triggers at most one guarded,
   * source-scoped refresh attempt, throttled per source by
   * ON_DEMAND_REFRESH_COOLDOWN_MS; a refresh already in flight for the
   * source is always joined so concurrent requests share one upstream
   * call. Refresh errors (network or persistence) are caught and
   * logged, and the cached record is served as a fallback; a source
   * with no record at all resolves to NotFound. No cross-product
   * fallback is applied.
   */
  async getUpdate(
    product: UpdateProduct,
    channel: UpdateChannel,
  ): Promise<UpdateRelease> {
    const key = `${product}:${channel}`;
    const assetFilter = this.sources.get(key)?.assets;
    const cached = await this.repository.findByKey(product, channel);
    if (cached && !this.repository.isStale(cached)) {
      this.logger.instance.debug('Serving fresh cached update', {
        product,
        channel,
      });
      return this.toPublicRelease(cached, assetFilter);
    }
    if (cached) {
      this.logger.instance.info('Cached update is stale; refreshing', {
        product,
        channel,
      });
    } else {
      this.logger.instance.info('No cached update; refreshing', {
        product,
        channel,
      });
    }

    if (this.canAttemptOnDemandRefresh(key)) {
      try {
        await this.refreshSource(product, channel);
      } catch (error) {
        this.logger.instance.warn(
          'On-demand update refresh failed',
          { product, channel, cause: error },
        );
      }
    } else {
      this.logger.instance.debug(
        'Skipping on-demand refresh within cooldown',
        { product, channel },
      );
    }

    const record = await this.repository.findByKey(product, channel);
    if (!record) {
      throw new NotFoundException();
    }
    if (this.repository.isStale(record)) {
      this.logger.instance.warn(
        'Serving stale update after failed refresh',
        { product, channel },
      );
    }
    return this.toPublicRelease(record, assetFilter);
  }

  /**
   * Refresh a single (product, channel) source on demand (request
   * path). Per-source single-flight: a refresh already in flight for
   * the key is returned as-is so both callers await the same upstream
   * operation. The attempt time is recorded for the per-source retry
   * cooldown.
   */
  async refreshSource(
    product: UpdateProduct,
    channel: UpdateChannel,
  ): Promise<UpdateChannelResult> {
    const key = `${product}:${channel}`;
    const inFlight = this.inFlightRefresh.get(key);
    if (inFlight) {
      return inFlight;
    }
    const source = this.sources.get(key);
    if (!source) {
      return { product, channel, status: 'skipped' };
    }
    this.lastOnDemandRefreshAt[key] = Date.now();
    const promise = this.refreshSourceUnchecked(source)
      .finally(() => this.inFlightRefresh.delete(key));
    this.inFlightRefresh.set(key, promise);
    return promise;
  }

  private canAttemptOnDemandRefresh(key: UpdateSourceKey): boolean {
    // A refresh already in flight for this source is always joined,
    // regardless of the per-source cooldown: joining costs no upstream
    // call and serves the freshest result.
    if (this.inFlightRefresh.has(key)) return true;
    const lastAttempt = this.lastOnDemandRefreshAt[key];
    if (lastAttempt === undefined) return true;
    return Date.now() - lastAttempt >= ON_DEMAND_REFRESH_COOLDOWN_MS;
  }

  private async refreshSourceUnchecked(
    source: UpdateSource,
  ): Promise<UpdateChannelResult> {
    const { product, channel } = source;
    const [owner, repo] = this.splitRepository(source.repository);
    const cached = await this.repository.findByKey(product, channel);

    const outcome = await this.github.fetchReleases(owner, repo, {
      selector: source.selector,
      rollingWindowDays: source.rollingWindowDays,
      ifNoneMatch: cached?.etag ?? undefined,
    });
    if (!outcome) {
      return { product, channel, status: 'failed' };
    }
    if (outcome.status === 'not-modified') {
      // 304: cached release is still current; touch freshness.
      await this.repository.touchFreshness(product, channel);
      return { product, channel, status: 'unchanged' };
    }
    const release = outcome.release;
    if (!release) {
      this.logger.instance.warn(
        'No qualifying GitHub release for source',
        { product, channel },
      );
      return { product, channel, status: 'failed' };
    }
    if (cached && cached.tag === release.tagName) {
      // Same release still selected; refresh freshness and ETag.
      await this.repository.touchFreshness(
        product,
        channel,
        Date.now(),
        outcome.etag,
      );
      return { product, channel, status: 'unchanged' };
    }
    const versionInfo = await this.resolveVersionAndCode(
      source,
      owner,
      repo,
      release,
    );
    if (!versionInfo) {
      this.logger.instance.warn(
        'Unable to resolve version and code for release',
        { product, channel, tag: release.tagName },
      );
      return { product, channel, status: 'failed' };
    }
    const record = transform({
      product,
      channel,
      release,
      version: versionInfo.version,
      code: versionInfo.code,
      etag: outcome.etag,
      assetFilter: source.assets,
    });
    await this.repository.upsert(record);
    return { product, channel, status: 'updated', code: record.code };
  }

  /**
   * Resolve version and code for a release from the authoritative
   * tagged gradle/version.properties document. Both `version` and
   * `code` are required; a missing, unparseable, or incomplete
   * document resolves to undefined and the candidate release is
   * rejected, retaining the previously cached record. A source with no
   * propertiesPath has no authoritative code source and also resolves
   * to undefined: a version code is never fabricated from the tag.
   */
  private async resolveVersionAndCode(
    source: UpdateSource,
    owner: string,
    repo: string,
    release: GithubRelease,
  ): Promise<{ version: string; code: number } | undefined> {
    if (!source.propertiesPath) {
      return undefined;
    }
    const text = await this.github.fetchVersionProperties(
      owner,
      repo,
      release.tagName,
      source.propertiesPath,
    );
    if (text === undefined) {
      return undefined;
    }
    const parsed = parseVersionProperties(text);
    if (parsed.version === undefined || parsed.code === undefined) {
      return undefined;
    }
    return { version: parsed.version, code: parsed.code };
  }

  private splitRepository(repository: string): [string, string] {
    const index = repository.indexOf('/');
    return [repository.slice(0, index), repository.slice(index + 1)];
  }

  /**
   * Fetch and persist the latest release for every configured source
   * (scheduled path). Sources are refreshed with bounded concurrency
   * and each goes through the per-source single-flight map, so an
   * overlapping refresh() or on-demand request shares the same
   * in-flight work instead of multiplying upstream calls. Failures
   * are isolated per source: a throwing source is recorded as failed
   * and logged, and the remaining sources still refresh.
   */
  async refresh(): Promise<UpdateRefreshResult> {
    const sources = [...this.sources.values()];
    const results: UpdateChannelResult[] = new Array(sources.length);
    let next = 0;
    const workers = Array.from(
      { length: Math.min(REFRESH_CONCURRENCY_LIMIT, sources.length) },
      async () => {
        while (true) {
          const index = next++;
          if (index >= sources.length) return;
          const source = sources[index];
          try {
            results[index] = await this.refreshSource(
              source.product,
              source.channel,
            );
          } catch (error) {
            this.logger.instance.warn(
              'Source refresh failed',
              {
                product: source.product,
                channel: source.channel,
                cause: error,
              },
            );
            results[index] = {
              product: source.product,
              channel: source.channel,
              status: 'failed',
            };
          }
        }
      },
    );
    await Promise.all(workers);
    const failedCount =
      results.filter((result) => result.status === 'failed').length;
    if (failedCount > 0) {
      this.logger.instance.warn('Update refresh completed with failures', {
        failed: failedCount,
        total: results.length,
        results,
      });
    } else {
      this.logger.instance.info('Update refresh completed', {
        total: results.length,
        results,
      });
    }
    return { refreshedAt: Date.now(), skipped: false, results };
  }

  /**
   * Public response mapping: strips the internal ETag cache metadata
   * so the public release shape stays clean, and applies the
   * configured asset-name filter when present (covering records cached
   * before a filter was configured).
   */
  private toPublicRelease(
    record: UpdateRecord,
    assetFilter?: string[],
  ): UpdateRelease {
    const { etag: _etag, ...rest } = record;
    if (assetFilter && assetFilter.length > 0) {
      return {
        ...rest,
        assets: rest.assets.filter((asset) => assetFilter.includes(asset.name)),
      };
    }
    return rest;
  }
}
