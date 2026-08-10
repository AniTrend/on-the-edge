import { Injectable, NotFoundException, SCOPE } from '@danet/core';
import { OnAppBootstrap, OnAppClose } from '@danet/core/hook';
import {
  type GithubRelease,
  GithubService,
  parseSemverTag,
  parseVersionProperties,
} from '@scope/service/github';
import { SecretService } from '@scope/secret';
import { LoggerService } from '@scope/logger';
import { STALE_AFTER_HOURS, UpdatesRepository } from './updates.repository.ts';
import { transform } from './updates.transformer.ts';
import {
  parseUpdateSources,
  UPDATE_SOURCES_ENV,
  type UpdateSource,
} from './updates.sources.ts';
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
 * no source is configured. A malformed UPDATE_SOURCES value throws
 * from the constructor so misconfiguration fails loudly.
 */
@Injectable({ scope: SCOPE.GLOBAL })
export class UpdatesService implements OnAppBootstrap, OnAppClose {
  private readonly sources: Map<UpdateSourceKey, UpdateSource>;
  private readonly refreshIntervalMs: number;
  private readonly lastOnDemandRefreshAt: Partial<
    Record<UpdateSourceKey, number>
  >;
  private refreshTimer: ReturnType<typeof setInterval> | undefined;
  private refreshing = false;

  constructor(
    private readonly github: GithubService,
    private readonly repository: UpdatesRepository,
    private readonly secret: SecretService,
    private readonly logger: LoggerService,
  ) {
    this.lastOnDemandRefreshAt = {};
    const sources = parseUpdateSources(this.optionalSecret(UPDATE_SOURCES_ENV));
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
   * ON_DEMAND_REFRESH_COOLDOWN_MS; concurrent requests skip via the
   * non-overlapping guard, bounding GitHub calls per request. Refresh
   * errors (network or persistence) are caught and logged, and the
   * cached record is served as a fallback; a source with no record at
   * all resolves to NotFound. No cross-product fallback is applied.
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
   * path). Honors the non-overlapping guard and records the attempt
   * time for the per-source retry cooldown.
   */
  async refreshSource(
    product: UpdateProduct,
    channel: UpdateChannel,
  ): Promise<UpdateChannelResult> {
    const key = `${product}:${channel}`;
    if (this.refreshing) {
      return { product, channel, status: 'skipped' };
    }
    const source = this.sources.get(key);
    if (!source) {
      return { product, channel, status: 'skipped' };
    }
    this.lastOnDemandRefreshAt[key] = Date.now();
    this.refreshing = true;
    try {
      return await this.refreshSourceUnchecked(source);
    } finally {
      this.refreshing = false;
    }
  }

  private canAttemptOnDemandRefresh(key: UpdateSourceKey): boolean {
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

    const outcome = source.selector === 'stable'
      ? await this.github.fetchLatestRelease(
        owner,
        repo,
        cached?.etag ?? undefined,
      )
      : await this.github.fetchReleases(owner, repo, {
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
   * Resolve version and code for a release: prefer tagged
   * gradle/version.properties when both values are present, otherwise
   * fall back to the strict semver tag. Returns undefined when neither
   * yields a valid pair.
   */
  private async resolveVersionAndCode(
    source: UpdateSource,
    owner: string,
    repo: string,
    release: GithubRelease,
  ): Promise<{ version: string; code: number } | undefined> {
    if (source.propertiesPath) {
      const text = await this.github.fetchVersionProperties(
        owner,
        repo,
        release.tagName,
        source.propertiesPath,
      );
      if (text !== undefined) {
        const parsed = parseVersionProperties(text);
        if (parsed.version !== undefined && parsed.code !== undefined) {
          return { version: parsed.version, code: parsed.code };
        }
      }
    }
    return parseSemverTag(release.tagName);
  }

  private splitRepository(repository: string): [string, string] {
    const index = repository.indexOf('/');
    return [repository.slice(0, index), repository.slice(index + 1)];
  }

  /**
   * Fetch and persist the latest release for every configured source
   * (scheduled path). Non-overlapping: concurrent calls return a
   * skipped result while a refresh is in flight. Failures are isolated
   * per source: a throwing source is recorded as failed and logged, and
   * the remaining sources still refresh.
   */
  async refresh(): Promise<UpdateRefreshResult> {
    if (this.refreshing) {
      this.logger.instance.debug(
        'Update refresh already in progress; skipping',
      );
      return { refreshedAt: Date.now(), skipped: true, results: [] };
    }
    this.refreshing = true;
    try {
      const results: UpdateChannelResult[] = [];
      for (const source of this.sources.values()) {
        try {
          results.push(await this.refreshSourceUnchecked(source));
        } catch (error) {
          this.logger.instance.warn(
            'Source refresh failed',
            { product: source.product, channel: source.channel, cause: error },
          );
          results.push({
            product: source.product,
            channel: source.channel,
            status: 'failed',
          });
        }
      }
      const failedCount = results.filter((result) =>
        result.status === 'failed'
      ).length;
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
    } finally {
      this.refreshing = false;
    }
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
