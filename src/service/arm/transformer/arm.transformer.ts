import { ArmModel } from '../remote/types.ts';
import { SeriesRelationId } from '../types.ts';
import { Transform } from '@scope/common/transformer';

export const transform: Transform<ArmModel, SeriesRelationId> = (
  sourceData,
): SeriesRelationId => ({
  anidb: sourceData?.anidb,
  anilist: sourceData?.anilist,
  animePlanet: sourceData?.['anime-planet'],
  anisearch: sourceData?.anisearch,
  imdb: sourceData?.imdb,
  kitsu: sourceData?.kitsu,
  livechart: sourceData?.livechart,
  notify: sourceData?.['notify-moe'],
  themoviedb: sourceData?.themoviedb,
  thetvdb: sourceData?.thetvdb,
  myanimelist: sourceData?.myanimelist,
});
