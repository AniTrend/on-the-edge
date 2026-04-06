import { z } from 'zod';

const emptyToUndefined = (value: unknown) => {
  if (typeof value === 'string' && value.trim().length === 0) {
    return undefined;
  }
  return value;
};

export const StudioQuerySchema = z.object({
  name: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
});

export const StudioDocumentSchema = z.object({
  malId: z.number().int().positive(),
  titles: z.array(
    z.object({
      type: z.string().nullish(),
      title: z.string().nullish(),
    }),
  ).default([]),
  name: z.string(),
  about: z.string().nullish(),
  established: z.number().nullish(),
  imageUrl: z.string().nullish(),
  favorites: z.number().default(0),
  animeCount: z.number().default(0),
  fetchedAt: z.number(),
  expiresAt: z.number(),
});
