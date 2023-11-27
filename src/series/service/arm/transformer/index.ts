import { Model } from '../remote/types.d.ts';
import { AnimeRelationId } from '../types.d.ts';
import { Transform } from '../../../../common/transformer/types.d.ts';

export const transform: Transform<Model, AnimeRelationId> = (
  sourceData,
): AnimeRelationId => ({
  anidb: sourceData.anidb,
  anilist: sourceData.anilist,
  animePlanet: sourceData['anime-planet'],
  anisearch: sourceData.anisearch,
  imdb: sourceData.imdb,
  kitsu: sourceData.kitsu,
  livechart: sourceData.livechart,
  notify: sourceData['notify-moe'],
  themoviedb: sourceData.themoviedb,
  thetvdb: sourceData.thetvdb,
  myanimelist: sourceData.myanimelist,
});
