import { z } from '@scope/common/openapi';

const CharacterMediaRelationContract = z.object({
  malId: z.number().int().positive(),
  role: z.string().nullish(),
  title: z.string(),
  url: z.string(),
  imageUrl: z.string().nullish(),
}).openapi({
  title: 'CharacterMediaRelation',
  description: 'Media entity related to a character',
});

const CharacterVoiceRelationContract = z.object({
  malId: z.number().int().positive(),
  name: z.string(),
  language: z.string().nullish(),
  url: z.string(),
  imageUrl: z.string().nullish(),
}).openapi({
  title: 'CharacterVoiceRelation',
  description: 'Voice actor relation for a character',
});

export const CharacterContract = z.object({
  malId: z.number().int().positive(),
  name: z.string(),
  nameKanji: z.string().nullish(),
  nicknames: z.array(z.string()).default([]),
  favorites: z.number().default(0),
  about: z.string().nullish(),
  imageUrl: z.string().nullish(),
  anime: z.array(CharacterMediaRelationContract).default([]),
  manga: z.array(CharacterMediaRelationContract).default([]),
  voices: z.array(CharacterVoiceRelationContract).default([]),
  fetchedAt: z.number(),
  expiresAt: z.number(),
}).openapi({
  title: 'Character',
  description:
    'Fictional character metadata resolved from Jikan (MAL), including media and voice-actor relations',
});
