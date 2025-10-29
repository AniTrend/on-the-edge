import { Injectable, SCOPE } from '@danet/core';
import { SecretService } from '@scope/secret';
import { LoggerService } from '@scope/logger';
import { createClient, type RequestClient } from '@anitrend/request-client';
import { DEFAULT_HEADERS } from '../constants.ts';
import { ThemeCollectionSchema } from './theme.schema.ts';
import { transformThemes } from './transformer/index.ts';
import type { AnimeTheme, ThemeModel } from './theme.types.ts';
import {
  requestInterceptor,
  responseInterceptor,
} from '../interceptor/client.interceptor.ts';

@Injectable({ scope: SCOPE.GLOBAL })
export class ThemeService {
  private readonly client: RequestClient;

  constructor(
    private readonly secret: SecretService,
    private readonly logger: LoggerService,
  ) {
    this.client = createClient({
      baseURL: this.secret.get('THEMES'),
      headers: DEFAULT_HEADERS,
      timeout: this.secret.requestTimeout(),
    });
    this.client.interceptors.request.use(requestInterceptor(this.logger));
    this.client.interceptors.response.use(responseInterceptor(this.logger));
  }

  async getThemesForAnime(mal: number): Promise<AnimeTheme[] | undefined> {
    try {
      const models = await this.fetchThemesByMalId(mal);
      return transformThemes(models, this.secret.get('THEMES'));
    } catch (error) {
      this.logger.instance.warn('Unable to get themes from remote', error);
      return undefined;
    }
  }

  private async fetchThemesByMalId(malId: number): Promise<ThemeModel[]> {
    try {
      const { data } = await this.client.get(`/api/themes/${malId}`);
      return ThemeCollectionSchema.parse(data);
    } catch (error) {
      this.logger.instance.warn('Unable to parse theme response', error);
      return [];
    }
  }
}
