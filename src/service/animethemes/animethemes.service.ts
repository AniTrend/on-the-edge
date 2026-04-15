import { Injectable, SCOPE } from '@danet/core';
import { createClient, type RequestClient } from '@anitrend/request-client';
import { LoggerService } from '@scope/logger';
import { SecretService } from '@scope/secret';
import { DEFAULT_HEADERS } from '../constants.ts';
import {
  requestInterceptor,
  responseInterceptor,
} from '../interceptor/client.interceptor.ts';
import { AnimeThemesLookupSchema } from './animethemes.schema.ts';
import { transformAnimeThemes } from './transformer/index.ts';
import type { Theme } from '../theme/transformer/types.ts';

const ANIME_THEMES_INCLUDE =
  'animethemes.animethemeentries.videos.audio,animethemes.song';

@Injectable({ scope: SCOPE.GLOBAL })
export class AnimeThemesService {
  private client: RequestClient | null = null;

  constructor(
    private readonly secret: SecretService,
    private readonly logger: LoggerService,
  ) {}

  async getThemesForAnime(malId: number): Promise<Theme[] | undefined> {
    try {
      const { data } = await this.getClient().get('/anime', {
        params: {
          'filter[has]': 'resources',
          'filter[site]': 'MyAnimeList',
          'filter[external_id]': malId,
          'page[size]': 1,
          include: ANIME_THEMES_INCLUDE,
        },
      });

      const anime = AnimeThemesLookupSchema.parse(data).anime.at(0) ?? null;
      return anime ? transformAnimeThemes(anime) : [];
    } catch (error) {
      this.logger.instance.warn('Unable to get themes from AnimeThemes', error);
      return undefined;
    }
  }

  private getClient(): RequestClient {
    if (this.client) {
      return this.client;
    }

    const client = createClient({
      baseURL: this.secret.get('ANIME_THEMES'),
      headers: DEFAULT_HEADERS,
      timeout: this.secret.requestTimeout(),
    });
    client.interceptors.request.use(requestInterceptor(this.logger));
    client.interceptors.response.use(responseInterceptor(this.logger));
    this.client = client;

    return client;
  }
}
