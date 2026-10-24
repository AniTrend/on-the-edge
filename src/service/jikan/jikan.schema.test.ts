import { assertEquals, assertThrows } from '@std/assert';
import { describe, it } from '@std/testing/bdd';
import {
  AnimeEpisodePageSchema,
  AnimeEpisodeSchema,
  AnimeResourceResponseSchema,
  AnimeResourceSchema,
  AnimeStaffPageSchema,
  CharacterResourceResponseSchema,
  CharacterResourceSchema,
  CharacterSearchResponseSchema,
  MalEntityRefSchema,
  MangaResourceSchema,
  PersonResourceSchema,
  PersonSearchResponseSchema,
  ProducerResourceSchema,
  ProducerSearchResponseSchema,
} from './jikan.schema.ts';

const emptyImages = {
  jpg: {},
  webp: {},
};

const emptyPeriod = {
  from: null,
  to: null,
  prop: {
    from: { day: null, month: null, year: null },
    to: { day: null, month: null, year: null },
    string: null,
  },
};

function animePayload(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    mal_id: 1,
    url: 'https://example.test/anime/1',
    approved: true,
    titles: [],
    images: emptyImages,
    title_synonyms: [],
    type: 'TV',
    score: 8.5,
    scored_by: 10,
    rank: 1,
    popularity: 1,
    members: 20,
    favorites: 3,
    source: 'Unlisted source',
    trailer: null,
    episodes: 1,
    status: 'Finished Airing',
    airing: false,
    aired: emptyPeriod,
    duration: null,
    season: null,
    year: null,
    broadcast: {
      day: 'Mondays',
      time: '18:00',
      timezone: 'Asia/Tokyo',
      string: 'Mondays at 18:00 (Asia/Tokyo)',
    },
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
    ...overrides,
  };
}

function mangaPayload(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    mal_id: 2,
    url: 'https://example.test/manga/2',
    approved: true,
    titles: [],
    images: emptyImages,
    title: 'Manga',
    type: 'Manga',
    score: 7,
    scored_by: 1,
    rank: 2,
    popularity: 2,
    members: 4,
    favorites: 0,
    chapters: null,
    volumes: null,
    status: 'Finished',
    publishing: false,
    published: emptyPeriod,
    authors: [],
    serializations: [],
    genres: [],
    explicit_genres: [],
    demographics: [],
    relations: [],
    external: [],
    ...overrides,
  };
}

describe('Jikan resource schemas', () => {
  it('accepts nullable anime classifications and broadcast fields with open strings', () => {
    const parsed = AnimeResourceSchema.parse(animePayload({
      type: null,
      status: null,
      source: null,
      broadcast: { day: null, time: null, timezone: null, string: null },
      studios: [{
        mal_id: 1,
        type: 'new-reference-kind',
        name: 'Studio',
        url: '',
      }],
    }));

    assertEquals(parsed.type as unknown, null);
    assertEquals(parsed.status as unknown, null);
    assertEquals(parsed.source as unknown, null);
    assertEquals(parsed.broadcast as unknown, {
      day: null,
      time: null,
      timezone: null,
      string: null,
    });
    assertEquals(parsed.studios?.[0].type, 'new-reference-kind');
    assertEquals(
      MalEntityRefSchema.parse({
        mal_id: 2,
        type: 'future-kind',
        name: 'Reference',
        url: '',
      }).type,
      'future-kind',
    );

    for (const classification of ['CM', 'PV', 'TV Special']) {
      assertEquals(
        AnimeResourceSchema.parse(animePayload({ type: classification })).type,
        classification,
      );
    }
    assertThrows(
      () => AnimeResourceSchema.parse(animePayload({ type: 'future-type' })),
      Error,
    );
    assertThrows(
      () =>
        AnimeResourceSchema.parse(animePayload({ status: 'future-status' })),
      Error,
    );
    assertThrows(
      () =>
        AnimeResourceSchema.parse(animePayload({
          broadcast: {
            day: 'Mondays-ish',
            time: null,
            timezone: null,
            string: null,
          },
        })),
      Error,
    );
    assertThrows(
      () => AnimeResourceSchema.parse(animePayload({ source: 5 })),
      Error,
    );
  });

  it('does not invent an anime source when it is absent', () => {
    const payload = animePayload();
    delete payload.source;

    assertEquals(
      AnimeResourceSchema.parse(payload).source as unknown,
      undefined,
    );
  });

  it('defaults null or missing counters to zero and rejects non-number JSON values', () => {
    const parsed = AnimeResourceSchema.parse(animePayload({
      score: null,
      scored_by: undefined,
      rank: null,
      popularity: null,
      members: null,
      favorites: null,
    }));

    assertEquals(
      [
        parsed.score,
        parsed.scored_by,
        parsed.rank,
        parsed.popularity,
        parsed.members,
        parsed.favorites,
      ],
      [0, 0, 0, 0, 0, 0],
    );

    for (const invalid of [true, '8.5', [], {}]) {
      assertThrows(
        () => AnimeResourceSchema.parse(animePayload({ score: invalid })),
        Error,
      );
    }
    for (const invalid of [Number.NaN, Number.POSITIVE_INFINITY]) {
      assertThrows(
        () => AnimeResourceSchema.parse(animePayload({ score: invalid })),
        Error,
      );
    }
    assertEquals(
      AnimeResourceSchema.parse(animePayload({ score: 0, favorites: 0 })).score,
      0,
    );
  });

  it('accepts manga OEL, retains themes, and defaults omitted synonyms', () => {
    const parsed = MangaResourceSchema.parse(mangaPayload({
      type: 'OEL',
      themes: [{ mal_id: 3, type: 'manga-theme', name: 'Theme', url: '' }],
    }));

    assertEquals(parsed.type as unknown, 'OEL');
    assertEquals(parsed.title_synonyms, []);
    assertEquals(
      (parsed as unknown as { themes: { name: string }[] }).themes[0].name,
      'Theme',
    );
    assertEquals('source' in parsed, false);
    assertThrows(
      () => MangaResourceSchema.parse(mangaPayload({ title_synonyms: null })),
      Error,
    );
  });

  it('normalizes only valid date strings to finite epoch seconds', () => {
    const episode = AnimeEpisodeSchema.parse({
      mal_id: 1,
      title: 'Episode',
      aired: '1970-01-01T00:00:01.999Z',
      duration: 90,
    });
    const emptyDate = AnimeEpisodeSchema.parse({
      mal_id: 2,
      title: 'Undated',
      aired: '',
    });

    assertEquals(episode.aired as unknown, 1);
    assertEquals(episode.duration, 90);
    assertEquals(emptyDate.aired as unknown, null);
    assertEquals(emptyDate.filler, false);
    assertEquals(emptyDate.recap, false);
    assertThrows(
      () => AnimeEpisodeSchema.parse({ mal_id: 3, title: 'Bad', aired: 0 }),
      Error,
    );
    assertThrows(
      () => AnimeEpisodeSchema.parse({ mal_id: 3, title: 'Bad', filler: null }),
      Error,
    );
    assertThrows(
      () =>
        AnimeEpisodeSchema.parse({ mal_id: 3, title: 'Bad', recap: 'false' }),
      Error,
    );
  });

  it('keeps period dates as strings and turns invalid or empty values into null', () => {
    const parsed = AnimeResourceSchema.parse(animePayload({
      aired: {
        ...emptyPeriod,
        from: 'not-a-date',
        to: '',
      },
    }));

    assertEquals(parsed.aired.from, null);
    assertEquals(parsed.aired.to, null);
    assertThrows(
      () =>
        AnimeResourceSchema.parse(animePayload({
          aired: { ...emptyPeriod, from: 123 },
        })),
      Error,
    );
  });

  it('defaults application truncation flags only when omitted', () => {
    assertEquals(
      AnimeResourceSchema.parse(animePayload({ episodes_truncated: undefined }))
        .episodes_truncated,
      false,
    );
    for (const invalid of [null, 'false', 0]) {
      assertThrows(
        () =>
          AnimeResourceSchema.parse(animePayload({
            episodes_truncated: invalid,
          })),
        Error,
      );
    }
  });

  it('normalizes producer and person date and counter fields', () => {
    const producer = ProducerResourceSchema.parse({
      mal_id: 1,
      url: 'https://example.test/producers/1',
      titles: [],
      images: { jpg: { image_url: null } },
      favorites: null,
      established: 'invalid date',
      about: null,
      count: null,
    });
    const person = PersonResourceSchema.parse({
      mal_id: 2,
      url: 'https://example.test/people/2',
      images: { jpg: { image_url: null } },
      name: 'Person',
      birthday: '1970-01-01T00:00:00Z',
      favorites: null,
    });

    assertEquals(producer.favorites, 0);
    assertEquals(producer.count, 0);
    assertEquals(producer.established as unknown, null);
    assertEquals(person.birthday, 0);
    assertEquals(person.favorites, 0);
    assertThrows(
      () =>
        PersonResourceSchema.parse({
          mal_id: 2,
          url: 'https://example.test/people/2',
          images: { jpg: { image_url: null } },
          name: 'Person',
          birthday: 123,
        }),
      Error,
    );
    assertThrows(
      () =>
        ProducerResourceSchema.parse({
          mal_id: 1,
          url: 'https://example.test/producers/1',
          titles: [],
          images: { jpg: { image_url: null } },
          favorites: '1',
        }),
      Error,
    );
  });

  it('requires response envelopes and array-shaped data while allowing empty arrays', () => {
    assertThrows(() => AnimeResourceResponseSchema.parse({}), Error);
    assertThrows(
      () => AnimeResourceResponseSchema.parse({ data: null }),
      Error,
    );
    assertThrows(
      () => AnimeResourceResponseSchema.parse({ data: {} }),
      Error,
    );
    assertEquals(
      AnimeEpisodePageSchema.parse({
        data: [],
        pagination: { has_next_page: false },
      }).data,
      [],
    );
    assertThrows(
      () =>
        AnimeEpisodePageSchema.parse({ pagination: { has_next_page: false } }),
      Error,
    );
    assertThrows(
      () =>
        AnimeEpisodePageSchema.parse({
          data: null,
          pagination: { has_next_page: false },
        }),
      Error,
    );
    assertEquals(AnimeStaffPageSchema.parse({ data: [] }).data, []);
    assertThrows(() => AnimeStaffPageSchema.parse({}), Error);
    assertEquals(
      ProducerSearchResponseSchema.parse({
        pagination: { has_next_page: false, last_visible_page: 1 },
        data: [],
      }).data,
      [],
    );
    assertThrows(
      () =>
        ProducerSearchResponseSchema.parse({
          pagination: { has_next_page: false, last_visible_page: 1 },
          data: null,
        }),
      Error,
    );
    assertEquals(
      PersonSearchResponseSchema.parse({
        pagination: { has_next_page: false, last_visible_page: 1 },
        data: [],
      }).data,
      [],
    );
    assertThrows(
      () =>
        PersonSearchResponseSchema.parse({
          pagination: { has_next_page: false, last_visible_page: 1 },
        }),
      Error,
    );
    assertEquals(
      CharacterSearchResponseSchema.parse({
        pagination: { has_next_page: false, last_visible_page: 1 },
        data: [],
      }).data,
      [],
    );
    assertThrows(
      () =>
        CharacterSearchResponseSchema.parse({
          pagination: { has_next_page: false, last_visible_page: 1 },
          data: null,
        }),
      Error,
    );
  });

  it('keeps character full-only arrays optional but requires resource identity', () => {
    const character = CharacterResourceSchema.parse({
      mal_id: 1,
      url: 'https://example.test/characters/1',
      images: emptyImages,
      name: 'Character',
      favorites: null,
    });

    assertEquals(character.favorites, 0);
    assertEquals(character.anime as unknown, []);
    assertEquals(character.manga as unknown, []);
    assertEquals(character.voices as unknown, []);
    assertEquals(
      CharacterResourceResponseSchema.parse({ data: character }).data.name,
      'Character',
    );
    assertThrows(
      () => CharacterResourceResponseSchema.parse({ data: { mal_id: 1 } }),
      Error,
    );
    assertThrows(
      () =>
        CharacterResourceSchema.parse({
          mal_id: 1,
          url: 'https://example.test/characters/1',
          images: emptyImages,
          name: 'Character',
          anime: {},
        }),
      Error,
    );
  });
});
