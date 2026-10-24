import { assertEquals, assertThrows } from '@std/assert';
import { describe, it } from '@std/testing/bdd';
import { SkyhookEpisodeSchema, SkyhookModelSchema } from './skyhook.schema.ts';

const showPayload = (overrides: Record<string, unknown> = {}) => ({
  tvdbId: 1,
  title: 'Example',
  slug: 'example',
  status: 'ended',
  ...overrides,
});

describe('Skyhook schemas', () => {
  it('normalizes finite show dates and keeps v1 defaults and string rating', () => {
    const parsed = SkyhookModelSchema.parse(showPayload({
      firstAired: '1970-01-01T00:00:00Z',
      lastUpdated: new Date('1970-01-01T00:00:00Z'),
      rating: { count: 2, value: '9.5' },
    }));

    assertEquals(parsed.firstAired, 0);
    assertEquals(parsed.lastUpdated, 0);
    assertEquals(parsed.rating, { count: 2, value: '9.5' });
    assertEquals(parsed.malIds, []);
    assertEquals(parsed.aniListIds, []);
    assertEquals(parsed.alternativeTitles, []);
    assertEquals(parsed.episodes, []);
    assertEquals(parsed.seasons, []);
  });

  it('normalizes missing, null, empty, invalid, and invalid Date show dates to null', () => {
    const omitted = SkyhookModelSchema.parse(showPayload());
    assertEquals(omitted.firstAired, null);
    assertEquals(omitted.lastUpdated, null);

    const invalid = SkyhookModelSchema.parse(showPayload({
      firstAired: '',
      lastUpdated: 'not a date',
      lastAired: null,
      alternativeTitles: null,
    }));
    assertEquals(invalid.firstAired, null);
    assertEquals(invalid.lastUpdated, null);
    assertEquals(invalid.lastAired, null);
    assertEquals(invalid.alternativeTitles, null);

    assertThrows(
      () =>
        SkyhookModelSchema.parse(showPayload({
          firstAired: new Date(Number.NaN),
        })),
      Error,
    );
  });

  it('rejects unsupported date primitives and retains valid episode date fallback', () => {
    for (const invalid of [123, true, {}, []]) {
      assertThrows(
        () => SkyhookModelSchema.parse(showPayload({ firstAired: invalid })),
        Error,
      );
      assertThrows(
        () =>
          SkyhookEpisodeSchema.parse({
            tvdbShowId: 1,
            tvdbId: 2,
            seasonNumber: 1,
            episodeNumber: 1,
            airDate: invalid,
          }),
        Error,
      );
    }

    const episode = SkyhookEpisodeSchema.parse({
      tvdbShowId: 1,
      tvdbId: 2,
      seasonNumber: 1,
      episodeNumber: 1,
      airDate: 'invalid',
      airDateUtc: '1970-01-01T00:00:00Z',
    });
    assertEquals(episode.airDate, null);
    assertEquals(episode.airDateUtc, '1970-01-01T00:00:00Z');

    const epochEpisode = SkyhookEpisodeSchema.parse({
      tvdbShowId: 1,
      tvdbId: 2,
      seasonNumber: 1,
      episodeNumber: 1,
      airDate: new Date('1970-01-01T00:00:00Z'),
      airDateUtc: '',
    });
    assertEquals(epochEpisode.airDate, '1970-01-01T00:00:00.000Z');
    assertEquals(epochEpisode.airDateUtc, null);
  });

  it('preserves existing ID-array and rating requiredness', () => {
    assertThrows(
      () => SkyhookModelSchema.parse(showPayload({ malIds: null })),
      Error,
    );
    assertThrows(
      () =>
        SkyhookModelSchema.parse(
          showPayload({ rating: { count: 1, value: 9 } }),
        ),
      Error,
    );
    assertEquals(
      SkyhookModelSchema.parse(showPayload({ malIds: [], aniListIds: [] }))
        .malIds,
      [],
    );
  });
});
