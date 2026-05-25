import { describe, it } from '@std/testing/bdd';
import { assertEquals, assertRejects } from '@std/assert';
import { assertSpyCall, spy } from '@std/testing/mock';
import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@danet/core';
import { ObjectId } from 'mongodb';
import { SeriesService } from './series.service.ts';
import { SeriesRepository } from './repository/index.ts';
import { SeriesNotFoundError } from './repository/index.ts';
import { createMockLogger } from '@scope/common/testing';
import { toInstant } from '@scope/common/utils';

const createSeriesDocument = (
  overrides: Partial<Record<string, unknown>> = {},
) => ({
  _id: new ObjectId(),
  kind: 'ANIME',
  classification: 'TV',
  seriesKey: 'anilist:789',
  mediaId: {
    anidb: null,
    anilist: 789,
    animePlanet: null,
    anisearch: null,
    imdb: 'tt123',
    kitsu: null,
    livechart: null,
    notify: 'notify-1',
    themoviedb: 9,
    tvdb: 1,
    myanimelist: 456,
    tvMazeId: null,
    tvrage: null,
    slug: 'series',
    shoboi: null,
    trakt: 42,
  },
  cover: {},
  banner: null,
  fanart: null,
  format: null,
  status: null,
  source: null,
  title: {
    english: null,
    canonical: null,
    harigana: null,
    japanese: null,
    romaji: null,
    synonyms: null,
  },
  ageRating: null,
  images: [],
  description: null,
  updatedAt: toInstant(new Date()),
  moreInfo: null,
  duration: null,
  networks: [],
  animethemes: [],
  trailers: [],
  schedule: null,
  ...overrides,
});

describe('SeriesService', () => {
  it('throws BadRequestException when query is empty', async () => {
    const { logger } = createMockLogger();
    const repository = {} as SeriesRepository;
    const service = new SeriesService(repository, logger);

    await assertRejects(
      () => service.aggregate({}),
      BadRequestException,
    );
  });

  it('throws BadRequestException when anilist ID is missing', async () => {
    const { logger } = createMockLogger();
    const repository = {} as SeriesRepository;
    const service = new SeriesService(repository, logger);

    await assertRejects(
      () => service.aggregate({ tvdb: 1 }),
      BadRequestException,
    );
  });

  it('delegates to repository.invoke() with anilist ID', async () => {
    const { logger } = createMockLogger();

    const mockDocument = createSeriesDocument();

    const invokeSpy = spy(async () => mockDocument);
    const repository = { invoke: invokeSpy } as unknown as SeriesRepository;

    const service = new SeriesService(repository, logger);
    const response = await service.aggregate({ anilist: 789 });

    // Verify repository was called with correct params
    assertEquals(invokeSpy.calls.length, 1);
    assertEquals((invokeSpy.calls[0] as { args: unknown[] }).args[0], {
      anilist: 789,
    });

    // Verify transformation to SeriesResponse
    assertEquals(response.mediaId.anilist, 789);
    assertEquals(response.mediaId.trakt, 42);
    assertEquals(response.mediaId.slug, 'series');
    assertEquals(response.mediaId.tvdb, 1);
    assertEquals(response.mediaId.themoviedb, 9);
    assertEquals(response.mediaId.imdb, 'tt123');
    assertEquals(response.mediaId.notify, 'notify-1');
    assertEquals(response.mediaId.myanimelist, 456);
  });

  it('filters response images using the provided locale after repository retrieval', async () => {
    const { logger } = createMockLogger();

    const mockDocument = createSeriesDocument({
      images: [
        {
          type: 'POSTER',
          locale: 'jp',
          url: 'poster-jp',
          width: 1000,
          height: 1500,
        },
        {
          type: 'POSTER',
          locale: 'en',
          url: 'poster-en',
          width: 900,
          height: 1350,
        },
        {
          type: 'BACKDROP',
          locale: 'jp',
          url: 'backdrop-jp',
          width: 1920,
          height: 1080,
        },
        {
          type: 'BACKDROP',
          locale: 'en',
          url: 'backdrop-en',
          width: 1920,
          height: 1080,
        },
      ],
    });
    const invokeSpy = spy(async () => mockDocument);
    const repository = { invoke: invokeSpy } as unknown as SeriesRepository;

    const service = new SeriesService(repository, logger);
    const response = await service.aggregate({ anilist: 789 }, 'en-US');

    assertEquals(response.images.map(({ url }) => url), [
      'poster-jp',
      'poster-en',
      'backdrop-jp',
      'backdrop-en',
    ]);
  });

  it('does not mutate repository-returned document images when filtering the response', async () => {
    const { logger } = createMockLogger();

    const mockDocument = createSeriesDocument({
      images: [
        {
          type: 'POSTER',
          locale: 'jp',
          url: 'poster-jp',
          width: 1000,
          height: 1500,
        },
        {
          type: 'POSTER',
          locale: null,
          url: 'poster-universal',
          width: 1000,
          height: 1500,
        },
      ],
    });
    const originalImages = structuredClone(mockDocument.images);
    const invokeSpy = spy(async () => mockDocument);
    const repository = { invoke: invokeSpy } as unknown as SeriesRepository;

    const service = new SeriesService(repository, logger);
    await service.aggregate({ anilist: 789 }, 'en-US');

    assertEquals(mockDocument.images, originalImages);
  });

  it('falls back to jp and then the best available images when locale is missing', async () => {
    const { logger } = createMockLogger();

    const mockDocument = createSeriesDocument({
      images: [
        {
          type: 'POSTER',
          locale: 'jp',
          url: 'poster-jp',
          width: 1000,
          height: 1500,
        },
        {
          type: 'POSTER',
          locale: 'fr',
          url: 'poster-fr-large',
          width: 1200,
          height: 1800,
        },
        {
          type: 'POSTER',
          locale: 'es',
          url: 'poster-es-small',
          width: 800,
          height: 1200,
        },
      ],
    });
    const invokeSpy = spy(async () => mockDocument);
    const repository = { invoke: invokeSpy } as unknown as SeriesRepository;

    const service = new SeriesService(repository, logger);
    const response = await service.aggregate({ anilist: 789 });

    assertEquals(response.images.map(({ url }) => url), [
      'poster-jp',
      'poster-fr-large',
    ]);
  });

  it('throws NotFoundException when repository throws "No data available"', async () => {
    const { logger } = createMockLogger();

    const expectedError = new SeriesNotFoundError();
    const invokeSpy = spy(async () => {
      throw expectedError;
    });
    const repository = { invoke: invokeSpy } as unknown as SeriesRepository;

    const service = new SeriesService(repository, logger);

    await assertRejects(
      () => service.aggregate({ anilist: 789 }),
      NotFoundException,
    );
  });

  it('wraps unexpected repository errors in InternalServerErrorException', async () => {
    const { logger, spies } = createMockLogger();

    const customError = new Error('Database connection failed');
    const invokeSpy = spy(async () => {
      throw customError;
    });
    const repository = { invoke: invokeSpy } as unknown as SeriesRepository;

    const service = new SeriesService(repository, logger);

    await assertRejects(
      () => service.aggregate({ anilist: 789 }),
      InternalServerErrorException,
      '500 - Internal server error',
    );

    // Assert logger.error was called with query and the exception
    assertSpyCall(spies.error, 0, {
      args: [
        'Failed to aggregate series',
        { query: { anilist: 789 }, cause: customError },
      ],
    });
  });
});
