import { describe, it } from '@std/testing/bdd';
import { assertEquals } from '@std/assert';
import { assertSpyCalls, spy } from '@std/testing/mock';
import { SeriesResolver } from './series.resolver.ts';
import { createMockExperiment, createMockLogger } from '@scope/common/testing';
import type {
  AnimeThemesLookupModel,
  AnimeThemesService,
} from '@scope/service/animethemes';
import type { ArmService, SeriesRelationId } from '@scope/service/arm';
import type { JikanAnime, JikanService } from '@scope/service/jikan';
import type { NotifyService } from '@scope/service/notify';
import type { SkyhookService } from '@scope/service/skyhook';
import type { TheXemService } from '@scope/service/thexem';
import type { TmdbService } from '@scope/service/tmdb';
import type { TraktService } from '@scope/service/trakt';

const relation: SeriesRelationId = {
  anidb: null,
  anilist: 400,
  animePlanet: null,
  anisearch: null,
  imdb: null,
  kitsu: null,
  livechart: null,
  notify: null,
  themoviedb: null,
  thetvdb: null,
  myanimelist: 300,
};

const jikanAnime: JikanAnime = {
  mal_id: 300,
  url: 'https://example.test/anime/300',
  approved: true,
  titles: [],
  images: {
    jpg: {
      image_url: 'a.jpg',
      small_image_url: 'a_s.jpg',
      large_image_url: 'a_l.jpg',
    },
    webp: {
      image_url: 'a.webp',
      small_image_url: 'a_s.webp',
      large_image_url: 'a_l.webp',
    },
  },
  title: 'Resolver Test',
  title_english: null,
  title_japanese: null,
  title_synonyms: [],
  type: 'TV',
  score: 0,
  scored_by: 0,
  rank: 0,
  popularity: 0,
  members: 0,
  favorites: 0,
  synopsis: null,
  background: null,
  rating: null,
  moreinfo: null,
  episodes: 12,
  duration: '24 min per ep',
  trailer: null,
  source: 'Original',
  status: 'Finished Airing',
  airing: false,
  aired: {
    from: null,
    to: null,
    prop: {
      from: { day: null, month: null, year: null },
      to: { day: null, month: null, year: null },
      string: null,
    },
  },
  season: null,
  year: null,
  producers: [],
  licensors: [],
  studios: [],
  genres: [],
  explicit_genres: [],
  themes: [],
  demographics: [],
  relations: [],
  external: [],
  streaming: [],
  broadcast: {
    day: 'Mondays',
    time: '00:00',
    timezone: 'JST',
    string: 'Mondays at 00:00 (JST)',
  },
  theme: null,
  episodes_list: [],
  episodes_truncated: false,
};

const animeThemesLookup: AnimeThemesLookupModel = {
  anime: [{
    id: 1,
    name: 'Resolver Test',
    slug: 'resolver-test',
    year: 2024,
    season: 'Spring',
    media_format: 'TV',
    animethemes: [{
      id: 10,
      type: 'OP',
      sequence: 1,
      slug: 'resolver-test-op1',
      animethemeentries: [],
      song: { id: 20, title: 'Song' },
    }],
  }],
};

function createResolver(flagEnabled: boolean) {
  const { logger } = createMockLogger();
  const experiment = createMockExperiment({
    'enable-animethemes-api': flagEnabled,
  });
  const getThemesForAnime = spy(async () => animeThemesLookup);

  const resolver = new SeriesResolver(
    { getShow: async () => undefined } as unknown as TraktService,
    {
      getShow: async () => undefined,
      getMovie: async () => undefined,
    } as unknown as TmdbService,
    { getShowByTvdb: async () => undefined } as unknown as SkyhookService,
    { getAnime: async () => undefined } as unknown as NotifyService,
    { getAnime: async () => jikanAnime } as unknown as JikanService,
    { getRelationsById: async () => relation } as unknown as ArmService,
    { getMappingsByTvdb: async () => undefined } as unknown as TheXemService,
    { getThemesForAnime } as unknown as AnimeThemesService,
    experiment,
    logger,
  );

  return { resolver, getThemesForAnime };
}

describe('SeriesResolver', () => {
  it('skips AnimeThemes when enable-animethemes-api is disabled', async () => {
    const { resolver, getThemesForAnime } = createResolver(false);

    const result = await resolver.resolve({ anilist: 400 });

    assertSpyCalls(getThemesForAnime, 0);
    assertEquals('animethemes' in result ? result.animethemes : [], []);
  });

  it('uses AnimeThemes when enable-animethemes-api is enabled', async () => {
    const { resolver, getThemesForAnime } = createResolver(true);

    const result = await resolver.resolve({ anilist: 400 });

    assertSpyCalls(getThemesForAnime, 1);
    assertEquals(
      'animethemes' in result ? result.animethemes : [],
      animeThemesLookup.anime[0].animethemes,
    );
  });
});
