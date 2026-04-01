import { describe, it } from '@std/testing/bdd';
import { assertEquals } from '@std/assert';
import { InMemoryCollection } from '@scope/database/testing';
import { buildSeriesKey, load, persist } from './helpers/index.ts';
import type { SeriesDocument } from './series.document.ts';
import type { MediaUnion } from '../series.types.ts';

describe('SeriesRepository helpers', () => {
  it('buildSeriesKey generates correct format', () => {
    const key = buildSeriesKey({ anilist: 12345 });
    assertEquals(key, 'anilist:12345');
  });

  it('load returns null for missing document', async () => {
    const collection = new InMemoryCollection<SeriesDocument>();
    const result = await load(collection, 'anilist:99999');
    assertEquals(result, null);
  });

  // TODO: Re-enable once Temporal cache TTL test behavior is fixed
  it.skip('persist and load round-trip', async () => {
    const collection = new InMemoryCollection<SeriesDocument>();
    const anilist = 12345;
    const seriesKey = buildSeriesKey({ anilist });

    const testSeries: MediaUnion = {
      kind: 'ANIME',
      classification: 'TV',
      mediaId: {
        anidb: null,
        anilist,
        animePlanet: null,
        anisearch: null,
        imdb: null,
        kitsu: null,
        livechart: null,
        notify: null,
        themoviedb: null,
        tvdb: null,
        myanimelist: null,
        tvMazeId: null,
        tvrage: null,
        slug: null,
        shoboi: null,
        trakt: null,
      },
      cover: {},
      banner: null,
      fanart: null,
      format: null,
      status: null,
      source: null,
      title: {
        english: 'Test Series',
        canonical: 'Test Series',
        harigana: null,
        japanese: null,
        romaji: 'Test Series',
        synonyms: null,
      },
      ageRating: null,
      images: [],
      description: 'A test series',
      updatedAt: Math.floor(Date.now() / 1000),
      moreInfo: null,
      duration: 24,
      networks: [],
      themeSongs: [],
      trailers: [],
      schedule: null,
    };

    await persist(collection, seriesKey, testSeries);

    const loaded = await load(collection, seriesKey);
    assertEquals(loaded !== null, true, 'Document should be loaded from cache');
    assertEquals(loaded?.mediaId.anilist, anilist);
    assertEquals(loaded?.title.english, 'Test Series');
  });

  // TODO: Re-enable once Temporal cache TTL test behavior is fixed
  it.skip('load returns null for stale document (48h+ old)', async () => {
    const collection = new InMemoryCollection<SeriesDocument>();
    const anilist = 54321;
    const seriesKey = buildSeriesKey({ anilist });

    // Create document with old timestamp (50 hours ago)
    const fiftyHoursAgo = Math.floor(Date.now() / 1000) - (50 * 3600);
    const staleDoc: SeriesDocument = {
      kind: 'ANIME',
      classification: 'TV',
      seriesKey,
      mediaId: {
        anidb: null,
        anilist,
        animePlanet: null,
        anisearch: null,
        imdb: null,
        kitsu: null,
        livechart: null,
        notify: null,
        themoviedb: null,
        tvdb: null,
        myanimelist: null,
        tvMazeId: null,
        tvrage: null,
        slug: null,
        shoboi: null,
        trakt: null,
      },
      cover: {},
      banner: null,
      fanart: null,
      format: null,
      status: null,
      source: null,
      title: {
        english: 'Old Series',
        canonical: 'Old Series',
        harigana: null,
        japanese: null,
        romaji: 'Old Series',
        synonyms: null,
      },
      ageRating: null,
      images: [],
      description: null,
      updatedAt: fiftyHoursAgo, // Stale: 50 hours old
      moreInfo: null,
      duration: null,
      networks: [],
      themes: [],
      themeSongs: [],
      trailers: [],
      schedule: null,
    };

    await collection.findOneAndReplace(
      { _id: seriesKey } as never,
      staleDoc,
      { upsert: true },
    );

    const loaded = await load(collection, seriesKey);
    assertEquals(loaded, null); // Should be null due to TTL expiration
  });
});
