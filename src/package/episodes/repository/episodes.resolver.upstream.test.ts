import { assertEquals } from '@std/assert';
import { describe, it } from '@std/testing/bdd';
import { createMockLogger } from '@scope/common/testing';
import type { ExperimentService } from '@scope/experiment';
import type { ArmService, SeriesRelationId } from '@scope/service/arm';
import { AnimeResourceSchema, type JikanService } from '@scope/service/jikan';
import type { NotifyService } from '@scope/service/notify';
import {
  SkyhookModelSchema,
  type SkyhookService,
} from '@scope/service/skyhook';
import {
  SeasonSchema,
  ShowSchema,
  type TmdbService,
} from '@scope/service/tmdb';
import { SeasonsSchema, type TraktService } from '@scope/service/trakt';
import type { TheXemService } from '@scope/service/thexem';
import { EpisodesResolver } from './episodes.resolver.ts';

const emptyPeriod = {
  from: null,
  to: null,
  prop: {
    from: { day: null, month: null, year: null },
    to: { day: null, month: null, year: null },
    string: null,
  },
};

const primaryJikan = AnimeResourceSchema.parse({
  mal_id: 1,
  url: 'https://example.test/anime/1',
  approved: true,
  titles: [],
  images: { jpg: {}, webp: {} },
  title_synonyms: [],
  type: 'TV',
  trailer: null,
  status: 'Finished Airing',
  airing: false,
  aired: emptyPeriod,
  broadcast: { day: null, time: null, timezone: null, string: null },
  episodes_list: [],
});

const { logger } = createMockLogger();

const relations = (
  overrides: Partial<SeriesRelationId>,
): SeriesRelationId => ({
  anidb: null,
  anilist: null,
  animePlanet: null,
  anisearch: null,
  imdb: null,
  kitsu: null,
  livechart: null,
  notify: null,
  themoviedb: null,
  thetvdb: null,
  myanimelist: null,
  ...overrides,
});

interface ResolverProviders {
  enabled: string[];
  relations: SeriesRelationId;
  skyhook?: ReturnType<typeof SkyhookModelSchema.parse>;
  tmdbShow?: ReturnType<typeof ShowSchema.parse>;
  tmdbSeason?: ReturnType<typeof SeasonSchema.parse>;
  traktSeasons?: ReturnType<typeof SeasonsSchema.parse>;
}

function createResolver(providers: ResolverProviders): EpisodesResolver {
  return new EpisodesResolver(
    { getAnime: async () => primaryJikan } as unknown as JikanService,
    {
      getShowByTvdb: async () => providers.skyhook,
    } as unknown as SkyhookService,
    {
      getShow: async () => providers.tmdbShow,
      getSeason: async () => providers.tmdbSeason,
    } as unknown as TmdbService,
    {
      getSeasons: async () => providers.traktSeasons,
    } as unknown as TraktService,
    {} as unknown as NotifyService,
    {
      getMappingsByTvdb: async () => [],
      buildTvdbSeasonEpisodeToAbsoluteMap: () => new Map<string, number>(),
    } as unknown as TheXemService,
    logger,
    {
      isEnabled: (feature: string) => providers.enabled.includes(feature),
      getFeatureValue: (_feature: string, fallback: number) => fallback,
    } as unknown as ExperimentService,
    {
      getRelationsById: async () => providers.relations,
    } as unknown as ArmService,
  );
}

describe('EpisodesResolver upstream date normalization', () => {
  it('uses Skyhook UTC when valid and falls back to local date when UTC is invalid', async () => {
    const skyhook = SkyhookModelSchema.parse({
      tvdbId: 10,
      title: 'Show',
      slug: 'show',
      status: 'ended',
      episodes: [
        {
          tvdbShowId: 10,
          tvdbId: 101,
          seasonNumber: 1,
          episodeNumber: 1,
          title: 'UTC preferred',
          airDate: '1970-01-01T00:00:00Z',
          airDateUtc: '2024-01-02T00:00:00Z',
        },
        {
          tvdbShowId: 10,
          tvdbId: 102,
          seasonNumber: 1,
          episodeNumber: 2,
          title: 'Local fallback',
          airDate: '1970-01-01T00:00:00Z',
          airDateUtc: 'invalid',
        },
        {
          tvdbShowId: 10,
          tvdbId: 103,
          seasonNumber: 1,
          episodeNumber: 3,
          title: 'No valid date',
          airDate: 'invalid',
          airDateUtc: '',
        },
      ],
    });
    const resolver = createResolver({
      enabled: ['enable-skyhook-source'],
      relations: relations({ thetvdb: 10 }),
      skyhook,
    });

    const result = await resolver.resolve(1, 'series:1', true);

    assertEquals(
      result.episodes.find((episode) => episode.id === 101)?.aired,
      new Date('2024-01-02T00:00:00Z').getTime() / 1000,
    );
    assertEquals(
      result.episodes.find((episode) => episode.id === 102)?.aired,
      0,
    );
    assertEquals(
      result.episodes.find((episode) => episode.id === 103)?.aired,
      null,
    );
  });

  it('normalizes parsed TMDB episode dates to finite seconds or null', async () => {
    const tmdbShow = ShowSchema.parse({
      id: 20,
      name: 'TMDB show',
      images: {},
      seasons: [{ id: 1, name: 'Season 1', season_number: 1 }],
    });
    const tmdbSeason = SeasonSchema.parse({
      id: 1,
      name: 'Season 1',
      season_number: 1,
      episodes: [
        {
          id: 201,
          name: 'Invalid date',
          episode_number: 1,
          air_date: 'invalid',
        },
        {
          id: 202,
          name: 'Epoch date',
          episode_number: 2,
          air_date: '1970-01-01T00:00:00Z',
        },
      ],
    });
    const resolver = createResolver({
      enabled: ['enable-tmdb-source'],
      relations: relations({ themoviedb: 20 }),
      tmdbShow,
      tmdbSeason,
    });

    const result = await resolver.resolve(1, 'series:1', true);

    assertEquals(
      result.episodes.find((episode) => episode.id === 201)?.aired,
      null,
    );
    assertEquals(
      result.episodes.find((episode) => episode.id === 202)?.aired,
      0,
    );
  });

  it('uses the parsed Trakt epoch seconds directly', async () => {
    const traktSeasons = SeasonsSchema.parse([{
      ids: { trakt: 30 },
      episodes: [{
        ids: { trakt: 301 },
        number: 1,
        title: 'Trakt episode',
        first_aired: '1970-01-01T00:00:00Z',
      }],
    }]);
    const resolver = createResolver({
      enabled: ['enable-trakt-source'],
      relations: relations({ imdb: 'tt123' }),
      traktSeasons,
    });

    const result = await resolver.resolve(1, 'series:1', true);

    assertEquals(
      result.episodes.find((episode) => episode.id === 301)?.aired,
      0,
    );
  });
});
