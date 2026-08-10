import { Injectable } from '@danet/core';
import { compare, tryParse } from '@std/semver';
import {
  createClient,
  type RequestClient,
  RequestError,
} from '@anitrend/request-client';
import { SecretService } from '@scope/secret';
import { LoggerService } from '@scope/logger';
import { DEFAULT_HEADERS } from '../constants.ts';
import { GithubReleasePayloadSchema } from './github.schema.ts';
import type {
  GithubRateLimit,
  GithubRelease,
  GithubReleaseOutcome,
  GithubReleasePayload,
  GithubReleaseSelector,
} from './github.types.ts';
import {
  requestInterceptor,
  responseInterceptor,
} from '../interceptor/client.interceptor.ts';

const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com';
const GITHUB_API_ACCEPT = 'application/vnd.github+json';
const GITHUB_API_VERSION = '2022-11-28';
const GITHUB_TOKEN_SECRET = 'GITHUB_TOKEN';

/**
 * Parse the GitHub REST API rate-limit response headers into a numeric
 * snapshot. Returns undefined when any header is absent or non-numeric;
 * rate limiting is best-effort telemetry for the edge, never a failure.
 */
export const parseRateLimit = (
  headers: Headers,
): GithubRateLimit | undefined => {
  const limit = headers.get('x-ratelimit-limit');
  const remaining = headers.get('x-ratelimit-remaining');
  const reset = headers.get('x-ratelimit-reset');
  if (limit === null || remaining === null || reset === null) {
    return undefined;
  }
  const parsed = {
    limit: Number(limit),
    remaining: Number(remaining),
    reset: Number(reset),
  };
  if (
    !Number.isFinite(parsed.limit) ||
    !Number.isFinite(parsed.remaining) ||
    !Number.isFinite(parsed.reset)
  ) {
    return undefined;
  }
  return parsed;
};

/** Accept only https URLs; anything else is rejected before use. */
export const isHttpsUrl = (value: string): boolean => {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
};

/**
 * Parse a gradle version.properties document for version/code/name.
 * Tolerates comments, blank lines, whitespace, and case variations.
 * Non-numeric or non-positive codes are ignored.
 */
export const parseVersionProperties = (
  text: string,
): { version?: string; code?: number; name?: string } => {
  let version: string | undefined;
  let code: number | undefined;
  let name: string | undefined;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith('#') || line.startsWith('!')) {
      continue;
    }
    const separator = line.indexOf('=');
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim().toUpperCase();
    const value = line.slice(separator + 1).trim();
    if (value.length === 0) continue;
    if (key === 'VERSION_NAME' || key === 'VERSION') version = value;
    if (key === 'NAME' || key === 'APP_NAME') name = value;
    if (key === 'VERSION_CODE' || key === 'CODE') {
      const parsed = Number(value);
      if (Number.isInteger(parsed) && parsed > 0) code = parsed;
    }
  }
  return { version, code, name };
};

/**
 * Reusable GitHub update source client. Fetches release metadata from
 * the GitHub REST API and tagged gradle/version.properties from raw
 * GitHub content. All URLs are https by construction and re-validated;
 * network errors and malformed payloads are non-fatal (undefined).
 */
@Injectable()
export class GithubService {
  constructor(
    private readonly secret: SecretService,
    private readonly logger: LoggerService,
  ) { }

  private createClient(baseUrl: string): RequestClient {
    const client = createClient({
      baseURL: baseUrl,
      headers: DEFAULT_HEADERS,
      timeout: this.secret.requestTimeout(),
    });
    client.interceptors.request.use(requestInterceptor(this.logger));
    client.interceptors.response.use(responseInterceptor(this.logger));
    return client;
  }

  /** Read an optional secret; undefined when it is not configured. */
  private optionalSecret(key: string): string | undefined {
    try {
      return this.secret.get<string>(key);
    } catch {
      return undefined;
    }
  }

  /**
   * Headers for api.github.com requests: the pinned REST API version
   * and GitHub JSON media type, plus an optional bearer token. These
   * are passed per-request so raw.githubusercontent.com fetches stay
   * on DEFAULT_HEADERS and never carry the token.
   */
  private apiHeaders(ifNoneMatch?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': GITHUB_API_ACCEPT,
      'X-GitHub-Api-Version': GITHUB_API_VERSION,
    };
    const token = this.optionalSecret(GITHUB_TOKEN_SECRET);
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (ifNoneMatch) {
      headers['If-None-Match'] = ifNoneMatch;
    }
    return headers;
  }

  /** Snapshot rate-limit headers into the outcome and debug-log them. */
  private captureRateLimit(headers: Headers): GithubRateLimit | undefined {
    const rateLimit = parseRateLimit(headers);
    if (rateLimit) {
      this.logger.instance.debug('GitHub rate limit', rateLimit);
    }
    return rateLimit;
  }

  /**
   * Fetch and select a release from the /releases list. Every channel
   * goes through this list path so semantic-version ordering applies
   * everywhere. Drafts never qualify. Stable keeps non-prereleases;
   * prerelease keeps only prereleases whose tag parses as semver and
   * matches the configured identifiers (when set). Sorts by semver
   * precedence descending, tie-broken by published_at then tag name,
   * and optionally applies a rolling window in days. Honors
   * If-None-Match.
   */
  async fetchReleases(
    owner: string,
    repo: string,
    options: {
      selector: GithubReleaseSelector;
      rollingWindowDays?: number;
      ifNoneMatch?: string;
    },
  ): Promise<GithubReleaseOutcome | undefined> {
    const path = `/repos/${owner}/${repo}/releases`;
    try {
      const { data, status, headers } = await this.createClient(GITHUB_API_BASE)
        .get<string>(path, {
          params: { per_page: 100 },
          headers: this.apiHeaders(options.ifNoneMatch),
          responseType: 'text',
          validateStatus: (s) => s === 304 || (s >= 200 && s < 300),
        });
      if (status === 304) {
        return { status: 'not-modified' };
      }
      const parsed = GithubReleasePayloadSchema.array().safeParse(
        JSON.parse(data),
      );
      if (!parsed.success) {
        this.logger.instance.warn(
          'Malformed GitHub releases payload',
          { owner, repo, cause: parsed.error },
        );
        return undefined;
      }
      return {
        status: 'ok',
        release: this.selectRelease(
          parsed.data.map((payload) => this.toDomainRelease(payload)),
          options.selector,
          options.rollingWindowDays,
        ),
        etag: headers.get('etag') ?? undefined,
        rateLimit: this.captureRateLimit(headers),
      };
    } catch (error) {
      // Non-fatal by design: callers keep the stale cached release on
      // any GitHub failure (network, timeout, malformed payload).
      this.logger.instance.warn(
        'Unable to fetch GitHub releases',
        { owner, repo, cause: error },
      );
      return undefined;
    }
  }

  /**
   * Fetch the tagged gradle/version.properties document as text.
   * A 404 (no properties at the tag) and network errors resolve to
   * undefined; callers reject the candidate release on any failure so
   * the previously cached record is retained.
   */
  async fetchVersionProperties(
    owner: string,
    repo: string,
    tag: string,
    path: string,
  ): Promise<string | undefined> {
    const encodedTag = encodeURIComponent(tag);
    const requestPath = `/${encodeURIComponent(owner)}/${encodeURIComponent(repo)
      }/${encodedTag}/${path}`;
    try {
      const { data } = await this.createClient(GITHUB_RAW_BASE).get(
        requestPath,
        { responseType: 'text' },
      );
      return typeof data === 'string' ? data : undefined;
    } catch (error) {
      if (error instanceof RequestError && error.response?.status === 404) {
        this.logger.instance.debug(
          'Version properties not found for tag',
          { owner, repo, tag, path },
        );
        return undefined;
      }
      this.logger.instance.warn(
        'Unable to fetch version properties',
        { owner, repo, tag, path, cause: error },
      );
      return undefined;
    }
  }

  private toDomainRelease(payload: GithubReleasePayload): GithubRelease {
    return {
      tagName: payload.tag_name,
      name: payload.name,
      body: payload.body,
      publishedAt: payload.published_at,
      prerelease: payload.prerelease,
      draft: payload.draft,
      htmlUrl: payload.html_url,
      assets: payload.assets.map((asset) => ({
        name: asset.name,
        url: asset.browser_download_url,
        size: asset.size,
        contentType: asset.content_type,
        digest: asset.digest,
      })),
    };
  }

  private selectRelease(
    releases: GithubRelease[],
    selector: GithubReleaseSelector,
    rollingWindowDays?: number,
  ): GithubRelease | undefined {
    const cutoff = rollingWindowDays !== undefined
      ? Date.now() - rollingWindowDays * 24 * 60 * 60 * 1000
      : undefined;
    const candidates = releases.filter((release) => !release.draft);
    const eligible = selector.type === 'stable'
      ? candidates.filter((release) => !release.prerelease)
      : this.prereleaseCandidates(candidates, selector.identifiers);
    return eligible
      .filter((release) =>
        cutoff === undefined || release.publishedAt >= cutoff
      )
      .sort((a, b) => this.compareReleases(a, b))[0];
  }

  /**
   * Filter prerelease candidates to those whose tag parses as semver
   * and (when identifiers are configured) matches at least one
   * configured identifier. A tag that is not valid semver is skipped
   * with a debug log and never fails the whole refresh.
   */
  private prereleaseCandidates(
    releases: GithubRelease[],
    identifiers?: string[],
  ): GithubRelease[] {
    const normalized = identifiers?.map((id) => id.toLowerCase());
    return releases.filter((release) => {
      if (!release.prerelease) return false;
      const semver = tryParse(release.tagName);
      if (!semver) {
        this.logger.instance.debug(
          'Skipping release with non-semver tag',
          { tag: release.tagName, reason: 'tag is not valid semver' },
        );
        return false;
      }
      if (normalized === undefined || normalized.length === 0) {
        return true;
      }
      return (semver.prerelease ?? []).some((item) =>
        normalized.includes(String(item).toLowerCase())
      );
    });
  }

  /**
   * Order releases by semver precedence descending, tie-broken by
   * published_at descending then tag name descending. Non-semver tags
   * fall back to the publication-date ordering.
   */
  private compareReleases(a: GithubRelease, b: GithubRelease): number {
    const aSemver = tryParse(a.tagName);
    const bSemver = tryParse(b.tagName);
    if (aSemver && bSemver) {
      const byVersion = compare(bSemver, aSemver);
      if (byVersion !== 0) return byVersion;
    }
    return b.publishedAt - a.publishedAt ||
      (a.tagName < b.tagName ? 1 : a.tagName > b.tagName ? -1 : 0);
  }
}
