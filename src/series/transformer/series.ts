import { currentDate, toEpotch } from '../../common/core/utils.ts';
import { toInstant } from '../../common/helpers/date.ts';
import { AnimeRelationId } from '../service/arm/types.d.ts';
import { Jikan } from '../service/jikan/types.d.ts';
import { NotifyAnime } from '../service/notify/types.d.ts';
import { SkyhookShow } from '../service/skyhook/types.d.ts';
import { AnimeTheme } from '../service/theme/types.d.ts';
import { Images } from '../service/tmdb/remote/types.d.ts';
import {
  TmdbEpisodeToAir,
  TmdbNetwork,
  TmdbShow,
} from '../service/tmdb/types.d.ts';
import { TraktShow } from '../service/trakt/types.d.ts';
import {
  Media,
  NetworkCategory,
  SeriesCoverImage,
  SeriesId,
  SeriesImage,
  SeriesNetwork,
  SeriesSchedule,
  SeriesScheduleEpisode,
  SeriesTitle,
  SeriesTrailer,
} from '../types.d.ts';

const seriesId = (
  relation?: AnimeRelationId,
  skyhook?: SkyhookShow,
  tmdb?: TmdbShow,
  notify?: NotifyAnime,
  jikan?: Jikan,
  trakt?: TraktShow,
): SeriesId => ({
  anidb: relation?.anidb ?? null,
  anilist: relation?.anilist ?? null,
  animePlanet: relation?.animePlanet ?? null,
  anisearch: relation?.anisearch ?? null,
  imdb: relation?.imdb ?? skyhook?.imdbId ?? trakt?.mediaId?.imdb ?? null,
  kitsu: relation?.kitsu ?? null,
  livechart: relation?.livechart ?? null,
  notify: relation?.notify ?? null,
  themoviedb: relation?.themoviedb ?? tmdb?.id ?? null,
  tvdb: relation?.thetvdb ?? skyhook?.tvdbId ?? trakt?.mediaId?.tvdb ?? null,
  myanimelist: relation?.myanimelist ?? jikan?.mal_id ?? null,
  tvMazeId: skyhook?.tvMazeId ?? null,
  tvrage: trakt?.mediaId?.tvrage ?? null,
  slug: relation?.animePlanet ?? trakt?.mediaId?.slug ?? skyhook?.slug ?? null,
  shoboi: Number(notify?.mediaId?.shoboi),
  trakt: trakt?.mediaId?.trakt ?? null,
});

const seriesTitle = (
  tmdb?: TmdbShow,
  notify?: NotifyAnime,
  jikan?: Jikan,
): SeriesTitle => ({
  english: jikan?.title_english ?? notify?.title?.english ?? null,
  canonical: jikan?.title ?? notify?.title?.canonical ?? null,
  harigana: notify?.title?.harigana ?? null,
  japanese: jikan?.title_japanese ?? notify?.title?.native ??
    tmdb?.original_name ?? null,
  romaji: notify?.title.romaji ?? null,
  synonyms: jikan?.title_synonyms ?? notify?.title?.synonyms ?? null,
});

const seriesScheduleEpisode = (
  episodeToAir?: TmdbEpisodeToAir,
): SeriesScheduleEpisode | null => {
  if (!episodeToAir) {
    return null;
  }

  return {
    id: episodeToAir!.id,
    name: episodeToAir!.name,
    overview: episodeToAir!.overview,
    airDate: toInstant(episodeToAir!.air_date),
    episodeNumber: episodeToAir!.episode_number,
    runtime: episodeToAir!.runtime,
    seasonNumber: episodeToAir!.season_number,
    tmdbId: episodeToAir!.show_id,
    image: episodeToAir!.still_path,
    productionCode: episodeToAir!.production_code,
  };
};

const seriesSchedule = (
  tmdb?: TmdbShow,
): SeriesSchedule | null => {
  if (!tmdb) return null;

  return {
    firstAirDate: toInstant(tmdb?.first_air_date),
    lastAirDate: toInstant(tmdb?.last_air_date),
    lastAiredEpisode: seriesScheduleEpisode(tmdb?.last_episode_to_air),
    nextEpisodeToAir: seriesScheduleEpisode(tmdb?.next_episode_to_air),
  };
};

const seriesNetwork = (
  network: TmdbNetwork,
  category: NetworkCategory,
  primaryNetwork?: string,
): SeriesNetwork => ({
  id: network.id,
  logoPath: network.logo_path,
  name: network.name,
  originCountry: network.origin_country,
  isPrimary: network.name == primaryNetwork,
  category: category,
});

const seriesNetworks = (
  skyhook?: SkyhookShow,
  trakt?: TraktShow,
  tmdb?: TmdbShow,
): SeriesNetwork[] => {
  const primaryNetwork = skyhook?.network ?? trakt?.network;
  const distribution: SeriesNetwork[] =
    tmdb?.networks.map((data) =>
      seriesNetwork(data, 'DISTRIBUTION', primaryNetwork)
    ) ?? [];

  const production: SeriesNetwork[] =
    tmdb?.production_companies.map((data) =>
      seriesNetwork(data, 'PRODUCTION', primaryNetwork)
    ) ?? [];

  return distribution.concat(production);
};

const seriesContentRating = (
  jikan?: Jikan,
  skyhook?: SkyhookShow,
  trakt?: TraktShow,
) => {
  return (jikan?.rating ?? skyhook?.contentRating ?? trakt?.certification) ??
    null;
};

const seriesDescription = (
  skyhook?: SkyhookShow,
  tmdb?: TmdbShow,
  notify?: NotifyAnime,
  jikan?: Jikan,
  trakt?: TraktShow,
): string | null => {
  return notify?.summary ?? jikan?.synopsis ?? tmdb?.overview ??
    skyhook?.overview ?? trakt?.overview ?? null;
};

const seriesImage = (images?: Images): SeriesImage => {
  if (!images) {
    return {
      backdrops: [],
      posters: [],
      logos: [],
    };
  }

  return {
    backdrops: images.backdrops.map((data) => ({
      locale: data.iso_639_1,
      height: data.height,
      width: data.width,
      url: data.file_path,
    })),
    posters: images.posters.map((data) => ({
      locale: data.iso_639_1,
      height: data.height,
      width: data.width,
      url: data.file_path,
    })),
    logos: images.logos.map((data) => ({
      locale: data.iso_639_1,
      height: data.height,
      width: data.width,
      url: data.file_path,
    })),
  };
};

const seriesTrailers = (notify?: NotifyAnime): SeriesTrailer[] =>
  notify?.trailers?.map((trailer) => ({
    id: trailer.id,
    site: trailer.site,
    thumbnail: trailer.thumbnail ?? null,
  })) ?? [];

const seriesCover = (
  notify?: NotifyAnime,
  jikan?: Jikan,
): SeriesCoverImage => ({
  color: notify?.poster?.color ?? null,
  extraLarge: jikan?.images?.jpg?.large_image_url ??
    notify?.poster?.large ?? null,
  large: jikan?.images?.jpg?.large_image_url ?? notify?.poster?.large ??
    null,
  medium: jikan?.images?.jpg?.small_image_url ?? notify?.poster?.large ??
    null,
});

export const seriesTransform = (
  relation?: AnimeRelationId,
  skyhook?: SkyhookShow,
  tmdb?: TmdbShow,
  themes?: AnimeTheme[],
  notify?: NotifyAnime,
  jikan?: Jikan,
  trakt?: TraktShow,
): Media => ({
  mediaId: seriesId(relation, skyhook, tmdb, notify, jikan, trakt),
  banner: jikan?.background ?? tmdb?.backdrop_path ?? skyhook?.banner ?? null,
  cover: seriesCover(notify, jikan),
  fanart: skyhook?.fanart ?? null,
  format: notify?.format ?? null,
  source: notify?.source ?? null,
  status: notify?.status ?? null,
  title: seriesTitle(tmdb, notify, jikan),
  themeSongs: themes ?? [],
  schedule: seriesSchedule(tmdb),
  ageRating: seriesContentRating(jikan, skyhook, trakt),
  isAdult: tmdb?.adult ?? null,
  trailers: seriesTrailers(notify),
  networks: seriesNetworks(skyhook, trakt, tmdb),
  image: seriesImage(tmdb?.images),
  homepage: trakt?.homepage ?? tmdb?.homepage ?? null,
  updatedAt: trakt?.updatedAt ?? toEpotch(currentDate()),
  description: seriesDescription(
    skyhook,
    tmdb,
    notify,
    jikan,
    trakt,
  ),
  airedEpisodes: trakt?.airedEpisodes ?? null,
});
