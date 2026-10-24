import { assertEquals } from '@std/assert';
import { describe, it } from '@std/testing/bdd';
import { AnimeResourceSchema } from '@scope/service/jikan';
import {
  NotifyAnimeSchema,
  transform as transformNotify,
} from '@scope/service/notify';
import { SkyhookModelSchema } from '@scope/service/skyhook';
import { MovieSchema, ShowSchema } from '@scope/service/tmdb';
import { ShowModelSchema } from '@scope/service/trakt';
import { seriesTransform } from './series.transformer.ts';

const emptyPeriod = {
  from: null,
  to: null,
  prop: {
    from: { day: null, month: null, year: null },
    to: { day: null, month: null, year: null },
    string: null,
  },
};

const parsedJikanMovie = () =>
  AnimeResourceSchema.parse({
    mal_id: 10,
    url: 'https://example.test/anime/10',
    approved: true,
    titles: [],
    images: { jpg: {}, webp: {} },
    title_synonyms: [],
    type: 'Movie',
    trailer: null,
    status: 'Finished Airing',
    airing: false,
    aired: emptyPeriod,
    broadcast: { day: null, time: null, timezone: null, string: null },
  });

const parsedSkyhook = () =>
  SkyhookModelSchema.parse({
    tvdbId: 20,
    title: 'Example',
    slug: 'example',
    status: 'ended',
  });

const parsedNotifyWithShoboi = (serviceId: string) => {
  const remote = NotifyAnimeSchema.parse({
    id: 'notify-1',
    type: 'tv',
    title: {
      canonical: 'Series',
      romaji: 'Series',
      english: 'Series',
      japanese: 'シリーズ',
      hiragana: 'しりーず',
      synonyms: [],
    },
    summary: 'Summary',
    status: 'finished',
    startDate: '1970-01-01T00:00:00Z',
    endDate: '1970-01-01T00:00:00Z',
    episodeCount: 0,
    episodeLength: 0,
    source: 'original',
    image: {
      extension: '.jpg',
      averageColor: { hue: 0.5, saturation: 0.5, lightness: 0.5 },
    },
    rating: {
      overall: 0,
      story: 0,
      visuals: 0,
      soundtrack: 0,
      count: { overall: 0, story: 0, visuals: 0, soundtrack: 0 },
    },
    mappings: [{ service: 'shoboi/series', serviceId }],
  });

  return transformNotify({ ...remote, episodes: [] });
};

describe('series upstream metadata normalization', () => {
  it('maps only nonempty finite Shoboi IDs and preserves finite zero and decimals', () => {
    const cases = [
      ['0', 0],
      ['-1.25', -1.25],
      ['  42  ', 42],
      ['', null],
      ['   ', null],
      ['not-a-number', null],
      ['Infinity', null],
    ] as const;

    for (const [serviceId, expected] of cases) {
      const media = seriesTransform(
        undefined,
        undefined,
        undefined,
        undefined,
        parsedNotifyWithShoboi(serviceId),
      );
      assertEquals(media.mediaId.shoboi, expected);
    }
  });

  it('normalizes parsed TMDB movie release dates to finite seconds or null', () => {
    const jikanMovie = parsedJikanMovie();
    const movieAtEpoch = MovieSchema.parse({
      id: 101,
      title: 'Movie at epoch',
      release_date: '1970-01-01T00:00:00Z',
      images: {},
    });
    const epochMedia = seriesTransform(
      undefined,
      undefined,
      movieAtEpoch,
      undefined,
      undefined,
      jikanMovie,
    );

    assertEquals(epochMedia.schedule?.firstAirDate, 0);
    assertEquals(epochMedia.schedule?.lastAirDate, 0);

    const invalidMovie = MovieSchema.parse({
      id: 102,
      title: 'Invalid date movie',
      release_date: 'not a date',
      images: {},
    });
    const invalidMedia = seriesTransform(
      undefined,
      undefined,
      invalidMovie,
      undefined,
      undefined,
      jikanMovie,
    );

    assertEquals(invalidMedia.schedule?.firstAirDate, null);
    assertEquals(invalidMedia.schedule?.lastAirDate, null);
  });

  it('normalizes parsed TMDB TV dates and scheduled episode dates', () => {
    const show = ShowSchema.parse({
      id: 201,
      name: 'TV show',
      images: {},
      last_air_date: '1970-01-01T00:00:00Z',
      last_episode_to_air: {
        id: 1,
        name: 'Finale',
        air_date: '1970-01-01T00:00:00Z',
      },
      next_episode_to_air: {
        id: 2,
        name: 'Upcoming',
        air_date: '1970-01-01T00:00:00Z',
      },
    });
    const media = seriesTransform(undefined, parsedSkyhook(), show);

    assertEquals(media.schedule?.firstAirDate, null);
    assertEquals(media.schedule?.lastAirDate, 0);
    assertEquals(media.schedule?.lastAiredEpisode?.id, 1);
    assertEquals(media.schedule?.lastAiredEpisode?.airDate, 0);
    assertEquals(media.schedule?.nextEpisodeToAir?.id, 2);
    assertEquals(media.schedule?.nextEpisodeToAir?.airDate, 0);
  });

  it('consumes Trakt normalized seconds and retains the nullish update fallback', () => {
    const atEpoch = ShowModelSchema.parse({
      title: 'Trakt show',
      ids: { trakt: 20 },
      updated_at: '1970-01-01T00:00:00Z',
    });
    const mediaAtEpoch = seriesTransform(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      atEpoch,
    );
    assertEquals(mediaAtEpoch.updatedAt, 0);

    const withoutUpdate = ShowModelSchema.parse({
      title: 'Trakt show without update',
      ids: { trakt: 21 },
      updated_at: null,
    });
    const mediaWithoutUpdate = seriesTransform(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      withoutUpdate,
    );
    assertEquals(Number.isFinite(mediaWithoutUpdate.updatedAt), true);
  });
});
