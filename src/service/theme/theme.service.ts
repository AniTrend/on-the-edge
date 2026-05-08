import { Inject, Injectable, SCOPE } from '@danet/core';
import { createClient, type RequestClient } from '@anitrend/request-client';
import {
  CACHE_DEFAULT_TTL_SECONDS,
  type CacheService,
  TOKEN_CACHE_SERVICE,
} from '@scope/cache';
import { ExperimentService } from '@scope/experiment';
import { LoggerService } from '@scope/logger';
import { SecretService } from '@scope/secret';
import { AnimeThemesService } from '../animethemes/animethemes.service.ts';
import { DEFAULT_HEADERS } from '../constants.ts';
import {
  requestInterceptor,
  responseInterceptor,
} from '../interceptor/client.interceptor.ts';
import { ThemeCollectionSchema } from './theme.schema.ts';
import { transformThemes } from './transformer/index.ts';
import type { AnimeTheme, ThemeModel } from './theme.types.ts';

@Injectable({ scope: SCOPE.GLOBAL })
export class ThemeService {
  private client: RequestClient | null = null;

  constructor(
    @Inject(TOKEN_CACHE_SERVICE) private readonly cache: CacheService,
    private readonly secret: SecretService,
    private readonly logger: LoggerService,
    private readonly experiment: ExperimentService,
    private readonly animeThemes: AnimeThemesService,
  ) {}

  async getThemesForAnime(mal: number): Promise<AnimeTheme[] | undefined> {
    const cacheKey = this.experiment.isEnabled('enable-animethemes-api')
      ? `edge:theme:animethemes:${mal}` as const
      : `edge:theme:legacy:${mal}` as const;

    const cached = await this.cache.get<AnimeTheme[]>(cacheKey);
    if (cached) {
      return cached;
    }

    if (this.experiment.isEnabled('enable-animethemes-api')) {
      this.logger.instance.debug('Using AnimeThemes provider for themes', {
        mal,
      });
      const themes = await this.animeThemes.getThemesForAnime(mal);
      if (themes) {
        await this.cache.set(cacheKey, themes, {
          ttl: CACHE_DEFAULT_TTL_SECONDS,
        });
      }
      return themes;
    }

    try {
      const models = await this.fetchThemesByMalId(mal);
      if (!models) {
        return undefined;
      }

      const themes = transformThemes(models, this.secret.get<string>('THEMES'));
      await this.cache.set(cacheKey, themes, {
        ttl: CACHE_DEFAULT_TTL_SECONDS,
      });
      return themes;
    } catch (error) {
      this.logger.instance.warn('Unable to get themes from remote', error);
      return undefined;
    }
  }

  private async fetchThemesByMalId(
    malId: number,
  ): Promise<ThemeModel[] | undefined> {
    try {
      const { data } = await this.getClient().get(`/api/themes/${malId}`);
      return ThemeCollectionSchema.parse(data);
    } catch (error) {
      this.logger.instance.warn('Unable to parse theme response', error);
      return undefined;
    }
  }

  private getClient(): RequestClient {
    if (this.client) {
      return this.client;
    }

    const client = createClient({
      baseURL: this.secret.get('THEMES'),
      headers: DEFAULT_HEADERS,
      timeout: this.secret.requestTimeout(),
    });
    client.interceptors.request.use(requestInterceptor(this.logger));
    client.interceptors.response.use(responseInterceptor(this.logger));
    this.client = client;

    return client;
  }
}
