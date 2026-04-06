import { Injectable } from '@danet/core';
import { SecretService } from '@scope/secret';
import { LoggerService } from '@scope/logger';
import { DEFAULT_HEADERS } from '@scope/common/core';
import { createClient, RequestClient } from '@anitrend/request-client';
import {
  AnimeEpisodePageSchema,
  AnimeResourceResponseSchema,
  AnimeStaffPageSchema,
  CharacterResourceResponseSchema,
  CharacterSearchResponseSchema,
  MangaResourceResponseSchema,
  MoreInfoResponseSchema,
  PersonResourceResponseSchema,
  PersonSearchResponseSchema,
  ProducerResourceResponseSchema,
  ProducerSearchResponseSchema,
} from './jikan.schema.ts';
import type {
  AnimeEpisode,
  AnimeResource,
  AnimeStaffEntry,
  CharacterResource,
  MangaResource,
  PersonResource,
  ProducerResource,
} from './jikan.types.ts';
import {
  animeTransform,
  characterTransform,
  mangaTransform,
} from './transformer/index.ts';
import { DEFAULT_MAX_EPISODES } from './episode-utils.ts';
import type {
  JikanAnime,
  JikanCharacter,
  JikanFetchOptions,
  JikanManga,
  JikanPerson,
  JikanProducer,
} from './types.ts';
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

      let staffList: AnimeStaffEntry[] | undefined;
      if (options?.staff) {
        staffList = await this.fetchAnimeStaff(malId).catch((error) => {
          this.logger.instance.warn(
            `Failed to fetch staff for anime id=${malId}`,
            { cause: error },
          );
          return [];
        });
      }

      const anime = animeTransform({
        ...resource,
        moreinfo,
        episodes_list: episodesList ?? [],
        episodes_truncated: truncated,
      });

      return staffList !== undefined
        ? { ...anime, staff_list: staffList }
        : anime;
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

    while (true) {
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

        const hasNext = parsed.pagination?.has_next_page;
        if (hasNext === false) break;
      } catch (error) {
        this.logger.instance.warn(
          `Failed to fetch episodes page ${page} for anime id=${id}`,
          { cause: error },
        );
        break;
      }

      page += 1;
    }

    return episodes;
  }

  private async fetchAnimeStaff(id: number): Promise<AnimeStaffEntry[]> {
    const { data } = await this.client.get(`/v4/anime/${id}/staff`);
    const parsed = AnimeStaffPageSchema.parse(data ?? {});
    return parsed.data ?? [];
  }

  private async fetchProducer(id: number): Promise<ProducerResource> {
    const { data } = await this.client.get(`/v4/producers/${id}`);
    const parsed = ProducerResourceResponseSchema.parse(data ?? {});
    return parsed.data;
  }

  private async searchProducers(
    query: string,
    limit = 5,
  ): Promise<ProducerResource[]> {
    const { data } = await this.client.get('/v4/producers', {
      params: { q: query, limit },
    });
    const parsed = ProducerSearchResponseSchema.parse(data ?? {});
    return parsed.data ?? [];
  }

  private async fetchPerson(id: number): Promise<PersonResource> {
    const { data } = await this.client.get(`/v4/people/${id}`);
    const parsed = PersonResourceResponseSchema.parse(data ?? {});
    return parsed.data;
  }

  private async fetchCharacter(id: number): Promise<CharacterResource> {
    const { data } = await this.client.get(`/v4/characters/${id}`);
    const parsed = CharacterResourceResponseSchema.parse(data ?? {});
    return parsed.data;
  }

  private async fetchCharacterFull(id: number): Promise<CharacterResource> {
    const { data } = await this.client.get(`/v4/characters/${id}/full`);
    const parsed = CharacterResourceResponseSchema.parse(data ?? {});
    return parsed.data;
  }

  private async searchPeople(
    query: string,
    limit = 5,
  ): Promise<PersonResource[]> {
    const { data } = await this.client.get('/v4/people', {
      params: { q: query, limit },
    });
    const parsed = PersonSearchResponseSchema.parse(data ?? {});
    return parsed.data ?? [];
  }

  private async searchCharacters(
    query: string,
    limit = 5,
  ): Promise<CharacterResource[]> {
    const { data } = await this.client.get('/v4/characters', {
      params: { q: query, limit },
    });
    const parsed = CharacterSearchResponseSchema.parse(data ?? {});
    return parsed.data ?? [];
  }

  async getProducer(malId: number): Promise<JikanProducer | undefined> {
    try {
      return await this.fetchProducer(malId);
    } catch (error) {
      this.logger.instance.warn(
        `Unable to get jikan producer id=${malId}`,
        { cause: error },
      );
      return undefined;
    }
  }

  async getProducerByKeyword(
    query: string,
  ): Promise<JikanProducer | undefined> {
    try {
      const results = await this.searchProducers(query);
      return results[0];
    } catch (error) {
      this.logger.instance.warn(
        `Unable to search jikan producers query="${query}"`,
        { cause: error },
      );
      return undefined;
    }
  }

  async getPerson(malId: number): Promise<JikanPerson | undefined> {
    try {
      return await this.fetchPerson(malId);
    } catch (error) {
      this.logger.instance.warn(
        `Unable to get jikan person id=${malId}`,
        { cause: error },
      );
      return undefined;
    }
  }

  async getPersonByKeyword(query: string): Promise<JikanPerson | undefined> {
    try {
      const results = await this.searchPeople(query);
      return results[0];
    } catch (error) {
      this.logger.instance.warn(
        `Unable to search jikan people query="${query}"`,
        { cause: error },
      );
      return undefined;
    }
  }

  async getCharacter(malId: number): Promise<JikanCharacter | undefined> {
    try {
      const resource = await this.fetchCharacterFull(malId).catch((error) => {
        this.logger.instance.warn(
          'Falling back to base character endpoint due to failure',
          error,
        );
        return this.fetchCharacter(malId);
      });

      return characterTransform(resource);
    } catch (error) {
      this.logger.instance.warn(
        `Unable to get jikan character id=${malId}`,
        { cause: error },
      );
      return undefined;
    }
  }

  async getCharacterByKeyword(
    query: string,
  ): Promise<JikanCharacter | undefined> {
    try {
      const results = await this.searchCharacters(query);
      const [character] = results;
      return character ? characterTransform(character) : undefined;
    } catch (error) {
      this.logger.instance.warn(
        `Unable to search jikan characters query="${query}"`,
        { cause: error },
      );
      return undefined;
    }
  }
}
