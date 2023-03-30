import { Transform } from '../../../transformer/types.d.ts';
import { ShowModel } from '../remote/types.d.ts';
import { Show } from './types.d.ts';
import { toFuzzyDate } from '../../../../_shared/helpers/date.ts';

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
  firstAired: toFuzzyDate(sourceData.first_aired),
  runtime: sourceData.runtime,
  certification: sourceData.certification,
  network: sourceData.network,
  trailer: sourceData.trailer,
  homepage: sourceData.homepage,
  status: sourceData.status,
  rating: sourceData.rating,
  updatedAt: toFuzzyDate(sourceData.updated_at),
  airedEpisodes: sourceData.aired_episodes,
});
