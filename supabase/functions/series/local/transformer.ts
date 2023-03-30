import { Transform } from '../transformer/types.d.ts';
import { Media } from '../types.d.ts';
import { AnimeRelation } from './types.d.ts';

export const transformFromEntity: Transform<AnimeRelation, Media> = (
  sourceData,
) => {
  return {
    mediaId: { ...sourceData },
    updated_at: '',
  };
};

export const transformToEntity: Transform<Media, AnimeRelation> = (
  sourceData,
) => {
  return {
    anidb: sourceData?.mediaId.anidb,
    anilist: sourceData?.mediaId.anilist,
    anime_planet: sourceData?.mediaId.anime_planet,
    anisearch: sourceData?.mediaId.anisearch,
    created_at: sourceData?.mediaId.created_at,
    id: sourceData?.mediaId.id,
    imdb: sourceData?.mediaId.imdb,
    livechart: sourceData?.mediaId.livechart,
    mal: sourceData?.mediaId.mal,
    notify_moe: sourceData?.mediaId.notify_moe,
    shoboi: sourceData?.mediaId.shoboi,
    tmdb: sourceData?.mediaId.tmdb,
    trakt: sourceData?.mediaId.trakt,
    tvdb: sourceData?.mediaId.tvdb,
  };
};
