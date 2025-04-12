import { toInstant } from '../../common/helpers/date.ts';
import { provider } from '../service/tmdb/transformer/index.ts';
import { TmdbCrew, TmdbImage } from '../service/tmdb/types.ts';
import { ImageProviderType } from '../service/tmdb/utils/image-provider.ts';
import {
  SeriesEpisode,
  SeriesEpisodeCrew,
  SeriesImageBackdrop,
  SeriesSeason,
} from '../types.ts';
import { MergedEpisode, MergedSeason } from './types.ts';

const transformImage = (
  imageType: ImageProviderType,
  images?: TmdbImage[],
): SeriesImageBackdrop[] =>
  images?.map((data) => ({
    locale: data.iso_639_1,
    height: data.height,
    width: data.width,
    url: provider.getUrl(data, imageType),
  })) ?? [];

const transformCrew = (crew: TmdbCrew): SeriesEpisodeCrew => ({
  job: crew.job,
  department: crew.department,
  creditId: crew.credit_id,
  adult: crew.adult,
  id: crew.id,
  knownFor: crew.known_for_department,
  name: crew.name,
  originalName: crew.original_name,
  popularity: crew.popularity,
  image: provider.getImageUrl('original', crew.profile_path),
  character: crew.character,
  order: crew.order,
});

const transformEpisode = (episode: MergedEpisode): SeriesEpisode => ({
  id: episode.id,
  tvdbShowId: episode.tvdbShowId,
  tvdbId: episode.tvdbId,
  seasonNumber: episode.seasonNumber,
  episodeNumber: episode.episodeNumber,
  absoluteEpisodeNumber: episode.absoluteEpisodeNumber,
  airedBeforeSeasonNumber: episode.airedBeforeSeasonNumber,
  airedBeforeEpisodeNumber: episode.airedBeforeEpisodeNumber,
  airedAfterSeasonNumber: episode.airedAfterSeasonNumber,
  airedAfterEpisodeNumber: episode.airedAfterEpisodeNumber,
  title: episode.title,
  airDate: episode.airDateUtc,
  runtime: episode.runtime,
  overview: episode.overview,
  image: episode.image,
  name: episode.name,
  poster: provider.getImageUrl('original', episode.stillPath),
  crew: episode.crew.map(transformCrew),
  guests: episode.guestStars.map(transformCrew),
});

export const seasonTransformer = (
  seasons: MergedSeason[] | undefined,
): SeriesSeason[] =>
  seasons?.map((season) => ({
    tmdbId: season.id,
    airDate: toInstant(season.air_date),
    episodeCount: season.episode_count,
    name: season.name,
    overview: season.overview,
    number: season.season_number,
    cover: provider.getImageUrl('original', season.poster_path),
    image: {
      backdrops: transformImage(
        ImageProviderType.BACKDROP,
        season.images?.backdrops,
      ),
      logos: transformImage(ImageProviderType.LOGO, season.images?.logos),
      posters: transformImage(ImageProviderType.POSTER, season.images?.posters),
    },
    episodes: season.episodes.map(transformEpisode),
  })) ?? [];
