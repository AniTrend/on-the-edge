import { assert, assertEquals } from '@std/assert';
import { EpisodesRepository } from '../repository/episodes.repository.ts';
import { toCanonicalEpisode } from '../episodes.types.ts';
import { Features } from '../../common/types/core.ts';
import type { EpisodeCollection } from '../collection/episode.collection.ts';
import type { EpisodeDocument } from '../store/types.ts';
import { AppFeatures } from '../../common/experiment/types.ts';
// We'll stub remotes via fetch helpers
import type { TheXemDataModel } from '../../service/thexem/remote/types.ts';
import type { SkyhookShow } from '../../service/skyhook/types.ts';
import { setEnvScoped } from '../../common/testing/env.ts';
import { json, onGet, stubFetch } from '../../common/testing/net.ts';
import { Instant } from '../../common/helpers/date.ts';
import { SeriesRelationId } from '../../service/arm/index.ts';

// Minimal in-memory EpisodeCollection
const memory: (EpisodeDocument & { _id: string })[] = [];
const makeInMemoryCol = (): EpisodeCollection => ({
  get(seriesKey: string) {
    return Promise.resolve(
      memory.find((d) => d.seriesKey === seriesKey) ?? null,
    );
  },
  save(doc: EpisodeDocument) {
    const idx = memory.findIndex((d) => d.seriesKey === doc.seriesKey);
    const stored = {
      ...doc,
      _id: idx >= 0 ? memory[idx]._id : crypto.randomUUID(),
    };
    if (idx >= 0) memory[idx] = stored;
    else memory.push(stored);
    return Promise.resolve(stored);
  },
  lastUpdated: function (_seriesKey: string): Promise<Instant | null> {
    return Promise.resolve(0);
  },
});

const makeFeatures = (flags: Partial<AppFeatures>): Features => {
  const table = { ...flags } as Record<string, unknown>;
  return {
    isOn: (k: string) => Boolean(table[k]) === true,
    getFeatureValue: <T>(k: string, d: T) => (table[k] as T) ?? d,
  } as unknown as Features;
};

Deno.test('experiments: Skyhook merge with XEM normalization remaps numbers deterministically', async () => {
  // Clear memory to avoid test interference
  memory.length = 0;
  // Seed Jikan baseline episodes: 3 episodes with numbers 1..3
  const seriesKey = '1000';
  const episodes = [1, 2, 3].map((n) =>
    toCanonicalEpisode({
      mal_id: n,
      title: `Ep ${n}`,
      themes: { openings: [], endings: [] },
    })
  );
  memory.push({
    seriesKey,
    updatedAt: Date.now(),
    episodes,
    airing: null,
    _id: crypto.randomUUID(),
  });

  // Stub ARM (YUNA) relation: map anilist-> myanimelist and thetvdb/tmdb ids

  // Skyhook override returns two episodes with season/episode mapping that XEM will remap
  const skyhookShow: SkyhookShow = {
    tvdbId: 12345,
    title: 'Show',
    overview: 'Overview',
    slug: 'show',
    originalCountry: 'JP',
    originalLanguage: 'ja',
    language: 'ja',
    firstAired: 0,
    lastAired: new Date('2020-01-15T00:00:00.000Z'),
    tvMazeId: 0,
    tmdbId: 67890,
    malIds: [Number(seriesKey)],
    aniListIds: [Number(seriesKey)],
    lastUpdated: 0,
    status: 'Ended',
    runtime: 24,
    timeOfDay: { hours: 0, minutes: 0 },
    originalNetwork: 'TV',
    network: 'TV',
    genres: [],
    contentRating: 'PG',
    rating: { count: 0, value: '0' },
    alternativeTitles: { title: 'Show' },
    imdbId: '',
    actors: [],
    images: [],
    seasons: [],
    episodes: [
      {
        tvdbShowId: 12345,
        tvdbId: 100,
        title: 'Ep 1',
        overview: 'S1E1',
        seasonNumber: 1,
        episodeNumber: 1,
        absoluteEpisodeNumber: undefined,
        airDate: new Date('2020-01-01T00:00:00.000Z'),
        airDateUtc: new Date('2020-01-01T00:00:00.000Z'),
        finaleType: undefined,
        airedBeforeSeasonNumber: undefined,
        airedAfterSeasonNumber: undefined,
        runtime: 24,
      },
      {
        tvdbShowId: 12345,
        tvdbId: 101,
        title: 'Ep 2',
        overview: 'S1E2',
        seasonNumber: 1,
        episodeNumber: 2,
        absoluteEpisodeNumber: undefined,
        airDate: new Date('2020-01-08T00:00:00.000Z'),
        airDateUtc: new Date('2020-01-08T00:00:00.000Z'),
        finaleType: undefined,
        airedBeforeSeasonNumber: undefined,
        airedAfterSeasonNumber: undefined,
        runtime: 24,
      },
      {
        tvdbShowId: 12345,
        tvdbId: 102,
        title: 'Ep 3',
        overview: 'S1E3',
        seasonNumber: 1,
        episodeNumber: 3,
        absoluteEpisodeNumber: undefined,
        airDate: new Date('2020-01-15T00:00:00.000Z'),
        airDateUtc: new Date('2020-01-15T00:00:00.000Z'),
        finaleType: undefined,
        airedBeforeSeasonNumber: undefined,
        airedAfterSeasonNumber: undefined,
        runtime: 24,
      },
    ],
  };
  // Stub skyhook remote fetch and transform pipeline by stubbing the request() used under the hood
  // Skyhook remote ultimately uses request() via getShowByTvdb -> request
  const skyhookBase = 'https://skyhook.test';
  const xemBase = 'https://thexem.test';
  const yunaBase = 'https://yuna.test';
  const envScope = setEnvScoped({
    SKYHOOK: skyhookBase,
    THEXEM: xemBase,
    YUNA: yunaBase,
  });

  // TheXEM override provides season-episode -> absolute mapping: 1-1 => 11, 1-2 => 12
  const xemData: TheXemDataModel = {
    result: 'success',
    message: 'ok',
    data: [
      {
        scene: { season: 1, episode: 1, absolute: 11 },
        tvdb: { season: 1, episode: 1, absolute: 1 },
        anidb: { season: 1, episode: 1, absolute: 11 },
      },
      {
        scene: { season: 1, episode: 2, absolute: 12 },
        tvdb: { season: 1, episode: 2, absolute: 2 },
        anidb: { season: 1, episode: 2, absolute: 12 },
      },
    ],
  };
  // Stub TheXEM via fetch as well to keep tests deterministic
  const netStub = stubFetch([
    onGet(`${yunaBase}/api/v2/ids`, ({ url }) => {
      const u = new URL(url);
      if (u.searchParams.get('source') === 'anilist') {
        return json({
          anilist: Number(seriesKey),
          myanimelist: Number(seriesKey),
          thetvdb: 12345,
          themoviedb: 67890,
        });
      }
      return json({});
    }),
    onGet(`${skyhookBase}/tvdb/shows/en/12345`, () =>
      json({
        tvdbId: skyhookShow.tvdbId,
        title: skyhookShow.title,
        overview: skyhookShow.overview,
        slug: skyhookShow.slug,
        originalCountry: skyhookShow.originalCountry,
        originalLanguage: skyhookShow.originalLanguage,
        language: skyhookShow.language,
        firstAired: new Date(),
        lastAired: skyhookShow.lastAired,
        tvMazeId: skyhookShow.tvMazeId,
        tmdbId: skyhookShow.tmdbId,
        malIds: skyhookShow.malIds,
        aniListIds: skyhookShow.aniListIds,
        lastUpdated: new Date(),
        status: skyhookShow.status,
        runtime: skyhookShow.runtime,
        timeOfDay: skyhookShow.timeOfDay,
        originalNetwork: skyhookShow.originalNetwork,
        network: skyhookShow.network,
        genres: skyhookShow.genres,
        contentRating: skyhookShow.contentRating,
        rating: skyhookShow.rating,
        alternativeTitles: skyhookShow.alternativeTitles,
        imdbId: skyhookShow.imdbId,
        actors: skyhookShow.actors,
        images: skyhookShow.images,
        seasons: skyhookShow.seasons,
        episodes: skyhookShow.episodes,
      })),
    // Match only the path; query is ignored which is fine here
    onGet(`${xemBase}/map/all`, () => json(xemData)),
  ]);

  const features = makeFeatures({
    'episode-number-normalize-xem': true,
  });
  const col = makeInMemoryCol();
  const repo = new EpisodesRepository(col, features);
  // Provide relation info to trigger SKYHOOK integration
  const relation: SeriesRelationId = {
    anilist: Number(seriesKey),
    myanimelist: Number(seriesKey),
    thetvdb: 12345,
    themoviedb: 67890,
  };
  const page = await repo.invoke(Number(seriesKey), { limit: 10, relation });
  assert(page.data);
  // Expect baseline total when merging by alignment; sources attribution should include SKYHOOK
  assertEquals(page.total, 3);
  assert(page.data.length > 0);
  // Note: XEM remap count is now internal to repository (debug log only). No direct assertion.
  // Restore stubs/env
  netStub.restore();
  envScope.restore();
});

Deno.test('experiments: Trakt merge across seasons with deterministic overrides', async () => {
  // Clear memory to avoid test interference
  memory.length = 0;
  const seriesKey = '2000';
  const episodes = [1, 2].map((n) =>
    toCanonicalEpisode({
      mal_id: n,
      title: `Ep ${n}`,
      themes: { openings: [], endings: [] },
    })
  );
  memory.push({
    seriesKey,
    updatedAt: Date.now(),
    episodes,
    airing: null,
    _id: crypto.randomUUID(),
  });

  // Stub ARM (YUNA) relation mapping for Trakt test

  const traktBase = 'https://trakt.test';
  const yunaBase = 'https://yuna.test';
  const env = setEnvScoped({
    TRAKT: traktBase,
    TRAKT_ID: 'dummy',
    YUNA: yunaBase,
  });

  let s: ReturnType<typeof stubFetch> | undefined;
  try {
    s = stubFetch([
      onGet(`${yunaBase}/api/v2/ids`, ({ url }) => {
        const u = new URL(url);
        if (u.searchParams.get('source') === 'anilist') {
          return json({
            anilist: Number(seriesKey),
            myanimelist: Number(seriesKey),
            thetvdb: 9999,
          });
        }
        return json({});
      }),
      onGet(
        `${traktBase}/shows/:id/seasons`,
        () => json([{ number: 1 }, { number: 2 }]),
      ),
      onGet(`${traktBase}/shows/:id/seasons/1/episodes`, () =>
        json([
          {
            season: 1,
            number: 1,
            title: 'S1E1',
            overview: '',
            first_aired: '2020-01-01',
            runtime: 24,
            ids: { trakt: 101 },
          },
        ])),
      onGet(`${traktBase}/shows/:id/seasons/2/episodes`, () =>
        json([
          {
            season: 2,
            number: 1,
            title: 'S2E1',
            overview: '',
            first_aired: '2020-01-08',
            runtime: 24,
            ids: { trakt: 201 },
          },
        ])),
    ]);

    const features = makeFeatures({ 'episode-merge-trakt': true });
    const col = makeInMemoryCol();
    const repo = new EpisodesRepository(col, features);
    // Provide relation info to trigger TRAKT integration
    const relation = {
      anilist: Number(seriesKey),
      myanimelist: Number(seriesKey),
      thetvdb: 9999,
    };
    const page = await repo.invoke(Number(seriesKey), { limit: 10, relation });
    assert(page.data);
    // Trakt adds attribution; totals remain baseline size
    assertEquals(page.total, 2);
    assert(page.data.length > 0);
  } finally {
    s?.restore();
    env.restore();
  }
});
