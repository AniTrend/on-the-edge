import { z } from 'zod';

export const AnimeThemesAudioSchema = z.object({
  id: z.number(),
  link: z.string().url(),
});

export const AnimeThemesVideoSchema = z.object({
  id: z.number(),
  link: z.string().url(),
  resolution: z.number().nullish(),
  nc: z.boolean(),
  subbed: z.boolean(),
  lyrics: z.boolean(),
  uncen: z.boolean(),
  source: z.string().nullish(),
  overlap: z.string().nullish(),
  tags: z.string().nullish(),
  audio: AnimeThemesAudioSchema.nullish().default(null),
});

export const AnimeThemesEntrySchema = z.object({
  id: z.number(),
  version: z.number().nullish().default(1),
  episodes: z.string().nullish().default(null),
  nsfw: z.boolean(),
  spoiler: z.boolean(),
  notes: z.string().nullish().default(null),
  videos: z.array(AnimeThemesVideoSchema).nullish().default([]),
});

export const AnimeThemesSongSchema = z.object({
  id: z.number(),
  title: z.string().nullish().default(null),
});

export const AnimeThemesThemeSchema = z.object({
  id: z.number(),
  type: z.enum(['OP', 'ED']),
  sequence: z.number().nullish().default(1),
  slug: z.string(),
  animethemeentries: z.array(AnimeThemesEntrySchema).nullish().default([]),
  song: AnimeThemesSongSchema.nullish().default(null),
});

export const AnimeThemesAnimeSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  year: z.number().nullish().default(null),
  season: z.string().nullish().default(null),
  media_format: z.string().nullish().default(null),
  animethemes: z.array(AnimeThemesThemeSchema).nullish().default([]),
});

export const AnimeThemesLookupSchema = z.object({
  anime: z.array(AnimeThemesAnimeSchema),
});
