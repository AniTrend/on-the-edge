import { toInstant } from '../../common/helpers/date.ts';
import { provider } from '../service/tmdb/transformer/index.ts';
import { TmdbCrew, TmdbImage } from '../service/tmdb/types.ts';
import { ImageProviderType } from '../service/tmdb/utils/image-provider.ts';
import {
  SeriesEpisode,
  SeriesEpisodeCrew,
  SeriesImageAttributes,
  SeriesImageSimple,
  SeriesSeason,
} from '../types.ts';
import { MergedEpisode, MergedSeason } from './types.ts';

const transformImage = (
  imageType: ImageProviderType,
  images?: TmdbImage[],
): SeriesImageAttributes[] =>
  images?.map((data) => ({
    locale: data.iso_639_1,
    height: data.height,
    width: data.width,
    url: provider.getUrl(data, imageType) ?? '',
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
  airDate: toInstant(episode.airDateUtc),
  runtime: episode.runtime,
  overview: episode.overview,
  image: episode.image,
  name: episode.name,
  poster: provider.getImageUrl('original', episode.stillPath),
  crew: episode.crew.map(transformCrew),
  guests: episode.guestStars.map(transformCrew),
});

const pickBestCandidate = (
  attributes?: SeriesImageAttributes[],
): string | undefined =>
  attributes && attributes.length > 0 ? attributes[0].url : undefined;

const toSeasonImage = (season: MergedSeason): SeriesImageSimple => {
  const backdrops = transformImage(
    ImageProviderType.BACKDROP,
    season.images?.backdrops,
  );
  const posters = transformImage(
    ImageProviderType.POSTER,
    season.images?.posters,
  );
  const logos = transformImage(ImageProviderType.LOGO, season.images?.logos);

  return {
    extraLarge: pickBestCandidate(backdrops),
    large: pickBestCandidate(posters),
    medium: provider.getImageUrl('w300', season.poster_path),
    banner: pickBestCandidate(backdrops) ?? null,
    logo: pickBestCandidate(logos) ?? null,
  };
};

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
    image: toSeasonImage(season),
    episodes: season.episodes.map(transformEpisode),
  })) ?? [];
