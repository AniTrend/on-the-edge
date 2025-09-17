import { Transform } from '@scope/common/transformer';
import { ShowModel } from '../remote/types.ts';
import { Show } from './types.ts';
import { toInstant } from '@scope/common/helpers';

export const transform: Transform<ShowModel, Show> = (
  sourceData,
) => ({
  title: sourceData.title,
  year: sourceData.year,
  mediaId: {
    trakt: sourceData.ids.trakt,
    slug: sourceData.ids.slug,
    tvdb: sourceData.ids.tvdb,
    imdb: sourceData.ids.imdb,
    tmdb: sourceData.ids.tmdb,
    tvrage: sourceData.ids.tvrage,
  },
  overview: sourceData.overview,
  firstAired: toInstant(sourceData.first_aired),
  airs: sourceData.airs,
  runtime: sourceData.runtime,
  certification: sourceData.certification,
  network: sourceData.network,
  country: sourceData.country,
  trailer: sourceData.trailer,
  homepage: sourceData.homepage,
  status: sourceData.status,
  rating: sourceData.rating,
  updatedAt: toInstant(sourceData.updated_at),
  language: sourceData.language,
  airedEpisodes: sourceData.aired_episodes,
});
