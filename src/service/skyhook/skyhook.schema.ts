import { z } from 'zod';
import { toInstant } from '@scope/common/utils';

const dateValue = z.union([z.string(), z.date()]).nullish().transform(
  (value) => {
    if (value instanceof Date) return value.toISOString();
    return value;
  },
);

export const SkyhookActorSchema = z.object({
  name: z.string(),
  character: z.string(),
  image: z.string().nullish(),
});

export const SkyhookImageSchema = z.object({
  coverType: z.string(),
  url: z.string(),
});

export const SkyhookSeasonSchema = z.object({
  seasonNumber: z.number(),
  name: z.string().nullish(),
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
  absoluteEpisodeNumber: z.number().nullish(),
  airedBeforeSeasonNumber: z.number().nullish(),
  airedBeforeEpisodeNumber: z.number().nullish(),
  airedAfterSeasonNumber: z.number().nullish(),
  airedAfterEpisodeNumber: z.number().nullish(),
  title: z.string().nullish(),
  airDate: dateValue,
  airDateUtc: dateValue,
  runtime: z.number().nullish(),
  finaleType: z.string().nullish(),
  overview: z.string().nullish(),
  image: z.string().nullish(),
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
  overview: z.string().nullish(),
  slug: z.string(),
  originalCountry: z.string().nullish(),
  originalLanguage: z.string().nullish(),
  language: z.string().nullish(),
  firstAired: dateValue,
  lastAired: dateValue.nullish(),
  tvMazeId: z.number().nullish(),
  tmdbId: z.number().nullish(),
  imdbId: z.string().nullish(),
  malIds: z.array(z.number()).default([]),
  aniListIds: z.array(z.number()).default([]),
  lastUpdated: dateValue,
  status: z.string(),
  runtime: z.number().nullish(),
  timeOfDay: SkyhookTimeOfDaySchema.nullish(),
  originalNetwork: z.string().nullish(),
  network: z.string().nullish(),
  genres: z.array(z.string()).default([]),
  contentRating: z.string().nullish(),
  rating: SkyhookRatingSchema.nullish(),
  alternativeTitles: SkyhookAlternativeTitleSchema,
  actors: z.array(SkyhookActorSchema).default([]),
  images: z.array(SkyhookImageSchema).default([]),
  seasons: z.array(SkyhookSeasonSchema).default([]),
  episodes: z.array(SkyhookEpisodeSchema).default([]),
}).transform((model) => ({
  ...model,
  firstAired: model.firstAired ? toInstant(model.firstAired) : null,
  lastUpdated: model.lastUpdated ? toInstant(model.lastUpdated) : null,
  banner: model.images.find((item) => item.coverType === 'Banner')?.url,
  poster: model.images.find((item) => item.coverType === 'Poster')?.url,
  fanart: model.images.find((item) => item.coverType === 'Fanart')?.url,
}));

export type SkyhookRemoteShow = z.infer<typeof SkyhookModelSchema>;
export type SkyhookRemoteSeason = z.infer<typeof SkyhookSeasonSchema>;
export type SkyhookRemoteEpisode = z.infer<typeof SkyhookEpisodeSchema>;
