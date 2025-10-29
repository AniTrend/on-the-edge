import { z } from 'zod';
import { toInstant } from '@scope/common/utils';

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
  slug: z.string(),
  tvrage: z.string().nullish(),
});

export const EpisodeSchema = z.object({
  season: z.number().nullish(),
  number: z.number().nullish(),
  title: z.string(),
  ids: IdsSchema,
  overview: z.string(),
  first_aired: z.string({ coerce: true }).transform(toInstant),
  number_abs: z.number().default(0),
  runtime: z.number().default(0),
  rating: z.number().default(0),
  votes: z.number().default(0),
  updated_at: z.string({ coerce: true }).transform(toInstant),
  episode_type: z.string().nullish(),
  original_title: z.string().nullish(),
  after_credits: z.boolean().default(false),
  during_credits: z.boolean().default(false),
});

export const SeasonSchema = z.object({
  number: z.number().nullish(),
  ids: IdsSchema,
  rating: z.number().default(0),
  votes: z.number().default(0),
  episode_count: z.number().default(0),
  aired_episodes: z.number().default(0),
  title: z.string(),
  overview: z.string(),
  first_aired: z.string({ coerce: true }).transform(toInstant),
  updated_at: z.string({ coerce: true }).transform(toInstant),
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
  overview: z.string(),
  first_aired: z.string({ coerce: true }).transform(toInstant),
  airs: AirsSchema.nullish(),
  runtime: z.number().nullish(),
  certification: z.string().nullish(),
  network: z.string().nullish(),
  country: z.string().nullish(),
  trailer: z.string().nullish(),
  homepage: z.string().nullish(),
  status: z.string().nullish(),
  rating: z.number().default(0),
  votes: z.number().default(0),
  comment_count: z.number().default(0),
  updated_at: z.string({ coerce: true }).transform(toInstant),
  language: z.string().nullish(),
  available_translations: z.array(z.string()).default([]),
  genres: z.array(z.string()).default([]),
  aired_episodes: z.number().default(0),
  original_title: z.string().nullish(),
});
