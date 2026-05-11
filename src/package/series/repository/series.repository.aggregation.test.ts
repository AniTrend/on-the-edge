import { afterEach, beforeEach, describe, it } from '@std/testing/bdd';
import { assertEquals, assertExists, assertRejects } from '@std/assert';
import { assertSpyCalls } from '@std/testing/mock';
import { SeriesRepository } from './series.repository.ts';
import type { Collection } from '@scope/database/collection';
import type { MongoService } from '@scope/database';
import type { SeriesDocument } from './series.document.ts';
import { InMemoryCollection } from '@scope/database/testing';
import type { TraktShow } from '@scope/service/trakt';
import type { TmdbShow } from '@scope/service/tmdb';
import type { SkyhookShow } from '@scope/service/skyhook';
import type { SeriesRelationId } from '@scope/service/arm';
import type { NotifyAnime } from '@scope/service/notify';
import type { AnimeThemesLookupModel } from '@scope/service/animethemes';
import type { JikanAnime } from '@scope/service/jikan';
import type { TheXem } from '@scope/service/thexem';
import { createMockExperiment, createMockLogger } from '@scope/common/testing';
import {
  createAnimeThemesSpy,
  createArmAnilistSpy,
  createArmTvdbSpy,
  createJikanSpy,
  createNotifySpy,
  createServiceSpies,
  createSkyhookSpy,
  createTheXemSpy,
  createTmdbSpy,
  createTraktSpy,
} from './testing/mod.ts';
import { SeriesResolver } from './series.resolver.ts';
import { LoggerService } from '@scope/logger';

function createArmRelation(
  overrides: Partial<SeriesRelationId> = {},
): SeriesRelationId {
  return {
    anidb: null,
    anilist: null,
    animePlanet: null,
    anisearch: null,
    imdb: 'tt-mock',
    kitsu: null,
    livechart: null,
    notify: null,
    themoviedb: null,
    thetvdb: null,
    myanimelist: null,
    ...overrides,
  } satisfies SeriesRelationId;
}

// ===== Mock Data Factory =====

/**
 * Creates consistent mock data for tests
 */
function createMockData() {
  const traktShow: TraktShow = {
    title: 'Series',
    year: 2024,
    ids: {
      trakt: 42,
      slug: 'series',
      tvdb: 1,
      imdb: 'tt123',
      tmdb: 9,
      tvrage: null,
    },
    tagline: null,
    overview: '',
    first_aired: 0,
    airs: { day: '', time: '', timezone: '' },
    runtime: 0,
    certification: '',
    network: '',
    country: '',
    trailer: '',
    homepage: '',
    status: '',
    rating: 0,
    votes: 0,
    comment_count: 0,
    updated_at: 0,
    language: '',
    available_translations: [],
    genres: [],
    aired_episodes: 0,
    original_title: 'Series',
  } as TraktShow;

  const tmdbShow: TmdbShow = { id: 9 } as TmdbShow;

  const skyhookShow: SkyhookShow = {
    episodes: [],
    malIds: [456],
    aniListIds: [789],
    tmdbId: 9,
    firstAired: 0,
    lastUpdated: 0,
  } as unknown as SkyhookShow;

  const notifyAnime: NotifyAnime = {
    id: 'notify-1',
    mediaId: {
      mal: '456',
      anilist: '789',
      tmdb: '9',
    },
  } as unknown as NotifyAnime;

  const jikanAnime: JikanAnime = {
    data: { title: 'Jikan title' },
  } as unknown as JikanAnime;

  const armRelations: SeriesRelationId[] = [
    createArmRelation({
      notify: 'notify-1',
      myanimelist: 456,
      anilist: 789,
      themoviedb: 9,
      thetvdb: 1,
      imdb: 'tt123',
    }),
  ];

  const thexemRows: TheXem[] = [
    {
      tvdb: { season: 1, episode: 1, absolute: 1 },
      scene: { season: 1, episode: 1, absolute: 1 },
      anidb: { season: 1, episode: 1, absolute: 1 },
    },
  ];

  const animethemes: AnimeThemesLookupModel = {
    anime: [{
      id: 456,
      name: 'Series',
      slug: 'series',
      year: 2024,
      season: 'Spring',
      media_format: 'TV',
      animethemes: [
        {
          id: 1,
          type: 'OP',
          sequence: 1,
          slug: 'series-op1',
          song: { id: 11, title: 'OP1' },
          animethemeentries: [],
        },
      ],
    }],
  };

  return {
    traktShow,
    tmdbShow,
    skyhookShow,
    notifyAnime,
    jikanAnime,
    armRelations,
    thexemRows,
    animethemes,
  };
}

function createMockMongoService(
  collection: Collection<SeriesDocument>,
): MongoService {
  return {
    collection: () => collection as never,
  } as unknown as MongoService;
}

function createCachedSeriesDocument(
  seriesKey: string,
  anilistId: number,
): SeriesDocument {
  return {
    seriesKey,
    kind: 'ANIME',
    classification: 'TV',
    mediaId: {
      anilist: anilistId,
      myanimelist: 456,
      tvdb: null,
      themoviedb: null,
      imdb: null,
      notify: null,
      trakt: null,
      slug: null,
      kitsu: null,
      anidb: null,
      animePlanet: null,
      anisearch: null,
      livechart: null,
      tvMazeId: null,
      tvrage: null,
      shoboi: null,
    },
    title: {
      romaji: null,
      english: null,
      canonical: null,
      japanese: null,
      harigana: null,
      synonyms: null,
    },
    cover: {},
    banner: null,
    fanart: null,
    format: null,
    status: null,
    source: null,
    ageRating: null,
    images: [],
    description: null,
    moreInfo: null,
    duration: null,
    networks: [],
    animethemes: [],
    trailers: [],
    schedule: null,
    updatedAt: Math.floor(Date.now() / 1000),
  };
}

// ===== Tests =====
// TODO: Enable tests after fixing intermittent failures
describe.skip('SeriesRepository aggregation', () => {
  let collection: Collection<SeriesDocument>;
  let mocks: ReturnType<typeof createServiceSpies>;
  let mockData: ReturnType<typeof createMockData>;
  let logger: ReturnType<typeof createMockLogger>['logger'];
  let loggerSpies: ReturnType<typeof createMockLogger>['spies'];

  beforeEach(() => {
    collection = new InMemoryCollection();
    mocks = createServiceSpies();
    mockData = createMockData();
    const stub = createMockLogger();
    logger = stub.logger;
    loggerSpies = stub.spies;
  });

  afterEach(() => {
    // Spies are recreated in beforeEach, no cleanup needed
  });

  function createResolver(logger: LoggerService): SeriesResolver {
    return new SeriesResolver(
      mocks.services.trakt,
      mocks.services.tmdb,
      mocks.services.skyhook,
      mocks.services.notify,
      mocks.services.jikan,
      mocks.services.arm,
      mocks.services.thexem,
      mocks.services.animeThemes,
      createMockExperiment({ 'enable-animethemes-api': true }),
      logger,
    );
  }

  describe('cache behavior', () => {
    it('should return cached series when available', async () => {
      const seriesKey = 'anilist:123';
      const cachedDoc = createCachedSeriesDocument(seriesKey, 123);

      await collection.findOneAndReplace(
        { _id: seriesKey } as never,
        cachedDoc,
        { upsert: true },
      );

      const repository = new SeriesRepository(
        createMockMongoService(collection),
        logger,
        createResolver(logger),
      );

      const result = await repository.invoke({ anilist: 123 });

      assertEquals(result.mediaId.anilist, 123);
      assertSpyCalls(mocks.spies.trakt, 0);
      assertSpyCalls(mocks.spies.tmdb, 0);
      assertSpyCalls(mocks.spies.jikan, 0);
    });
  });

  describe('service aggregation', () => {
    it('should aggregate data from all available services on cache miss', async () => {
      const armRelation = {
        anilist: 789,
        myanimelist: 456,
        thetvdb: 1,
        themoviedb: 9,
      } as SeriesRelationId;

      mocks.spies.armAnilist = createArmAnilistSpy(async () => armRelation);
      mocks.spies.trakt = createTraktSpy(async () => mockData.traktShow);
      mocks.spies.tmdb = createTmdbSpy(async () => mockData.tmdbShow);
      mocks.spies.skyhook = createSkyhookSpy(async () => mockData.skyhookShow);
      mocks.spies.notify = createNotifySpy(async () => mockData.notifyAnime);
      mocks.spies.jikan = createJikanSpy(async () => mockData.jikanAnime);
      mocks.spies.armTvdb = createArmTvdbSpy(async () => []);
      mocks.spies.thexem = createTheXemSpy(async () => mockData.thexemRows);
      mocks.spies.animeThemes = createAnimeThemesSpy(
        async () => mockData.animethemes,
      );

      mocks.services.arm.getAniListRelationId = mocks.spies.armAnilist;
      mocks.services.trakt.getShow = mocks.spies.trakt;
      mocks.services.tmdb.getShow = mocks.spies.tmdb;
      mocks.services.skyhook.getShowByTvdb = mocks.spies.skyhook;
      mocks.services.notify.getAnime = mocks.spies.notify;
      mocks.services.jikan.getAnime = mocks.spies.jikan;
      mocks.services.arm.getRelationsByTvdb = mocks.spies.armTvdb;
      mocks.services.thexem.getMappingsByTvdb = mocks.spies.thexem;
      mocks.services.animeThemes.getThemesForAnime = mocks.spies.animeThemes;

      const repository = new SeriesRepository(
        createMockMongoService(collection),
        logger,
        createResolver(logger),
      );

      const result = await repository.invoke({ anilist: 789 });

      assertExists(result);
      assertEquals(result.mediaId.anilist, 789);
      assertSpyCalls(mocks.spies.jikan, 1);
      assertSpyCalls(mocks.spies.tmdb, 1);
    });

    it('should succeed with partial data from subset of services', async () => {
      const armRelationWithMal = {
        anilist: 789,
        myanimelist: 456,
      } as SeriesRelationId;

      mocks.spies.armAnilist = createArmAnilistSpy(async () =>
        armRelationWithMal
      );
      mocks.spies.jikan = createJikanSpy(async () => mockData.jikanAnime);

      mocks.services.arm.getAniListRelationId = mocks.spies.armAnilist;
      mocks.services.jikan.getAnime = mocks.spies.jikan;

      const repository = new SeriesRepository(
        createMockMongoService(collection),
        logger,
        createResolver(logger),
      );

      const result = await repository.invoke({ anilist: 789 });

      assertExists(result);
      assertEquals(result.mediaId.anilist, 789);
      assertEquals(result.mediaId.myanimelist, 456);
    });

    it('should throw error when no services return data', async () => {
      const repository = new SeriesRepository(
        createMockMongoService(collection),
        logger,
        createResolver(logger),
      );

      await assertRejects(
        async () => await repository.invoke({ anilist: 999 }),
        Error,
        'No data available from any upstream service',
      );

      assertSpyCalls(loggerSpies.warn, 1);
    });
  });

  describe('identifier enrichment', () => {
    it('should enrich identifiers through ARM relations', async () => {
      mocks.spies.armAnilist = createArmAnilistSpy(async () =>
        mockData.armRelations[0]
      );
      mocks.spies.jikan = createJikanSpy(async () => mockData.jikanAnime);
      mocks.spies.tmdb = createTmdbSpy(async () => mockData.tmdbShow);
      mocks.spies.skyhook = createSkyhookSpy(async () => mockData.skyhookShow);

      mocks.services.arm.getAniListRelationId = mocks.spies.armAnilist;
      mocks.services.jikan.getAnime = mocks.spies.jikan;
      mocks.services.tmdb.getShow = mocks.spies.tmdb;
      mocks.services.skyhook.getShowByTvdb = mocks.spies.skyhook;

      const repository = new SeriesRepository(
        createMockMongoService(collection),
        logger,
        createResolver(logger),
      );

      const result = await repository.invoke({ anilist: 789 });

      assertExists(result);
      assertSpyCalls(mocks.spies.jikan, 1);
      assertSpyCalls(mocks.spies.tmdb, 1);
      assertSpyCalls(mocks.spies.skyhook, 1);
    });

    it('should merge identifiers from Notify anime', async () => {
      const notifyWithIds: NotifyAnime = {
        id: 'notify-123',
        mediaId: {
          mal: '456',
          anilist: '789',
          tmdb: '9',
          trakt: '42',
          tvdb: '1',
          imdb: 'tt123',
        },
      } as unknown as NotifyAnime;

      mocks.spies.notify = createNotifySpy(async (id) =>
        id === 'notify-123' ? notifyWithIds : undefined
      );
      mocks.spies.jikan = createJikanSpy(async () => mockData.jikanAnime);

      mocks.services.notify.getAnime = mocks.spies.notify;
      mocks.services.jikan.getAnime = mocks.spies.jikan;

      const armRelationWithNotify = createArmRelation({
        anilist: 789,
        notify: 'notify-123',
        myanimelist: 456,
      });
      mocks.spies.armAnilist = createArmAnilistSpy(async () =>
        armRelationWithNotify
      );
      mocks.services.arm.getAniListRelationId = mocks.spies.armAnilist;

      const repository = new SeriesRepository(
        createMockMongoService(collection),
        logger,
        createResolver(logger),
      );

      const result = await repository.invoke({ anilist: 789 });

      assertExists(result);
      assertEquals(result.mediaId.notify, 'notify-123');
      assertSpyCalls(mocks.spies.notify, 1);
    });

    it('should cascade identifier enrichment across multiple services', async () => {
      const armRelation = createArmRelation({
        thetvdb: 1,
        anilist: 1,
        myanimelist: 456,
        notify: 'notify-1',
      });

      mocks.spies.armAnilist = createArmAnilistSpy(async () => armRelation);
      mocks.spies.armTvdb = createArmTvdbSpy(async () => [armRelation]);
      mocks.spies.jikan = createJikanSpy(async () => mockData.jikanAnime);
      mocks.spies.notify = createNotifySpy(async () => mockData.notifyAnime);

      mocks.services.arm.getAniListRelationId = mocks.spies.armAnilist;
      mocks.services.arm.getRelationsByTvdb = mocks.spies.armTvdb;
      mocks.services.jikan.getAnime = mocks.spies.jikan;
      mocks.services.notify.getAnime = mocks.spies.notify;

      const repository = new SeriesRepository(
        createMockMongoService(collection),
        logger,
        createResolver(logger),
      );

      const result = await repository.invoke({ anilist: 1 });

      assertExists(result);
      assertSpyCalls(mocks.spies.armTvdb, 1);
      assertSpyCalls(mocks.spies.notify, 1);
      assertSpyCalls(mocks.spies.jikan, 1);
    });
  });

  describe('ARM relations handling', () => {
    it('should deduplicate ARM relations', async () => {
      const duplicateRelations: SeriesRelationId[] = [
        mockData.armRelations[0],
        mockData.armRelations[0],
        { ...mockData.armRelations[0], themoviedb: 10 },
      ];

      const armRelationWithTvdb = createArmRelation({
        anilist: 789,
        thetvdb: 1,
        myanimelist: 456,
      });

      mocks.spies.armAnilist = createArmAnilistSpy(async () =>
        armRelationWithTvdb
      );
      mocks.spies.armTvdb = createArmTvdbSpy(async () => duplicateRelations);
      mocks.spies.jikan = createJikanSpy(async () => mockData.jikanAnime);

      mocks.services.arm.getAniListRelationId = mocks.spies.armAnilist;
      mocks.services.arm.getRelationsByTvdb = mocks.spies.armTvdb;
      mocks.services.jikan.getAnime = mocks.spies.jikan;

      const repository = new SeriesRepository(
        createMockMongoService(collection),
        logger,
        createResolver(logger),
      );

      const result = await repository.invoke({ anilist: 789 });

      assertExists(result);
      assertSpyCalls(mocks.spies.armTvdb, 2);
    });

    it('should resolve multiple ARM queries (tvdb and anilist)', async () => {
      const armRelationFromTvdb = createArmRelation({
        thetvdb: 1,
        anilist: 789,
        myanimelist: 456,
      });

      const armRelationFromAnilist = createArmRelation({
        anilist: 789,
        myanimelist: 456,
        notify: 'notify-1',
        thetvdb: 1,
      });

      mocks.spies.armTvdb = createArmTvdbSpy(async () => [
        armRelationFromTvdb,
      ]);
      mocks.spies.armAnilist = createArmAnilistSpy(async () =>
        armRelationFromAnilist
      );
      mocks.spies.jikan = createJikanSpy(async () => mockData.jikanAnime);

      mocks.services.arm.getRelationsByTvdb = mocks.spies.armTvdb;
      mocks.services.arm.getAniListRelationId = mocks.spies.armAnilist;
      mocks.services.jikan.getAnime = mocks.spies.jikan;

      const repository = new SeriesRepository(
        createMockMongoService(collection),
        logger,
        createResolver(logger),
      );

      const result = await repository.invoke({ anilist: 789 });

      assertExists(result);
      assertSpyCalls(mocks.spies.armTvdb, 2);
    });
  });

  describe('convergence behavior', () => {
    it('should stop at convergence when no ID changes occur', async () => {
      const armRelationWithMal = createArmRelation({
        anilist: 789,
        myanimelist: 456,
      });

      mocks.spies.armAnilist = createArmAnilistSpy(async () =>
        armRelationWithMal
      );
      mocks.spies.jikan = createJikanSpy(async () => mockData.jikanAnime);

      mocks.services.arm.getAniListRelationId = mocks.spies.armAnilist;
      mocks.services.jikan.getAnime = mocks.spies.jikan;

      const repository = new SeriesRepository(
        createMockMongoService(collection),
        logger,
        createResolver(logger),
      );

      const result = await repository.invoke({ anilist: 789 });

      assertExists(result);
      assertSpyCalls(mocks.spies.jikan, 1);
    });

    it('should iterate maximum 6 times before stopping', async () => {
      let callCount = 0;
      mocks.spies.armAnilist = createArmAnilistSpy(async () => {
        callCount++;
        return createArmRelation({
          anilist: 789,
          myanimelist: 456,
          thetvdb: callCount,
          themoviedb: callCount * 10,
        });
      });
      mocks.spies.jikan = createJikanSpy(async () => mockData.jikanAnime);
      mocks.spies.armTvdb = createArmTvdbSpy(async () => []);

      mocks.services.arm.getAniListRelationId = mocks.spies.armAnilist;
      mocks.services.arm.getRelationsByTvdb = mocks.spies.armTvdb;
      mocks.services.jikan.getAnime = mocks.spies.jikan;

      const repository = new SeriesRepository(
        createMockMongoService(collection),
        logger,
        createResolver(logger),
      );

      const result = await repository.invoke({ anilist: 789 });

      assertExists(result);
      assertSpyCalls(mocks.spies.armAnilist, 6);
      assertSpyCalls(loggerSpies.warn, 1);
    });
  });

  describe('service-specific integrations', () => {
    it('should call TheXem when tvdb ID is available', async () => {
      const armRelationWithTvdb = createArmRelation({
        anilist: 789,
        thetvdb: 1,
        myanimelist: 456,
      });

      mocks.spies.armAnilist = createArmAnilistSpy(async () =>
        armRelationWithTvdb
      );
      mocks.spies.thexem = createTheXemSpy(async () => mockData.thexemRows);
      mocks.spies.jikan = createJikanSpy(async () => mockData.jikanAnime);

      mocks.services.arm.getAniListRelationId = mocks.spies.armAnilist;
      mocks.services.thexem.getMappingsByTvdb = mocks.spies.thexem;
      mocks.services.jikan.getAnime = mocks.spies.jikan;

      const repository = new SeriesRepository(
        createMockMongoService(collection),
        logger,
        createResolver(logger),
      );

      const result = await repository.invoke({ anilist: 789 });

      assertExists(result);
      assertSpyCalls(mocks.spies.thexem, 1);
    });

    it('should not call Trakt without slug or trakt ID', async () => {
      const armRelationWithMal = createArmRelation({
        anilist: 789,
        myanimelist: 456,
      });

      mocks.spies.armAnilist = createArmAnilistSpy(async () =>
        armRelationWithMal
      );
      mocks.spies.trakt = createTraktSpy(async () => mockData.traktShow);
      mocks.spies.jikan = createJikanSpy(async () => mockData.jikanAnime);

      mocks.services.arm.getAniListRelationId = mocks.spies.armAnilist;
      mocks.services.trakt.getShow = mocks.spies.trakt;
      mocks.services.jikan.getAnime = mocks.spies.jikan;

      const repository = new SeriesRepository(
        createMockMongoService(collection),
        logger,
        createResolver(logger),
      );

      const result = await repository.invoke({ anilist: 789 });

      assertExists(result);
      assertSpyCalls(mocks.spies.trakt, 0);
    });
  });

  describe('data transformation', () => {
    it('should validate MediaUnion structure transformation', async () => {
      const armRelationWithMal = createArmRelation({
        anilist: 123,
        myanimelist: 456,
      });

      mocks.spies.armAnilist = createArmAnilistSpy(async () =>
        armRelationWithMal
      );
      mocks.spies.jikan = createJikanSpy(async () => mockData.jikanAnime);

      mocks.services.arm.getAniListRelationId = mocks.spies.armAnilist;
      mocks.services.jikan.getAnime = mocks.spies.jikan;

      const repository = new SeriesRepository(
        createMockMongoService(collection),
        logger,
        createResolver(logger),
      );

      const result = await repository.invoke({ anilist: 123 });

      assertEquals(result.kind, 'ANIME');
      assertExists(result.mediaId);
      assertExists(result.title);
      assertExists(result.updatedAt);
      assertEquals(result.mediaId.anilist, 123);
      assertEquals(result.mediaId.myanimelist, 456);
    });
  });
});
