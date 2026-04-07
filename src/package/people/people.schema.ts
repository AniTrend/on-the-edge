import { z } from 'zod';

const emptyToUndefined = (value: unknown) => {
  if (typeof value === 'string' && value.trim().length === 0) {
    return undefined;
  }
  return value;
};

export const PeopleQuerySchema = z.object({
  malId: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().positive().finite().optional(),
  ),
  name: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
});

export const PeopleDocumentSchema = z.object({
  malId: z.number().int().positive(),
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
