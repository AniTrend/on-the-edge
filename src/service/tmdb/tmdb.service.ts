import { Inject, Injectable, SCOPE } from '@danet/core';
import { SecretService } from '@scope/secret';
import { LoggerService } from '@scope/logger';
import { createClient, type RequestClient } from '@anitrend/request-client';
import { DEFAULT_HEADERS } from '../constants.ts';
import {
  ConfigurationSchema,
  MovieSchema,
  SeasonSchema,
  ShowSchema,
} from './tmdb.schema.ts';
import {
  movieTransformer,
  seasonTransformer,
  showTransformer,
} from './tmdb.configuration.ts';
import type {
  TmdbConfiguration,
  TmdbMovie,
  TmdbSeason,
  TmdbShow,
} from './tmdb.types.ts';
import { ImageProvider } from './utils/index.ts';
import { OnAppBootstrap } from '@danet/core/hook';
import {
  requestInterceptor,
  responseInterceptor,
} from '../interceptor/client.interceptor.ts';
import { type CacheService, TOKEN_CACHE_SERVICE } from '@scope/cache';

@Injectable({ scope: SCOPE.GLOBAL })
export class TmdbService implements OnAppBootstrap {
  private readonly client: RequestClient;
  private imageProvider?: ImageProvider;

  constructor(
    private readonly secret: SecretService,
    private readonly logger: LoggerService,
    @Inject(TOKEN_CACHE_SERVICE) private readonly cache: CacheService,
  ) {
    this.client = createClient({
      baseURL: this.secret.get('TMDB'),
      headers: DEFAULT_HEADERS,
      timeout: this.secret.requestTimeout(),
    });
    const apiKey = this.secret.get<string>('TMDB_KEY');
    this.client.interceptors.request.use(requestInterceptor(this.logger));
    this.client.interceptors.response.use(responseInterceptor(this.logger));
    this.client.interceptors.request.use((config) => {
      config.params = { 'api_key': apiKey, ...config.params };
      return config;
    });
  }

  async onAppBootstrap(): Promise<void> {
    if (this.secret.isCI()) {
      this.logger.instance.debug('Skipping TMDB warmup in CI mode');
      return;
    }

    try {
      this.logger.instance.debug('Fetching TMDB configuration...');
      let configuration = await this.cache.get<TmdbConfiguration>(
        'edge:tmdb:configuration',
      );
      if (!configuration) {
        this.logger.instance.debug(
          'TMDB configuration not found in cache, fetching from remote...',
        );
        const { data } = await this.client.get('/3/configuration');
        configuration = ConfigurationSchema.parse(data);
        this.logger.instance.debug('Caching TMDB configuration...');
        await this.cache.set('edge:tmdb:configuration', configuration);
      }
      this.logger.instance.debug('TMDB configuration loaded successfully');
      this.imageProvider = new ImageProvider(configuration);
    } catch (error) {
      this.logger.instance.warn(
        'Unable to fetch TMDB configuration, will use fallback',
        error,
      );
    }
  }

  async getShow(tmdb: number): Promise<TmdbShow | undefined> {
    try {
      const show = await this.fetchShow(tmdb);
      return showTransformer(show, this.imageProvider) as TmdbShow;
    } catch (error) {
      this.logger.instance.warn('Unable to get show from remote', error);
      return undefined;
    }
  }

  async getMovie(tmdb: number): Promise<TmdbMovie | undefined> {
    try {
      const movie = await this.fetchMovie(tmdb);
      return movieTransformer(movie, this.imageProvider) as TmdbMovie;
    } catch (error) {
      this.logger.instance.warn('Unable to get movie from remote', error);
      return undefined;
    }
  }

  async getSeason(
    seasonNumber: number,
    tmdb: number,
  ): Promise<TmdbSeason | undefined> {
    if (!tmdb) {
      this.logger.instance.warn('The parameter `tmdb` is undefined');
      return undefined;
    }

    try {
      const season = await this.fetchSeason(tmdb, seasonNumber);
      return seasonTransformer(season, this.imageProvider) as TmdbSeason;
    } catch (error) {
      this.logger.instance.warn('Unable to get season from remote', error);
      return undefined;
    }
  }

  private async fetchShow(id: number): Promise<TmdbShow> {
    const { data } = await this.client.get(`/3/tv/${id}`, {
      params: { append_to_response: 'images' },
    });
    return ShowSchema.parse(data);
  }

  private async fetchMovie(id: number): Promise<TmdbMovie> {
    const { data } = await this.client.get(`/3/movie/${id}`, {
      params: { append_to_response: 'images' },
    });
    return MovieSchema.parse(data);
  }

  private async fetchSeason(
    showId: number,
    season: number,
  ): Promise<TmdbSeason> {
    const { data } = await this.client.get(`/3/tv/${showId}/season/${season}`, {
      params: { append_to_response: 'images' },
    });
    return SeasonSchema.parse(data);
  }
}
