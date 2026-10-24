import { assertEquals, assertThrows } from '@std/assert';
import { describe, it } from '@std/testing/bdd';
import {
  EpisodeSchema,
  SeasonSchema,
  ShowModelSchema,
} from './trakt.schema.ts';

const ids = { trakt: 1 };

const showPayload = (overrides: Record<string, unknown> = {}) => ({
  title: 'Show',
  ids,
  ...overrides,
});

const seasonPayload = (overrides: Record<string, unknown> = {}) => ({
  ids,
  ...overrides,
});

const episodePayload = (overrides: Record<string, unknown> = {}) => ({
  ids,
  ...overrides,
});

const showNumericFields = [
  'rating',
  'votes',
  'comment_count',
  'aired_episodes',
] as const;
const seasonNumericFields = [
  'rating',
  'votes',
  'episode_count',
  'aired_episodes',
] as const;
const episodeNumericFields = [
  'rating',
  'votes',
  'number_abs',
  'runtime',
] as const;

describe('Trakt schemas', () => {
  it('normalizes optional show dates and preserves nullable overview', () => {
    const omitted = ShowModelSchema.parse(showPayload({
      overview: undefined,
      first_aired: undefined,
      updated_at: undefined,
      genres: undefined,
      available_translations: undefined,
    }));
    const nulls = ShowModelSchema.parse(showPayload({
      overview: null,
      first_aired: null,
      updated_at: null,
      genres: null,
      available_translations: null,
    }));

    assertEquals(omitted.overview, undefined);
    assertEquals(omitted.first_aired, null);
    assertEquals(omitted.updated_at, null);
    assertEquals(omitted.genres, []);
    assertEquals(omitted.available_translations, []);
    assertEquals(nulls.overview, null);
    assertEquals(nulls.first_aired, null);
    assertEquals(nulls.updated_at, null);
    assertEquals(nulls.genres, []);
    assertEquals(nulls.available_translations, []);

    for (const field of showNumericFields) {
      assertEquals(
        ShowModelSchema.parse(showPayload({ [field]: undefined }))[field],
        0,
      );
      assertEquals(
        ShowModelSchema.parse(showPayload({ [field]: null }))[field],
        0,
      );
    }

    for (const date of ['', 'invalid date']) {
      const parsed = ShowModelSchema.parse(showPayload({
        first_aired: date,
        updated_at: date,
      }));
      assertEquals(parsed.first_aired, null);
      assertEquals(parsed.updated_at, null);
    }
    const epoch = ShowModelSchema.parse(showPayload({
      first_aired: '1970-01-01T00:00:00Z',
      updated_at: '1970-01-01T00:00:00Z',
    }));
    assertEquals(epoch.first_aired, 0);
    assertEquals(epoch.updated_at, 0);
    for (const invalid of [123, true, {}, []]) {
      assertThrows(
        () => ShowModelSchema.parse(showPayload({ first_aired: invalid })),
        Error,
      );
      assertThrows(
        () => ShowModelSchema.parse(showPayload({ updated_at: invalid })),
        Error,
      );
    }
  });

  it('defaults show numeric metadata only for finite numbers, null, or omission', () => {
    const parsed = ShowModelSchema.parse(showPayload({
      rating: null,
      votes: undefined,
      comment_count: null,
      aired_episodes: undefined,
    }));

    assertEquals(
      [
        parsed.rating,
        parsed.votes,
        parsed.comment_count,
        parsed.aired_episodes,
      ],
      [0, 0, 0, 0],
    );
    assertEquals(
      ShowModelSchema.parse(showPayload({ rating: 1.5 })).rating,
      1.5,
    );
    for (const field of showNumericFields) {
      for (const invalid of [true, '8', {}, [], Number.POSITIVE_INFINITY]) {
        assertThrows(
          () => ShowModelSchema.parse(showPayload({ [field]: invalid })),
          Error,
        );
      }
    }
    assertThrows(() => ShowModelSchema.parse({ ids }), Error);
    assertThrows(
      () => ShowModelSchema.parse({ title: 'Show', ids: {} }),
      Error,
    );
  });

  it('normalizes episode dates and default fields without coercion', () => {
    const omitted = EpisodeSchema.parse(episodePayload());
    const nulls = EpisodeSchema.parse(episodePayload({
      first_aired: null,
      updated_at: null,
      number_abs: null,
      runtime: null,
      rating: null,
      votes: null,
    }));

    assertEquals(omitted.first_aired, null);
    assertEquals(omitted.updated_at, null);
    assertEquals(omitted.number_abs, 0);
    assertEquals(omitted.runtime, 0);
    assertEquals(omitted.after_credits, false);
    assertEquals(omitted.during_credits, false);
    assertEquals(nulls.first_aired, null);
    assertEquals(nulls.updated_at, null);
    assertEquals(
      [nulls.number_abs, nulls.runtime, nulls.rating, nulls.votes],
      [0, 0, 0, 0],
    );
    for (const field of ['rating', 'votes'] as const) {
      assertEquals(
        EpisodeSchema.parse(episodePayload({ [field]: undefined }))[field],
        0,
      );
      assertEquals(
        EpisodeSchema.parse(episodePayload({ [field]: null }))[field],
        0,
      );
    }
    for (const field of ['number_abs', 'runtime'] as const) {
      assertEquals(
        EpisodeSchema.parse(episodePayload({ [field]: undefined }))[field],
        0,
      );
      assertEquals(
        EpisodeSchema.parse(episodePayload({ [field]: null }))[field],
        0,
      );
    }
    for (const date of ['', 'invalid date']) {
      const parsed = EpisodeSchema.parse(episodePayload({
        first_aired: date,
        updated_at: date,
      }));
      assertEquals(parsed.first_aired, null);
      assertEquals(parsed.updated_at, null);
    }
    const epoch = EpisodeSchema.parse(episodePayload({
      first_aired: '1970-01-01T00:00:00Z',
      updated_at: '1970-01-01T00:00:00Z',
    }));
    assertEquals(epoch.first_aired, 0);
    assertEquals(epoch.updated_at, 0);
    for (const invalid of [123, false, {}, []]) {
      assertThrows(
        () => EpisodeSchema.parse(episodePayload({ first_aired: invalid })),
        Error,
      );
      assertThrows(
        () => EpisodeSchema.parse(episodePayload({ updated_at: invalid })),
        Error,
      );
    }
    assertThrows(() => EpisodeSchema.parse({}), Error);
    assertThrows(() => EpisodeSchema.parse({ ids: {} }), Error);
    assertThrows(
      () => EpisodeSchema.parse(episodePayload({ after_credits: 'true' })),
      Error,
    );
  });

  it('allows omitted season first date but rejects explicit null', () => {
    const omitted = SeasonSchema.parse(seasonPayload({
      first_aired: undefined,
      updated_at: undefined,
    }));
    assertEquals(omitted.first_aired, null);
    assertEquals(omitted.updated_at, null);
    assertEquals(omitted.episodes, []);

    for (const field of seasonNumericFields) {
      assertEquals(
        SeasonSchema.parse(seasonPayload({ [field]: undefined }))[field],
        0,
      );
      assertEquals(
        SeasonSchema.parse(seasonPayload({ [field]: null }))[field],
        0,
      );
    }

    assertThrows(
      () => SeasonSchema.parse(seasonPayload({ first_aired: null })),
      Error,
    );
    const nullUpdated = SeasonSchema.parse(seasonPayload({
      first_aired: '1970-01-01T00:00:00Z',
      updated_at: null,
    }));
    assertEquals(nullUpdated.first_aired, 0);
    assertEquals(nullUpdated.updated_at, null);

    for (const date of ['', 'invalid date']) {
      const parsed = SeasonSchema.parse(seasonPayload({
        first_aired: date,
        updated_at: date,
      }));
      assertEquals(parsed.first_aired, null);
      assertEquals(parsed.updated_at, null);
    }
    for (const invalid of [123, true, {}, []]) {
      assertThrows(
        () => SeasonSchema.parse(seasonPayload({ first_aired: invalid })),
        Error,
      );
      assertThrows(
        () => SeasonSchema.parse(seasonPayload({ updated_at: invalid })),
        Error,
      );
    }
    assertThrows(() => SeasonSchema.parse({ ids: {} }), Error);
  });

  it('keeps nested extended episodes and finite zero-default season fields', () => {
    const season = SeasonSchema.parse(seasonPayload({
      episode_count: null,
      aired_episodes: undefined,
      rating: null,
      votes: undefined,
      episodes: [episodePayload({ number: 1, title: 'Pilot' })],
    }));

    assertEquals(
      [
        season.episode_count,
        season.aired_episodes,
        season.rating,
        season.votes,
      ],
      [0, 0, 0, 0],
    );
    assertEquals(season.episodes?.[0]?.number, 1);
    for (const field of seasonNumericFields) {
      for (const invalid of [true, '2', {}, [], Number.POSITIVE_INFINITY]) {
        assertThrows(
          () => SeasonSchema.parse(seasonPayload({ [field]: invalid })),
          Error,
        );
      }
    }
    for (const field of episodeNumericFields) {
      for (const invalid of [true, '2', {}, [], Number.POSITIVE_INFINITY]) {
        assertThrows(
          () => EpisodeSchema.parse(episodePayload({ [field]: invalid })),
          Error,
        );
      }
    }
  });
});
