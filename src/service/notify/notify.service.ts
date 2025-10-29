import { Injectable } from '@danet/core';
import { SecretService } from '@scope/secret';
import { LoggerService } from '@scope/logger';
import { createClient, type RequestClient } from '@anitrend/request-client';
import { DEFAULT_HEADERS } from '../constants.ts';
import { transform } from './transformer/index.ts';
import { NotifyAnimeSchema, NotifyEpisodeSchema } from './notify.schema.ts';
import type {
  EnrichedAnimeData,
  NotifyAnime,
  NotifyEpisodeRemote,
} from './types.ts';
import {
  requestInterceptor,
  responseInterceptor,
} from '../interceptor/client.interceptor.ts';

@Injectable()
export class NotifyService {
  private readonly client: RequestClient;

  constructor(
    private readonly secret: SecretService,
    private readonly logger: LoggerService,
  ) {
    this.client = createClient({
      baseURL: this.secret.get('NOTIFY'),
      headers: DEFAULT_HEADERS,
      timeout: this.secret.requestTimeout(),
    });
    this.client.interceptors.request.use(requestInterceptor(this.logger));
    this.client.interceptors.response.use(responseInterceptor(this.logger));
  }

  async getAnime(
    notifyId: string,
    opts: { withEpisodes?: boolean } = {},
  ): Promise<NotifyAnime | undefined> {
    try {
      const anime = await this.client
        .get(`/api/anime/${notifyId}`)
        .then(({ data }) => NotifyAnimeSchema.parse(data));

      const episodes = opts.withEpisodes && anime.episodes
        ? await this.loadEpisodes(anime.episodes)
        : [];

      const enriched: EnrichedAnimeData = {
        ...anime,
        episodes,
      };

      return transform(enriched);
    } catch (error) {
      this.logger.instance.warn(
        'Unable to get notify anime or episode data from remote',
        error,
      );
      return undefined;
    }
  }

  private async loadEpisodes(
    episodeIds: string[],
  ): Promise<NotifyEpisodeRemote[]> {
    if (episodeIds.length === 0) {
      return [];
    }

    const episodes = await Promise.all(
      episodeIds.map((id) => this.fetchEpisode(id)),
    );

    return episodes.filter((episode): episode is NotifyEpisodeRemote =>
      Boolean(episode)
    );
  }

  private async fetchEpisode(
    episodeId: string,
  ): Promise<NotifyEpisodeRemote | undefined> {
    return await this.client
      .get(`/api/episode/${episodeId}`)
      .then(({ data }) => NotifyEpisodeSchema.parse(data))
      .catch((error) => {
        this.logger.instance.warn(
          `Unable to get notify episode data for ${episodeId}`,
          error,
        );
        return undefined;
      });
  }
}
