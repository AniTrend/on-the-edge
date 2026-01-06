import { describe, it } from '@std/testing/bdd';
import { assertEquals, assertRejects } from '@std/assert';
import { assertSpyCall, spy } from '@std/testing/mock';
import { BadRequestException, InternalServerErrorException } from '@danet/core';
import { ObjectId } from 'mongodb';
import { SeriesService } from './series.service.ts';
import { SeriesRepository } from './repository/index.ts';
import { createMockLogger } from '@scope/common/testing';
import { toInstant } from '@scope/common/utils';

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

    const mockDocument = {
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
      themeSongs: [],
      trailers: [],
      schedule: null,
    };

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

  it('throws NotFoundException when repository throws "No data available"', async () => {
    const { logger, spies } = createMockLogger();

    const expectedError = new Error(
      'No data available from any upstream service',
    );
    const invokeSpy = spy(async () => {
      throw expectedError;
    });
    const repository = { invoke: invokeSpy } as unknown as SeriesRepository;

    const service = new SeriesService(repository, logger);

    await assertRejects(
      () => service.aggregate({ anilist: 789 }),
      InternalServerErrorException,
    );

    // Assert logger.error was called with query and the exception
    assertSpyCall(spies.error, 0, {
      args: [
        'Failed to aggregate series',
        { query: { anilist: 789 }, cause: expectedError },
      ],
    });
  });

  it('propagates other errors from repository', async () => {
    const { logger, spies } = createMockLogger();

    const customError = new Error('Database connection failed');
    const invokeSpy = spy(async () => {
      throw customError;
    });
    const repository = { invoke: invokeSpy } as unknown as SeriesRepository;

    const service = new SeriesService(repository, logger);

    await assertRejects(
      () => service.aggregate({ anilist: 789 }),
      Error,
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
