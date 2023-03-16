import { IRelation, Model } from './types.d.ts';

export const fromModel = (mapping: Model): IRelation => ({
  anidb: mapping.anidb,
  anilist: mapping.anilist,
  animePlanet: mapping['anime-planet'],
  anisearch: mapping.anisearch,
  imdb: mapping.imdb,
  kitsu: mapping.kitsu,
  livechart: mapping.livechart,
  notify: mapping['notify-moe'],
  themoviedb: mapping.themoviedb,
  thetvdb: mapping.thetvdb,
  myanimelist: mapping.myanimelist,
});
