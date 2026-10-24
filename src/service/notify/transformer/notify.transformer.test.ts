import { assertEquals, assertThrows } from '@std/assert';
import { describe, it } from '@std/testing/bdd';
import { NotifyAnimeSchema, NotifyEpisodeSchema } from '../notify.schema.ts';
import { transform } from './notify.transformer.ts';
import { Format, Source, Status } from './enums.ts';

const animePayload = (overrides: Record<string, unknown> = {}) => ({
  id: 'notify-1',
  type: 'tv',
  title: {
    canonical: 'Series',
    romaji: 'Series',
    english: 'Series',
    japanese: 'シリーズ',
    hiragana: 'しりーず',
    synonyms: ['Alias'],
  },
  summary: 'Summary',
  status: 'finished',
  genres: ['Action'],
  startDate: '1970-01-01T00:00:00Z',
  endDate: '2024-06-01T00:00:00Z',
  episodeCount: 1,
  episodeLength: 24,
  source: 'manga',
  image: {
    extension: '.jpg',
    averageColor: { hue: 0.5, saturation: 0.5, lightness: 0.5 },
  },
  rating: {
    overall: 10,
    story: 9,
    visuals: 8,
    soundtrack: 7,
    count: { overall: 1, story: 1, visuals: 1, soundtrack: 1 },
  },
  mappings: [{ service: 'anilist/series', serviceId: '1' }],
  trailers: [{ service: 'youtube', serviceId: 'abc' }],
  ...overrides,
});

describe('Notify transformer', () => {
  it('converts normalized HSL colors', () => {
    const remote = NotifyAnimeSchema.parse(animePayload());
    const result = transform({ ...remote, episodes: [] });

    assertEquals(result.poster.color, '#40bfbf');
    const colors = [
      [{ hue: 0, saturation: 1, lightness: 0.5 }, '#ff0000'],
      [{ hue: 1 / 3, saturation: 1, lightness: 0.5 }, '#00ff00'],
      [{ hue: 2 / 3, saturation: 1, lightness: 0.5 }, '#0000ff'],
    ] as const;
    for (const [averageColor, expected] of colors) {
      const coloredRemote = NotifyAnimeSchema.parse(animePayload({
        image: { extension: '.jpg', averageColor },
      }));
      assertEquals(
        transform({ ...coloredRemote, episodes: [] }).poster.color,
        expected,
      );
    }

    for (const field of ['hue', 'saturation', 'lightness'] as const) {
      for (const invalid of [Number.NaN, Number.POSITIVE_INFINITY]) {
        assertThrows(
          () =>
            NotifyAnimeSchema.parse(animePayload({
              image: {
                extension: '.jpg',
                averageColor: {
                  hue: 0.5,
                  saturation: 0.5,
                  lightness: 0.5,
                  [field]: invalid,
                },
              },
            })),
          Error,
        );
      }
    }
  });

  it('preserves mappings, enums, and valid dates', () => {
    const remote = NotifyAnimeSchema.parse(animePayload());
    const result = transform({ ...remote, episodes: [] });

    assertEquals(result.mediaId.anilist, '1');
    assertEquals(result.format, Format.TV);
    assertEquals(result.source, Source.MANGA);
    assertEquals(result.status, Status.FINISHED);
    assertEquals(result.trailers[0]?.site, 'youtube');
    assertEquals(result.startDate, 0);
    assertEquals(
      result.endDate,
      new Date('2024-06-01T00:00:00Z').getTime() / 1000,
    );
  });

  it('normalizes empty and invalid anime dates without weakening raw requiredness', () => {
    const remote = NotifyAnimeSchema.parse(animePayload({
      startDate: '',
      endDate: 'invalid',
    }));
    const result = transform({ ...remote, episodes: [] });

    assertEquals(result.startDate, null);
    assertEquals(result.endDate, null);
    assertThrows(
      () => NotifyAnimeSchema.parse(animePayload({ startDate: undefined })),
      Error,
    );
    assertThrows(
      () => NotifyAnimeSchema.parse(animePayload({ endDate: null })),
      Error,
    );
  });

  it('normalizes episode dates to finite optional seconds', () => {
    const remote = NotifyAnimeSchema.parse(animePayload());
    const epochEpisode = NotifyEpisodeSchema.parse({
      id: 'episode-1',
      animeId: 'notify-1',
      number: 1,
      title: { english: 'Episode', romaji: '', japanese: '' },
      airingDate: {
        start: '1970-01-01T00:00:00Z',
        end: '2024-06-01T00:00:00Z',
      },
    });
    const invalidEpisode = NotifyEpisodeSchema.parse({
      id: 'episode-2',
      animeId: 'notify-1',
      number: 2,
      title: { english: '', romaji: 'Two', japanese: '' },
      airingDate: { start: '', end: 'not a date' },
    });
    const result = transform({
      ...remote,
      episodes: [epochEpisode, invalidEpisode],
    });

    assertEquals(result.episodes[0]?.startAirDate, 0);
    assertEquals(
      result.episodes[0]?.endAirDate,
      new Date('2024-06-01T00:00:00Z').getTime() / 1000,
    );
    assertEquals(result.episodes[1]?.startAirDate, undefined);
    assertEquals(result.episodes[1]?.endAirDate, undefined);
  });
});
