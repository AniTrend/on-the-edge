import { z } from 'zod';

const emptyToUndefined = (value: unknown) => {
  if (typeof value === 'string' && value.trim().length === 0) {
    return undefined;
  }
  return value;
};

export const PeopleParamsSchema = z.object({
  anilistId: z.coerce.number().int().positive(),
});

export const PeopleQuerySchema = z.object({
  name: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
});

export const PeopleDocumentSchema = z.object({
  anilistId: z.number().int().positive(),
  malId: z.number().int().positive().nullish(),
  name: z.string(),
  givenName: z.string().nullish(),
  familyName: z.string().nullish(),
  alternateNames: z.array(z.string()).default([]),
  birthday: z.number().nullish(),
  favorites: z.number().default(0),
  about: z.string().nullish(),
  imageUrl: z.string().nullish(),
  websiteUrl: z.string().nullish(),
  fetchedAt: z.number(),
  expiresAt: z.number(),
});
