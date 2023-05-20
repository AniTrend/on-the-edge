import { Transform } from '../../../../_shared/transformer/types.d.ts';
import { SkyhookModel } from '../remote/types.d.ts';
import { Show } from './types.d.ts';
import { toInstant } from '../../../../_shared/helpers/date.ts';

export const transform: Transform<SkyhookModel, Show> = (
  sourceData,
) => ({
  tvdbId: sourceData.tvdbId,
  tvMazeId: sourceData.tvMazeId,
  title: sourceData.title,
  overview: sourceData.overview,
  slug: sourceData.slug,
  firstAired: toInstant(sourceData.firstAired),
  lastUpdated: toInstant(sourceData.lastUpdated),
  status: sourceData.status,
  runtime: sourceData.runtime,
  originalNetwork: sourceData.originalNetwork,
  network: sourceData.network,
  imdbId: sourceData.imdbId,
  contentRating: sourceData.contentRating,
  banner: sourceData.images.find((item) => item.coverType == 'Banner')?.url,
  poster: sourceData.images.find((item) => item.coverType == 'Poster')?.url,
  fanart: sourceData.images.find((item) => item.coverType == 'Fanart')?.url,
  seasons: sourceData.seasons.map((season) => ({
    poster: season?.images?.find((item) => item.coverType == 'Poster')?.url,
    seasonNumber: season.seasonNumber,
  })),
  episodes: sourceData.episodes.map((episode) => ({
    tvdbShowId: episode.tvdbShowId,
    tvdbId: episode.tvdbId,
    seasonNumber: episode.seasonNumber,
    episodeNumber: episode.episodeNumber,
    absoluteEpisodeNumber: episode.absoluteEpisodeNumber,
    title: episode.title,
    airDate: toInstant(episode.airDateUtc),
    runtime: episode.runtime,
    overview: episode.overview,
    image: episode.image,
  })),
});
