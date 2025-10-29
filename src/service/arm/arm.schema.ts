import { z } from 'zod';

export const ArmSchema = z.object({
  anidb: z.number().nullish().default(null),
  anilist: z.number().nullish().default(null),
  'anime-planet': z.string().nullish().default(null),
  anisearch: z.number().nullish().default(null),
  imdb: z.string().nullish().default(null),
  kitsu: z.number().nullish().default(null),
  livechart: z.number().nullish().default(null),
  'notify-moe': z.string().nullish().default(null),
  themoviedb: z.number().nullish().default(null),
  thetvdb: z.number().nullish().default(null),
  myanimelist: z.number().nullish().default(null),
}).transform((model) => ({
  anidb: model.anidb,
  anilist: model.anilist,
  animePlanet: model['anime-planet'],
  anisearch: model.anisearch,
  imdb: model.imdb,
  kitsu: model.kitsu,
  livechart: model.livechart,
  notify: model['notify-moe'],
  themoviedb: model.themoviedb,
  thetvdb: model.thetvdb,
  myanimelist: model.myanimelist,
}));

export const ArmSchemas = z.array(ArmSchema);
