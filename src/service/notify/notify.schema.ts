import { z } from 'zod';

const stringOrEmpty = () =>
  z.string().nullish().transform((value) => value ?? '');

export const NotifyTitleSchema = z.object({
  canonical: stringOrEmpty(),
  romaji: stringOrEmpty(),
  english: stringOrEmpty(),
  japanese: stringOrEmpty(),
  hiragana: stringOrEmpty(),
  synonyms: z.array(z.string()).nullish().default([]),
});

export const NotifyImageSchema = z.object({
  extension: z.string(),
  width: z.number().nullish(),
  height: z.number().nullish(),
  averageColor: z.object({
    hue: z.number(),
    saturation: z.number(),
    lightness: z.number(),
  }),
});

export const NotifyRatingSchema = z.object({
  overall: z.number(),
  story: z.number(),
  visuals: z.number(),
  soundtrack: z.number(),
  count: z.object({
    overall: z.number(),
    story: z.number(),
    visuals: z.number(),
    soundtrack: z.number(),
  }),
});

export const NotifyMappingSchema = z.object({
  service: z.string(),
  serviceId: z.string(),
});

export const NotifyTrailerSchema = NotifyMappingSchema.extend({
  service: z.string(),
});

export const NotifyLinkSchema = z.object({
  title: z.string(),
  url: z.string(),
});

export const NotifyEpisodeTitleSchema = z.object({
  romaji: stringOrEmpty(),
  english: stringOrEmpty(),
  japanese: stringOrEmpty(),
});

export const NotifyEpisodeAiringSchema = z.object({
  start: z.string().nullish(),
  end: z.string().nullish(),
});

export const NotifyEpisodeSchema = z.object({
  id: z.string(),
  animeId: z.string(),
  number: z.number(),
  title: NotifyEpisodeTitleSchema,
  airingDate: NotifyEpisodeAiringSchema.nullish(),
  links: z.record(z.string(), z.unknown()).nullish(),
});

export const NotifyPopularitySchema = z.object({
  watching: z.number().min(0),
  completed: z.number().min(0),
  planned: z.number().min(0),
  hold: z.number().min(0),
  dropped: z.number().min(0),
});

export const NotifyAnimeSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: NotifyTitleSchema,
  summary: stringOrEmpty(),
  status: z.string(),
  genres: z.array(z.string()).nullish().default([]),
  startDate: z.string(),
  endDate: z.string(),
  episodeCount: z.number(),
  episodeLength: z.number(),
  source: z.string(),
  image: NotifyImageSchema,
  firstChannel: z.string().nullish(),
  rating: NotifyRatingSchema,
  popularity: NotifyPopularitySchema.nullish(),
  trailers: z.array(NotifyTrailerSchema).nullish().default([]),
  episodes: z.array(z.string()).nullish().default([]),
  mappings: z.array(NotifyMappingSchema).nullish().default([]),
  posts: z.unknown().nullish(),
  likes: z.unknown().nullish(),
  created: z.string().nullish(),
  createdBy: z.string().nullish(),
  edited: z.string().nullish(),
  editedBy: z.string().nullish(),
  isDraft: z.boolean().nullish(),
  studios: z.array(z.string()).nullish().default([]),
  producers: z.array(z.string()).nullish().default([]),
  licensors: z.array(z.string()).nullish().default([]),
  links: z.array(NotifyLinkSchema).nullish(),
});

export type NotifyAnimeRemote = z.infer<typeof NotifyAnimeSchema>;
export type NotifyEpisodeRemote = z.infer<typeof NotifyEpisodeSchema>;
