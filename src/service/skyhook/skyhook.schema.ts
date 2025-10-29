import { z } from 'zod';
import { toInstant } from '@scope/common/utils';

const dateValue = z.union([z.string(), z.date()]).transform((value) => {
  if (value instanceof Date) return value.toISOString();
  return value;
});

export const SkyhookActorSchema = z.object({
  name: z.string(),
  character: z.string(),
  image: z.string().optional(),
});

export const SkyhookImageSchema = z.object({
  coverType: z.string(),
  url: z.string(),
});

export const SkyhookSeasonSchema = z.object({
  seasonNumber: z.number(),
  name: z.string().optional(),
  images: z.array(SkyhookImageSchema).default([]),
}).transform((season) => ({
  ...season,
  poster: season.images.find((item) => item.coverType === 'Poster')?.url,
}));

export const SkyhookEpisodeSchema = z.object({
  tvdbShowId: z.number(),
  tvdbId: z.number(),
  seasonNumber: z.number(),
  episodeNumber: z.number(),
  absoluteEpisodeNumber: z.number().optional(),
  airedBeforeSeasonNumber: z.number().optional(),
  airedBeforeEpisodeNumber: z.number().optional(),
  airedAfterSeasonNumber: z.number().optional(),
  airedAfterEpisodeNumber: z.number().optional(),
  title: z.string().optional(),
  airDate: dateValue,
  airDateUtc: dateValue,
  runtime: z.number().optional(),
  finaleType: z.string().optional(),
  overview: z.string().optional(),
  image: z.string().optional(),
});

export const SkyhookTimeOfDaySchema = z.object({
  hours: z.number(),
  minutes: z.number(),
});

export const SkyhookRatingSchema = z.object({
  count: z.number(),
  value: z.string(),
});

export const SkyhookAlternativeTitleSchema = z.array(z.unknown()).nullish()
  .default([]);

export const SkyhookModelSchema = z.object({
  tvdbId: z.number(),
  title: z.string(),
  overview: z.string().optional(),
  slug: z.string(),
  originalCountry: z.string().optional(),
  originalLanguage: z.string().optional(),
  language: z.string().optional(),
  firstAired: dateValue,
  lastAired: dateValue.optional(),
  tvMazeId: z.number().optional(),
  tmdbId: z.number().optional(),
  imdbId: z.string().optional(),
  malIds: z.array(z.number()).default([]),
  aniListIds: z.array(z.number()).default([]),
  lastUpdated: dateValue,
  status: z.string(),
  runtime: z.number().optional(),
  timeOfDay: SkyhookTimeOfDaySchema.optional(),
  originalNetwork: z.string().optional(),
  network: z.string().optional(),
  genres: z.array(z.string()).default([]),
  contentRating: z.string().optional(),
  rating: SkyhookRatingSchema.optional(),
  alternativeTitles: SkyhookAlternativeTitleSchema,
  actors: z.array(SkyhookActorSchema).default([]),
  images: z.array(SkyhookImageSchema).default([]),
  seasons: z.array(SkyhookSeasonSchema).default([]),
  episodes: z.array(SkyhookEpisodeSchema).default([]),
}).transform((model) => ({
  ...model,
  firstAired: toInstant(model.firstAired),
  lastUpdated: toInstant(model.lastUpdated),
  banner: model.images.find((item) => item.coverType === 'Banner')?.url,
  poster: model.images.find((item) => item.coverType === 'Poster')?.url,
  fanart: model.images.find((item) => item.coverType === 'Fanart')?.url,
}));

export type SkyhookRemoteShow = z.infer<typeof SkyhookModelSchema>;
export type SkyhookRemoteSeason = z.infer<typeof SkyhookSeasonSchema>;
export type SkyhookRemoteEpisode = z.infer<typeof SkyhookEpisodeSchema>;
