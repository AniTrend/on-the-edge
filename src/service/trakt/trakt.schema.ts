import { z } from 'zod';
import { toInstant } from '@scope/common/utils';

const normalizeDate = (value: string | null | undefined): number | null => {
  if (value == null || value.trim() === '') return null;
  const instant = toInstant(value);
  return Number.isFinite(instant) ? instant : null;
};

const optionalDateSchema = z.string().nullish().transform(normalizeDate);
const optionalStringDateSchema = z.string().optional().transform(normalizeDate);

const zeroDefaultNumberSchema = z.number().finite().nullish().transform(
  (value) => value ?? 0,
);

export const AirsSchema = z.object({
  day: z.string().nullish(),
  time: z.string().nullish(),
  timezone: z.string().nullish(),
});

export const IdsSchema = z.object({
  trakt: z.number(),
  tvdb: z.number().nullish(),
  imdb: z.string().nullish(),
  tmdb: z.number().nullish(),
  slug: z.string().nullish(),
  tvrage: z.string().nullish(),
});

export const EpisodeSchema = z.object({
  season: z.number().nullish(),
  number: z.number().nullish(),
  title: z.string().nullish(),
  ids: IdsSchema,
  overview: z.string().nullish(),
  first_aired: optionalDateSchema,
  number_abs: z.number().finite().nullish().transform((value) => value ?? 0),
  runtime: z.number().finite().nullish().transform((value) => value ?? 0),
  rating: zeroDefaultNumberSchema,
  votes: zeroDefaultNumberSchema,
  updated_at: optionalDateSchema,
  episode_type: z.string().nullish(),
  original_title: z.string().nullish(),
  after_credits: z.boolean().default(false),
  during_credits: z.boolean().default(false),
});

export const SeasonSchema = z.object({
  number: z.number().nullish(),
  ids: IdsSchema,
  rating: zeroDefaultNumberSchema,
  votes: zeroDefaultNumberSchema,
  episode_count: zeroDefaultNumberSchema,
  aired_episodes: zeroDefaultNumberSchema,
  title: z.string().nullish(),
  overview: z.string().nullish(),
  first_aired: optionalStringDateSchema,
  updated_at: optionalDateSchema,
  network: z.string().nullish(),
  original_title: z.string().nullish(),
  episodes: z.array(EpisodeSchema).nullish().default([]),
});

export const SeasonsSchema = z.array(SeasonSchema);

export const ShowModelSchema = z.object({
  title: z.string(),
  year: z.number().nullish(),
  ids: IdsSchema,
  tagline: z.string().nullish(),
  overview: z.string().nullish(),
  first_aired: optionalDateSchema,
  airs: AirsSchema.nullish(),
  runtime: z.number().nullish(),
  certification: z.string().nullish(),
  network: z.string().nullish(),
  country: z.string().nullish(),
  trailer: z.string().nullish(),
  homepage: z.string().nullish(),
  status: z.string().nullish(),
  rating: zeroDefaultNumberSchema,
  votes: zeroDefaultNumberSchema,
  comment_count: zeroDefaultNumberSchema,
  updated_at: optionalDateSchema,
  language: z.string().nullish(),
  available_translations: z.array(z.string()).nullish().transform((value) =>
    value ?? []
  ),
  genres: z.array(z.string()).nullish().transform((value) => value ?? []),
  aired_episodes: zeroDefaultNumberSchema,
  original_title: z.string().nullish(),
});
