import { Injectable, NotFoundException, SCOPE } from '@danet/core';
import { OnAppBootstrap, OnAppClose } from '@danet/core/hook';
import { GithubService, isHttpsUrl } from '@scope/service/github';
import { SecretService } from '@scope/secret';
import { LoggerService } from '@scope/logger';
import { STALE_AFTER_HOURS, UpdatesRepository } from './updates.repository.ts';
import { transform } from './updates.transformer.ts';
import type {
  UpdateChannel,
  UpdateRecord,
  UpdateRelease,
} from './updates.types.ts';

export type UpdateChannelStatus = 'updated' | 'skipped' | 'failed';

export interface UpdateChannelResult {
  channel: UpdateChannel;
  status: UpdateChannelStatus;
  code?: number;
}

export interface UpdateRefreshResult {
  refreshedAt: number;
  skipped: boolean;
  results: UpdateChannelResult[];
}

const UPDATE_CHANNELS: UpdateChannel[] = ['STABLE', 'BETA', 'EXPERIMENTAL'];

const SOURCE_ENV_KEYS: Record<UpdateChannel, string> = {
  STABLE: 'UPDATES_SOURCE_STABLE',
  BETA: 'UPDATES_SOURCE_BETA',
  EXPERIMENTAL: 'UPDATES_SOURCE_EXPERIMENTAL',
};

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
 * channel. Bounds request-driven GitHub traffic when the cache is
 * stale/missing and refreshes keep failing; the scheduled refresh is
 * unaffected.
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
 * Periodically refreshes the cached update records from the configured
 * GitHub sources. Follows the repository's proven lifecycle pattern:
 * manual setInterval started on bootstrap and cleared on close, because
 * ScheduleModule + @Interval crashes during Swagger generation (see
 * PushRetryService). No timer is created when no source channel is
 * configured.
 */
@Injectable({ scope: SCOPE.GLOBAL })
export class UpdatesService implements OnAppBootstrap, OnAppClose {
  private readonly sourceUrls: Partial<Record<UpdateChannel, string>>;
  private readonly refreshIntervalMs: number;
  private readonly lastOnDemandRefreshAt: Partial<
    Record<UpdateChannel, number>
  >;
  private refreshTimer: ReturnType<typeof setInterval> | undefined;
  private refreshing = false;

  constructor(
    private readonly github: GithubService,
    private readonly repository: UpdatesRepository,
    private readonly secret: SecretService,
    private readonly logger: LoggerService,
  ) {
    this.sourceUrls = {};
    this.lastOnDemandRefreshAt = {};
    for (const channel of UPDATE_CHANNELS) {
      const sourceUrl = this.optionalSecret(SOURCE_ENV_KEYS[channel]);
      if (!sourceUrl || sourceUrl.trim().length === 0) continue;
      if (!isHttpsUrl(sourceUrl)) {
        this.logger.instance.warn(
          'Ignoring non-HTTPS update source URL',
          { channel, sourceUrl },
        );
        continue;
      }
      this.sourceUrls[channel] = sourceUrl;
    }
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
    const configuredChannels = Object.keys(this.sourceUrls) as UpdateChannel[];
    if (configuredChannels.length === 0) {
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
   * Resolve the cached update release for a channel.
   *
   * A fresh record is served directly from Mongo without any upstream
   * call. A stale or missing record triggers at most one guarded,
   * channel-scoped refresh attempt, throttled per channel by
   * ON_DEMAND_REFRESH_COOLDOWN_MS; concurrent requests skip via the
   * non-overlapping guard, bounding GitHub calls per request. Refresh
   * errors (network or persistence) are caught and logged, and the
   * cached record is served as a fallback; a channel with no record at
   * all resolves to NotFound.
   */
  async getUpdate(channel: UpdateChannel): Promise<UpdateRelease> {
    const cached = await this.repository.findByChannel(channel);
    if (cached && !this.repository.isStale(cached)) {
      this.logger.instance.debug('Serving fresh cached update', { channel });
      return this.toPublicRelease(cached);
    }
    if (cached) {
      this.logger.instance.info('Cached update is stale; refreshing', {
        channel,
      });
    } else {
      this.logger.instance.info('No cached update; refreshing', { channel });
    }

    if (this.canAttemptOnDemandRefresh(channel)) {
      try {
        await this.refreshChannel(channel);
      } catch (error) {
        this.logger.instance.warn(
          'On-demand update refresh failed',
          { channel, cause: error },
        );
      }
    } else {
      this.logger.instance.debug(
        'Skipping on-demand refresh within cooldown',
        { channel },
      );
    }

    const record = await this.repository.findByChannel(channel);
    if (!record) {
      throw new NotFoundException();
    }
    if (this.repository.isStale(record)) {
      this.logger.instance.warn(
        'Serving stale update after failed refresh',
        { channel },
      );
    }
    return this.toPublicRelease(record);
  }

  /**
   * Refresh a single channel on demand (request path). Honors the
   * non-overlapping guard and records the attempt time for the
   * per-channel retry cooldown.
   */
  async refreshChannel(channel: UpdateChannel): Promise<UpdateChannelResult> {
    if (this.refreshing) {
      return { channel, status: 'skipped' };
    }
    if (!this.sourceUrls[channel]) {
      return { channel, status: 'skipped' };
    }
    this.lastOnDemandRefreshAt[channel] = Date.now();
    this.refreshing = true;
    try {
      return await this.refreshChannelUnchecked(channel);
    } finally {
      this.refreshing = false;
    }
  }

  private canAttemptOnDemandRefresh(channel: UpdateChannel): boolean {
    const lastAttempt = this.lastOnDemandRefreshAt[channel];
    if (lastAttempt === undefined) return true;
    return Date.now() - lastAttempt >= ON_DEMAND_REFRESH_COOLDOWN_MS;
  }

  private async refreshChannelUnchecked(
    channel: UpdateChannel,
  ): Promise<UpdateChannelResult> {
    const sourceUrl = this.sourceUrls[channel];
    if (!sourceUrl) {
      return { channel, status: 'skipped' };
    }
    const payload = await this.github.fetchVersionJson(sourceUrl);
    if (!payload) {
      return { channel, status: 'failed' };
    }
    const record = transform(payload, channel);
    await this.repository.upsert(record);
    return {
      channel,
      status: 'updated',
      code: record.code,
    };
  }

  /**
   * Fetch and persist the latest version.json payload for every
   * configured channel (scheduled path). Non-overlapping: concurrent
   * calls return a skipped result while a refresh is in flight.
   * Failures are isolated per channel: a throwing channel is recorded
   * as failed and logged, and the remaining channels still refresh.
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
      for (const channel of UPDATE_CHANNELS) {
        try {
          results.push(await this.refreshChannelUnchecked(channel));
        } catch (error) {
          this.logger.instance.warn(
            'Channel refresh failed',
            { channel, cause: error },
          );
          results.push({ channel, status: 'failed' });
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
   * Public response mapping: the OpenAPI contract cannot express a
   * nullable boolean|string union, so migration is omitted entirely
   * when null or absent. Legacy records may still carry null from
   * before the schema was tightened; the repository purges them on
   * read, and this mapping guarantees the boundary regardless.
   */
  private toPublicRelease(record: UpdateRecord): UpdateRelease {
    if (record.migration === undefined || record.migration === null) {
      const { migration: _migration, ...rest } = record;
      return rest;
    }
    return record;
  }
}
