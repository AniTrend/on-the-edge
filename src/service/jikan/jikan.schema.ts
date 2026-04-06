import { z } from 'zod';
import { toInstant } from '@scope/common/utils';
import { classifyEpisodeKind } from './episode-utils.ts';

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

export const MalEntityTypeSchema = z.enum([
  'anime',
  'manga',
  'people',
  'person',
  'producer',
  'licensor',
  'studio',
  'character',
  'magazine',
]);

export const BroadcastDaySchema = z.enum([
  'Mondays',
  'Tuesdays',
  'Wednesdays',
  'Thursdays',
  'Fridays',
  'Saturdays',
  'Sundays',
]);

export const MediaSourceSchema = z.enum([
  'Original',
  'Manga',
  'Light novel',
  'Novel',
  'Visual novel',
  'Web manga',
  'Web novel',
  '4-koma manga',
  'Game',
  'Card game',
  'Book',
  'Radio',
  'Music',
  'Picture book',
  'Other',
]);

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
  day: z.number().nullish(),
  month: z.number().nullish(),
  year: z.number().nullish(),
});

export const PeriodSchema = z.object({
  from: z.string().nullish(),
  to: z.string().nullish(),
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
  mal_id: z.number(),
  type: MalEntityTypeSchema,
  name: z.string(),
  url: z.string(),
});

export const AnimeEpisodeSchema = z.object({
  mal_id: z.number(),
  url: z.string().nullish(),
  title: z.string(),
  title_japanese: z.string().nullish(),
  title_romanji: z.string().nullish(),
  duration: z.number().nullish(),
  aired: z.string().nullish(),
  score: z.number().nullish(),
  filler: z.coerce.boolean().default(false),
  recap: z.coerce.boolean().default(false),
  synopsis: z.string().nullish(),
}).transform((ep) => ({
  ...ep,
  aired: ep.aired ? toInstant(ep.aired) : null,
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
  day: BroadcastDaySchema,
  time: z.string(),
  timezone: z.string(),
  string: z.string(),
});

const AnyRecordSchema = z.object({});

// Staff entry for GET /v4/anime/{id}/staff (defined before AnimeResourceSchema for forward-reference use)
export const AnimeStaffPersonSchema = z.object({
  mal_id: z.number(),
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
  mal_id: z.number(),
  url: z.string(),
  approved: z.boolean(),
  titles: z.array(TitleVariantSchema),
  images: ImagesSchema,
  title: z.string().nullish(),
  title_english: z.string().nullish(),
  title_japanese: z.string().nullish(),
  title_synonyms: z.array(z.string()),
  source: MediaSourceSchema.default('Other'),
  score: z.coerce.number().default(0),
  scored_by: z.coerce.number().default(0),
  rank: z.coerce.number().default(0),
  popularity: z.coerce.number().default(0),
  members: z.coerce.number().default(0),
  favorites: z.coerce.number().default(0),
  synopsis: z.string().nullish(),
  background: z.string().nullish(),
  rating: z.string().nullish(),
  moreinfo: z.string().nullish(),
});

export const AnimeResourceSchema = MalResourceBaseSchema.extend({
  type: AnimeTypeSchema,
  trailer: AnyRecordSchema.nullish(),
  episodes: z.number().nullish(),
  status: AnimeStatusSchema,
  airing: z.boolean(),
  aired: PeriodSchema,
  duration: z.string().nullish(),
  season: SeasonSchema.nullish(),
  year: z.number().nullish(),
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
  episodes_truncated: z.coerce.boolean().default(false),
});

export const MangaResourceSchema = MalResourceBaseSchema.extend({
  type: MangaTypeSchema,
  chapters: z.number().nullish(),
  volumes: z.number().nullish(),
  status: MangaStatusSchema,
  publishing: z.boolean(),
  published: PeriodSchema,
  authors: z.array(MalEntityRefSchema).nullish().default([]),
  serializations: z.array(MalEntityRefSchema).nullish().default([]),
  genres: z.array(MalEntityRefSchema).nullish().default([]),
  explicit_genres: z.array(MalEntityRefSchema).nullish().default([]),
  demographics: z.array(MalEntityRefSchema).nullish().default([]),
  relations: z.array(MalRelationSchema).nullish().default([]),
  external: z.array(ExternalLinkSchema).nullish().default([]),
});

export const AnimeEpisodePageSchema = z.object({
  data: z.array(AnimeEpisodeSchema).nullish().default([]),
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
  data: z.array(AnimeStaffEntrySchema).nullish().default([]),
});

// Producer/studio resource returned by GET /v4/producers/{id} and search
export const ProducerResourceSchema = z.object({
  mal_id: z.number(),
  url: z.string(),
  titles: z.array(TitleVariantSchema),
  images: z.object({
    jpg: z.object({ image_url: z.string().nullish() }),
  }),
  favorites: z.coerce.number().default(0),
  established: z.string().nullish().transform((v) => v ? toInstant(v) : null),
  about: z.string().nullish(),
  count: z.coerce.number().default(0),
});

export const ProducerResourceResponseSchema = z.object({
  data: ProducerResourceSchema,
});

export const ProducerSearchPaginationSchema = z.object({
  has_next_page: z.boolean(),
  last_visible_page: z.number(),
});

export const ProducerSearchResponseSchema = z.object({
  pagination: ProducerSearchPaginationSchema,
  data: z.array(ProducerResourceSchema).nullish().default([]),
});

// Person/staff resource returned by GET /v4/people/{id} and search
export const PersonImagesSchema = z.object({
  jpg: z.object({ image_url: z.string().nullish() }),
});

export const PersonResourceSchema = z.object({
  mal_id: z.number(),
  url: z.string(),
  website_url: z.string().nullish(),
  images: PersonImagesSchema,
  name: z.string(),
  given_name: z.string().nullish(),
  family_name: z.string().nullish(),
  alternate_names: z.array(z.string()).nullish().default([]),
  birthday: z.string().nullish().transform((v) => v ? toInstant(v) : null),
  favorites: z.coerce.number().default(0),
  about: z.string().nullish(),
});

export const PersonResourceResponseSchema = z.object({
  data: PersonResourceSchema,
});

export const PersonSearchPaginationSchema = z.object({
  has_next_page: z.boolean(),
  last_visible_page: z.number(),
});

export const PersonSearchResponseSchema = z.object({
  pagination: PersonSearchPaginationSchema,
  data: z.array(PersonResourceSchema).nullish().default([]),
});
