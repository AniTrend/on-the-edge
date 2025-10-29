import { Injectable } from '@danet/core';
import { SecretService } from '@scope/secret';
import { LoggerService } from '@scope/logger';
import { DEFAULT_HEADERS } from '@scope/client';
import { createClient, RequestClient } from '@anitrend/request-client';
import {
  AnimeEpisodePageSchema,
  AnimeResourceResponseSchema,
  MangaResourceResponseSchema,
  MoreInfoResponseSchema,
} from './jikan.schema.ts';
import type {
  AnimeEpisode,
  AnimeResource,
  MangaResource,
} from './jikan.types.ts';
import { animeTransform, mangaTransform } from './transformer/index.ts';
import { DEFAULT_MAX_EPISODES } from './episode-utils.ts';
import type { JikanAnime, JikanFetchOptions, JikanManga } from './types.ts';
import {
  requestInterceptor,
  responseInterceptor,
} from '../interceptor/client.interceptor.ts';

@Injectable()
export class JikanService {
  private readonly client: RequestClient;

  constructor(
    private readonly secret: SecretService,
    private readonly logger: LoggerService,
  ) {
    this.client = createClient({
      baseURL: this.secret.get('MAL'),
      headers: DEFAULT_HEADERS,
      timeout: this.secret.requestTimeout(),
    });
    this.client.interceptors.request.use(requestInterceptor(this.logger));
    this.client.interceptors.response.use(responseInterceptor(this.logger));
  }

  async getAnime(
    malId: number,
    options?: JikanFetchOptions,
  ): Promise<JikanAnime | undefined> {
    try {
      const [resource, moreinfo] = await Promise.all([
        this.fetchAnimeFull(malId).catch((error) => {
          this.logger.instance.warn(
            'Falling back to base anime endpoint due to failure',
            error,
          );
          return this.fetchAnime(malId);
        }),
        this.fetchAnimeMoreInfo(malId),
      ]);

      let episodesList: AnimeEpisode[] | undefined;
      let truncated = false;
      if (options?.episodes) {
        const limit = options.maxEpisodes ?? resource.episodes ??
          DEFAULT_MAX_EPISODES;
        const rawEpisodes = await this.fetchAnimeEpisodes(malId, {
          limit,
          window: options.episodeWindow,
        });
        episodesList = rawEpisodes;
        truncated = (episodesList?.length ?? 0) >= limit;
      }

      return animeTransform({
        ...resource,
        moreinfo,
        episodes_list: episodesList ?? [],
        episodes_truncated: truncated,
      });
    } catch (error) {
      this.logger.instance.warn(
        'Unable to get jikan show from remote',
        error,
      );
      return undefined;
    }
  }

  async getManga(malId?: number | null): Promise<JikanManga | undefined> {
    if (!malId) {
      this.logger.instance.warn('The parameter `mal` is undefined');
      return undefined;
    }

    try {
      const [resource, moreinfo] = await Promise.all([
        this.fetchMangaFull(malId).catch((error) => {
          this.logger.instance.warn(
            'Falling back to base manga endpoint due to failure',
            error,
          );
          return this.fetchManga(malId);
        }),
        this.fetchMangaMoreInfo(malId),
      ]);

      return mangaTransform({ ...resource, moreinfo });
    } catch (error) {
      this.logger.instance.warn(
        'Unable to get jikan manga from remote',
        error,
      );
      return undefined;
    }
  }

  private async fetchAnime(id: number): Promise<AnimeResource> {
    const response = await this.client
      .get(`/v4/anime/${id}`);
    const { data } = AnimeResourceResponseSchema.parse(response.data);
    return data;
  }

  private async fetchAnimeFull(id: number): Promise<AnimeResource> {
    const response = await this.client
      .get(`/v4/anime/${id}/full`);
    const { data } = AnimeResourceResponseSchema.parse(response.data);
    return data;
  }

  private async fetchManga(id: number): Promise<MangaResource> {
    const response = await this.client
      .get(`/v4/manga/${id}`);
    const { data } = MangaResourceResponseSchema.parse(response.data);
    return data;
  }

  private async fetchMangaFull(id: number): Promise<MangaResource> {
    const response = await this.client
      .get(`/v4/manga/${id}/full`);
    const { data } = MangaResourceResponseSchema.parse(response.data);
    return data;
  }

  private async fetchAnimeMoreInfo(id: number): Promise<string | null> {
    try {
      const { data } = await this.client
        .get(`/v4/anime/${id}/moreinfo`);
      const parsed = MoreInfoResponseSchema.parse(data ?? {});
      return parsed.data?.moreinfo ?? null;
    } catch (_error) {
      return null;
    }
  }

  private async fetchMangaMoreInfo(id: number): Promise<string | null> {
    try {
      const { data } = await this.client
        .get(`/v4/manga/${id}/moreinfo`);
      const parsed = MoreInfoResponseSchema.parse(data ?? {});
      return parsed.data?.moreinfo ?? null;
    } catch (_error) {
      return null;
    }
  }

  private async fetchAnimeEpisodes(
    id: number,
    opts?: { limit?: number; window?: { from?: number; to?: number } },
  ): Promise<AnimeEpisode[]> {
    const episodes: AnimeEpisode[] = [];
    let page = 1;
    const limit = opts?.limit;

    while (page < 100) {
      try {
        const { data } = await this.client
          .get(`/v4/anime/${id}/episodes`, { params: { page } });
        const parsed = AnimeEpisodePageSchema.parse(data ?? {});
        const pageEpisodes = parsed.data;
        if (!Array.isArray(pageEpisodes) || pageEpisodes.length === 0) break;

        const filtered = opts?.window
          ? pageEpisodes.filter((episode) => {
            const number = episode.mal_id;
            if (opts.window?.from != null && number < opts.window.from) {
              return false;
            }
            if (opts.window?.to != null && number > opts.window.to) {
              return false;
            }
            return true;
          })
          : pageEpisodes;

        episodes.push(...filtered);

        if (limit != null && episodes.length >= limit) {
          return episodes.slice(0, limit);
        }

        const hasNext = parsed.pagination?.has_next_page ??
          (pageEpisodes.length >= 25);
        if (!hasNext) break;
      } catch (_error) {
        break;
      }

      page += 1;
    }

    return episodes;
  }
}
