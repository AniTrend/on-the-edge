import { toInstant } from '../../_shared/helpers/date.ts';
import { provider } from '../service/tmdb/transformer/index.ts';
import { TmdbCrew, TmdbImage } from '../service/tmdb/types.d.ts';
import { ImageProviderType } from '../service/tmdb/utils/image-provider.ts';
import {
  SeriesEpisode,
  SeriesEpisodeCrew,
  SeriesImageBackdrop,
  SeriesSeason,
} from '../types.d.ts';
import { MergedEpisode, MergedSeason } from './types.d.ts';

const transformImage = (
  images: TmdbImage[],
  imageType: ImageProviderType,
): SeriesImageBackdrop[] =>
  images?.map((data) => ({
    locale: data.iso_639_1,
    height: data.height,
    width: data.width,
    url: provider.getUrl(data, imageType),
  }));

const transformCrew = (crew: TmdbCrew): SeriesEpisodeCrew => ({
  job: crew.job ?? null,
  department: crew.department ?? null,
  creditId: crew.credit_id,
  adult: crew.adult,
  id: crew.id,
  knownFor: crew.known_for_department,
  name: crew.name,
  originalName: crew.original_name,
  popularity: crew.popularity,
  image: provider.getImageUrl('original', crew.profile_path),
  character: crew.character ?? null,
  order: crew.order ?? null,
});

const transformEpisode = (episode: MergedEpisode): SeriesEpisode => ({
  tvdbShowId: episode.tvdbShowId,
  tvdbId: episode.tvdbId,
  tmdbId: episode.id,
  seasonNumber: episode.seasonNumber,
  episodeNumber: episode.episodeNumber,
  absoluteEpisodeNumber: episode.absoluteEpisodeNumber ?? null,
  airedBeforeSeasonNumber: episode.airedBeforeSeasonNumber ?? null,
  airedBeforeEpisodeNumber: episode.airedBeforeEpisodeNumber ?? null,
  title: episode.title ?? null,
  airDate: episode.airDate,
  runtime: Number(episode.runtime) ?? 0,
  overview: episode.overview ?? null,
  image: episode.image ?? null,
  name: episode.name,
  poster: episode.still_path != null
    ? provider.getImageUrl('original', episode.still_path)
    : null,
  crew: episode.crew.map(transformCrew),
  guests: episode.guest_stars.map(transformCrew),
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
        season.images.backdrops,
        ImageProviderType.BACKDROP,
      ),
      logos: transformImage(season.images.logos, ImageProviderType.LOGO),
      posters: transformImage(season.images.posters, ImageProviderType.POSTER),
    },
    episodes: season.episodes.map(transformEpisode),
  })) ?? [];
