import { z } from 'zod';
import { classifyEpisodeKind } from './episode-utils.ts';

const finiteNumberSchema = z.number().finite();
const zeroDefaultNumberSchema = finiteNumberSchema.nullish().transform((
  value,
) => value ?? 0);

const toEpochSeconds = (value: string | null | undefined): number | null => {
  if (value == null || value.length === 0) return null;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) ? Math.floor(milliseconds / 1000) : null;
};

const toValidDateString = (value: string | null | undefined): string | null => {
  if (value == null || value.length === 0) return null;
  return Number.isFinite(Date.parse(value)) ? value : null;
};

const EpochSecondsDateSchema = z.string().nullish().transform(toEpochSeconds);
const PeriodDateSchema = z.string().nullish().transform(toValidDateString);

// Hoisted enum schemas
export const TitleTypeSchema = z.enum([
  'Default',
  'English',
  'Japanese',
  'Synonym',
  'German',
  'Spanish',
  'French',
  'Italian',
  'Korean',
  'Chinese',
]);

export const MalEntityTypeSchema = z.string();

export const BroadcastDaySchema = z.enum([
  'Mondays',
  'Tuesdays',
  'Wednesdays',
  'Thursdays',
  'Fridays',
  'Saturdays',
  'Sundays',
]);

export const MediaSourceSchema = z.string();

export const AnimeTypeSchema = z.enum([
  'TV',
  'Movie',
  'OVA',
  'Special',
  'ONA',
  'Music',
  'CM',
  'PV',
  'TV Special',
]);

export const AnimeStatusSchema = z.enum([
  'Finished Airing',
  'Currently Airing',
  'Not yet aired',
]);

export const SeasonSchema = z.enum(['winter', 'spring', 'summer', 'fall']);

export const MangaTypeSchema = z.enum([
  'Manga',
  'Novel',
  'Light Novel',
  'OEL',
  'One-shot',
  'Doujinshi',
  'Manhwa',
  'Manhua',
]);

export const MangaStatusSchema = z.enum([
  'Finished',
  'Publishing',
  'On Hiatus',
  'Discontinued',
  'Not yet published',
]);

// Schema definitions
export const TitleVariantSchema = z.object({
  type: TitleTypeSchema,
  title: z.string().nullish(),
});

export const ImageVariantSchema = z.object({
  image_url: z.string().nullish(),
  small_image_url: z.string().nullish(),
  large_image_url: z.string().nullish(),
});

export const ImagesSchema = z.object({
  jpg: ImageVariantSchema,
  webp: ImageVariantSchema,
});

const DateComponentSchema = z.object({
  day: finiteNumberSchema.nullish(),
  month: finiteNumberSchema.nullish(),
  year: finiteNumberSchema.nullish(),
});

export const PeriodSchema = z.object({
  from: PeriodDateSchema,
  to: PeriodDateSchema,
  prop: z.object({
    from: DateComponentSchema,
    to: DateComponentSchema,
    string: z.string().nullish(),
  }),
});

export const ExternalLinkSchema = z.object({
  name: z.string(),
  url: z.string().url(),
});

export const MalEntityRefSchema = z.object({
  mal_id: finiteNumberSchema,
  type: MalEntityTypeSchema,
  name: z.string(),
  url: z.string(),
});

export const AnimeEpisodeSchema = z.object({
  mal_id: finiteNumberSchema,
  url: z.string().nullish(),
  title: z.string(),
  title_japanese: z.string().nullish(),
  title_romanji: z.string().nullish(),
  duration: finiteNumberSchema.nullish(),
  aired: EpochSecondsDateSchema,
  score: finiteNumberSchema.nullish(),
  filler: z.boolean().default(false),
  recap: z.boolean().default(false),
  synopsis: z.string().nullish(),
}).transform((ep) => ({
  ...ep,
  kind: classifyEpisodeKind(ep),
}));

export const MalRelationSchema = z.object({
  relation: z.string(),
  entry: z.array(MalEntityRefSchema),
});

export const AnimeThemeSchema = z.object({
  openings: z.array(z.string()).nullish().default([]),
  endings: z.array(z.string()).nullish().default([]),
});

const MalBroadcastSchema = z.object({
  day: BroadcastDaySchema.nullable(),
  time: z.string().nullable(),
  timezone: z.string().nullable(),
  string: z.string().nullable(),
});

const AnyRecordSchema = z.object({});

// Staff entry for GET /v4/anime/{id}/staff (defined before AnimeResourceSchema for forward-reference use)
export const AnimeStaffPersonSchema = z.object({
  mal_id: finiteNumberSchema,
  url: z.string(),
  images: z.object({
    jpg: z.object({ image_url: z.string().nullish() }),
  }),
  name: z.string(),
});

export const AnimeStaffEntrySchema = z.object({
  person: AnimeStaffPersonSchema,
  positions: z.array(z.string()).nullish().default([]),
});

export const MalResourceBaseSchema = z.object({
  mal_id: finiteNumberSchema,
  url: z.string(),
  approved: z.boolean(),
  titles: z.array(TitleVariantSchema),
  images: ImagesSchema,
  title: z.string().nullish(),
  title_english: z.string().nullish(),
  title_japanese: z.string().nullish(),
  title_synonyms: z.array(z.string()),
  score: zeroDefaultNumberSchema,
  scored_by: zeroDefaultNumberSchema,
  rank: zeroDefaultNumberSchema,
  popularity: zeroDefaultNumberSchema,
  members: zeroDefaultNumberSchema,
  favorites: zeroDefaultNumberSchema,
  synopsis: z.string().nullish(),
  background: z.string().nullish(),
  rating: z.string().nullish(),
  moreinfo: z.string().nullish(),
});

export const AnimeResourceSchema = MalResourceBaseSchema.extend({
  source: MediaSourceSchema.nullish(),
  type: AnimeTypeSchema.nullable(),
  trailer: AnyRecordSchema.nullish(),
  episodes: finiteNumberSchema.nullish(),
  status: AnimeStatusSchema.nullable(),
  airing: z.boolean(),
  aired: PeriodSchema,
  duration: z.string().nullish(),
  season: SeasonSchema.nullish(),
  year: finiteNumberSchema.nullish(),
  broadcast: MalBroadcastSchema,
  producers: z.array(MalEntityRefSchema).nullish().default([]),
  licensors: z.array(MalEntityRefSchema).nullish().default([]),
  studios: z.array(MalEntityRefSchema).nullish().default([]),
  genres: z.array(MalEntityRefSchema).nullish().default([]),
  explicit_genres: z.array(MalEntityRefSchema).nullish().default([]),
  themes: z.array(MalEntityRefSchema).nullish().default([]),
  demographics: z.array(MalEntityRefSchema).nullish().default([]),
  relations: z.array(MalRelationSchema).nullish().default([]),
  theme: AnimeThemeSchema.nullish(),
  external: z.array(ExternalLinkSchema).nullish().default([]),
  streaming: z.array(ExternalLinkSchema).nullish().default([]),
  // Application-specific extensions (not in official API)
  episodes_list: z.array(AnimeEpisodeSchema).nullish().default([]),
  episodes_truncated: z.boolean().default(false),
});

export const MangaResourceSchema = MalResourceBaseSchema.extend({
  title_synonyms: z.array(z.string()).default([]),
  type: MangaTypeSchema,
  chapters: finiteNumberSchema.nullish(),
  volumes: finiteNumberSchema.nullish(),
  status: MangaStatusSchema,
  publishing: z.boolean(),
  published: PeriodSchema,
  authors: z.array(MalEntityRefSchema).nullish().default([]),
  serializations: z.array(MalEntityRefSchema).nullish().default([]),
  genres: z.array(MalEntityRefSchema).nullish().default([]),
  themes: z.array(MalEntityRefSchema).nullish().default([]),
  explicit_genres: z.array(MalEntityRefSchema).nullish().default([]),
  demographics: z.array(MalEntityRefSchema).nullish().default([]),
  relations: z.array(MalRelationSchema).nullish().default([]),
  external: z.array(ExternalLinkSchema).nullish().default([]),
});

export const AnimeEpisodePageSchema = z.object({
  data: z.array(AnimeEpisodeSchema),
  pagination: z.object({
    has_next_page: z.boolean(),
  }),
});

export const MoreInfoResponseSchema = z.object({
  data: z.object({
    moreinfo: z.string().nullish(),
  }),
});

export const AnimeResourceResponseSchema = z.object({
  data: AnimeResourceSchema,
});

export const MangaResourceResponseSchema = z.object({
  data: MangaResourceSchema,
});

// Staff page response for GET /v4/anime/{id}/staff
export const AnimeStaffPageSchema = z.object({
  data: z.array(AnimeStaffEntrySchema),
});

// Producer/studio resource returned by GET /v4/producers/{id} and search
export const ProducerResourceSchema = z.object({
  mal_id: finiteNumberSchema,
  url: z.string(),
  titles: z.array(TitleVariantSchema),
  images: z.object({
    jpg: z.object({ image_url: z.string().nullish() }),
  }),
  favorites: zeroDefaultNumberSchema,
  established: EpochSecondsDateSchema,
  about: z.string().nullish(),
  count: zeroDefaultNumberSchema,
});

export const ProducerResourceResponseSchema = z.object({
  data: ProducerResourceSchema,
});

export const ProducerSearchPaginationSchema = z.object({
  has_next_page: z.boolean(),
  last_visible_page: finiteNumberSchema,
});

export const ProducerSearchResponseSchema = z.object({
  pagination: ProducerSearchPaginationSchema,
  data: z.array(ProducerResourceSchema),
});

// Person/staff resource returned by GET /v4/people/{id} and search
export const PersonImagesSchema = z.object({
  jpg: z.object({ image_url: z.string().nullish() }),
});

const CharacterImageVariantSchema = z.object({
  image_url: z.string().nullish().default(null),
  small_image_url: z.string().nullish().default(null),
  large_image_url: z.string().nullish().default(null),
});

export const CharacterImagesSchema = z.object({
  jpg: CharacterImageVariantSchema,
  webp: CharacterImageVariantSchema,
});

const CharacterMediaPreviewSchema = z.object({
  mal_id: finiteNumberSchema,
  url: z.string(),
  images: CharacterImagesSchema,
  title: z.string(),
});

const CharacterVoicePersonSchema = z.object({
  mal_id: finiteNumberSchema,
  url: z.string(),
  images: PersonImagesSchema,
  name: z.string(),
});

export const CharacterAnimeRelationSchema = z.object({
  role: z.string().nullish(),
  anime: CharacterMediaPreviewSchema,
});

export const CharacterMangaRelationSchema = z.object({
  role: z.string().nullish(),
  manga: CharacterMediaPreviewSchema,
});

export const CharacterVoiceSchema = z.object({
  person: CharacterVoicePersonSchema,
  language: z.string().nullish(),
});

export const PersonResourceSchema = z.object({
  mal_id: finiteNumberSchema,
  url: z.string(),
  website_url: z.string().nullish(),
  images: PersonImagesSchema,
  name: z.string(),
  given_name: z.string().nullish(),
  family_name: z.string().nullish(),
  alternate_names: z.array(z.string()).nullish().default([]),
  birthday: EpochSecondsDateSchema,
  favorites: zeroDefaultNumberSchema,
  about: z.string().nullish(),
});

export const PersonResourceResponseSchema = z.object({
  data: PersonResourceSchema,
});

export const PersonSearchPaginationSchema = z.object({
  has_next_page: z.boolean(),
  last_visible_page: finiteNumberSchema,
});

export const PersonSearchResponseSchema = z.object({
  pagination: PersonSearchPaginationSchema,
  data: z.array(PersonResourceSchema),
});

// Character resource returned by GET /v4/characters/{id}/full and search
export const CharacterResourceSchema = z.object({
  mal_id: finiteNumberSchema,
  url: z.string(),
  images: CharacterImagesSchema,
  name: z.string(),
  name_kanji: z.string().nullish(),
  nicknames: z.array(z.string()).nullish().default([]),
  favorites: zeroDefaultNumberSchema,
  about: z.string().nullish(),
  anime: z.array(CharacterAnimeRelationSchema).nullish().default([]),
  manga: z.array(CharacterMangaRelationSchema).nullish().default([]),
  voices: z.array(CharacterVoiceSchema).nullish().default([]),
});

export const CharacterResourceResponseSchema = z.object({
  data: CharacterResourceSchema,
});

export const CharacterSearchPaginationSchema = z.object({
  has_next_page: z.boolean(),
  last_visible_page: finiteNumberSchema,
});

export const CharacterSearchResponseSchema = z.object({
  pagination: CharacterSearchPaginationSchema,
  data: z.array(CharacterResourceSchema),
});
