import { Inject, Injectable, SCOPE } from '@danet/core';
import { SecretService } from '@scope/secret';
import { LoggerService } from '@scope/logger';
import { createClient, type RequestClient } from '@anitrend/request-client';
import { DEFAULT_HEADERS } from '../constants.ts';
import { SeasonsSchema, ShowModelSchema } from './trakt.schema.ts';
import type { TraktSeason, TraktShow } from './trakt.types.ts';
import {
  requestInterceptor,
  responseInterceptor,
} from '../interceptor/client.interceptor.ts';
import { type CacheService, TOKEN_CACHE_SERVICE } from '@scope/cache';

@Injectable({ scope: SCOPE.GLOBAL })
export class TraktService {
  private readonly client: RequestClient;

  constructor(
    private readonly secret: SecretService,
    private readonly logger: LoggerService,
    @Inject(TOKEN_CACHE_SERVICE) private readonly cache: CacheService,
  ) {
    this.client = createClient({
      baseURL: this.secret.get('TRAKT'),
      headers: {
        ...DEFAULT_HEADERS,
        'trakt-api-version': '2',
        'trakt-api-key': this.secret.get<string>('TRAKT_ID'),
      },
      timeout: this.secret.requestTimeout(),
    });
    this.client.interceptors.request.use(requestInterceptor(this.logger));
    this.client.interceptors.response.use(responseInterceptor(this.logger));
  }

  async getShow(trakt: number | string): Promise<TraktShow | undefined> {
    const cacheKey = `edge:trakt:show:${trakt}` as const;
    try {
      const cached = await this.cache.get<TraktShow>(cacheKey);
      if (cached) return cached;

      const { data } = await this.client.get(`/shows/${trakt}`, {
        params: { extended: 'full' },
      });
      const parsed = ShowModelSchema.parse(data);
      await this.cache.set(cacheKey, parsed);
      return parsed;
    } catch (error) {
      this.logger.instance.warn(
        'Unable to transform show from remote',
        error,
      );
      return undefined;
    }
  }

  async getSeasons(
    show: number | string,
    opts: { extended?: 'episodes' | 'full' } = {},
  ): Promise<TraktSeason[] | undefined> {
    const extended = opts.extended ?? 'episodes';
    const cacheKey = `edge:trakt:seasons:${show}:${extended}` as const;
    try {
      const cached = await this.cache.get<TraktSeason[]>(cacheKey);
      if (cached) return cached;

      const { data } = await this.client.get(`/shows/${show}/seasons`, {
        params: { extended },
      });
      const parsed = SeasonsSchema.parse(data);
      await this.cache.set(cacheKey, parsed);
      return parsed;
    } catch (error) {
      this.logger.instance.warn(
        'Unable to get trakt seasons from remote',
        error,
      );
      return undefined;
    }
  }
}
