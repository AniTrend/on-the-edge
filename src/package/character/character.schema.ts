import { z } from 'zod';

const emptyToUndefined = (value: unknown) => {
  if (typeof value === 'string' && value.trim().length === 0) {
    return undefined;
  }
  return value;
};

const CharacterMediaRelationSchema = z.object({
  malId: z.number().int().positive(),
  role: z.string().nullish(),
  title: z.string(),
  url: z.string(),
  imageUrl: z.string().nullish(),
});

const CharacterVoiceRelationSchema = z.object({
  malId: z.number().int().positive(),
  name: z.string(),
  language: z.string().nullish(),
  url: z.string(),
  imageUrl: z.string().nullish(),
});

export const CharacterQuerySchema = z.object({
  malId: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().positive().finite().optional(),
  ),
  name: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
});

export const CharacterDocumentSchema = z.object({
  malId: z.number().int().positive(),
  name: z.string(),
  nameKanji: z.string().nullish(),
  nicknames: z.array(z.string()).default([]),
  favorites: z.number().default(0),
  about: z.string().nullish(),
  imageUrl: z.string().nullish(),
  anime: z.array(CharacterMediaRelationSchema).default([]),
  manga: z.array(CharacterMediaRelationSchema).default([]),
  voices: z.array(CharacterVoiceRelationSchema).default([]),
  fetchedAt: z.number(),
  expiresAt: z.number(),
});
