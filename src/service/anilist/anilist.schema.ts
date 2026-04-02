import { z } from 'zod';

export const AniListMediaTypeSchema = z.enum(['ANIME', 'MANGA']);

export const AniListTitleSchema = z.object({
  english: z.string().nullish().default(null),
  romaji: z.string().nullish().default(null),
  native: z.string().nullish().default(null),
});

export const AniListMediaSchema = z.object({
  id: z.number(),
  idMal: z.number().nullish().default(null),
  type: AniListMediaTypeSchema,
  title: AniListTitleSchema.nullish().default({
    english: null,
    romaji: null,
    native: null,
  }),
});

export const AniListGraphQLErrorSchema = z.object({
  message: z.string(),
});

export const AniListResponseSchema = z.object({
  data: z.object({
    Media: AniListMediaSchema.nullish().default(null),
  }).nullish().default({
    Media: null,
  }),
  errors: z.array(AniListGraphQLErrorSchema).nullish().default([]),
});
