import { currentDate, toEpotch } from '../../common/core/utils.ts';
import { toInstant } from '../../common/helpers/date.ts';
import { SeriesRelationId } from '../service/arm/types.ts';
import { MalType } from '../service/jikan/remote/enums.ts';
import { Jikan, JikanAnime, JikanManga } from '../service/jikan/types.ts';
import { NotifyAnime } from '../service/notify/types.ts';
import { SkyhookShow } from '../service/skyhook/types.ts';
import { AnimeTheme } from '../service/theme/types.ts';
import { Images } from '../service/tmdb/remote/types.ts';
import {
  TmdbEpisodeToAir,
  TmdbNetwork,
  TmdbShow,
} from '../service/tmdb/types.ts';
import { TraktShow } from '../service/trakt/types.ts';
import {
  AnimeMetadata,
  MangaMetadata,
  MediaKind,
  MediaUnion,
  NetworkCategory,
  SeriesCoverImage,
  SeriesId,
  SeriesImageAttributes,
  SeriesNetwork,
  SeriesSchedule,
  SeriesScheduleEpisode,
  SeriesTitle,
  SeriesTrailer,
} from '../types.ts';

const seriesId = (
  relation?: SeriesRelationId,
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

// Derives a composite title set from available providers.
// Supports both Anime (Jikan anime) and Manga (Jikan manga) resources –
// Jikan's title fields are consistent across media types so we can treat them uniformly.
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
  // Prefer Jikan synonyms (works for anime & manga). If empty array, fallback to notify synonyms.
  synonyms:
    (jikan?.title_synonyms && jikan.title_synonyms.length > 0
      ? jikan.title_synonyms
      : notify?.title?.synonyms) ?? null,
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

const seriesImages = (images?: Images): SeriesImageAttributes[] => {
  if (!images) {
    return [];
  }

  const backdrops = images.backdrops.map<SeriesImageAttributes>((data) => ({
    locale: data.iso_639_1,
    height: data.height,
    width: data.width,
    url: data.file_path,
    type: 'BACKDROP',
  }));
  const posters = images.posters.map<SeriesImageAttributes>((data) => ({
    locale: data.iso_639_1,
    height: data.height,
    width: data.width,
    url: data.file_path,
    type: 'POSTER',
  }));
  const logos = images.logos.map<SeriesImageAttributes>((data) => ({
    locale: data.iso_639_1,
    height: data.height,
    width: data.width,
    url: data.file_path,
    type: 'LOGO',
  }));

  return [...posters, ...backdrops, ...logos];
};

const seriesTrailers = (notify?: NotifyAnime): SeriesTrailer[] =>
  notify?.trailers?.map((trailer) => ({
    id: trailer.id,
    site: trailer.site,
    thumbnail: trailer.thumbnail,
  })) ?? [];

const seriesCover = (
  notify?: NotifyAnime,
  jikan?: Jikan,
): SeriesCoverImage => ({
  color: notify?.poster?.color,
  extraLarge: jikan?.images?.jpg?.large_image_url ?? notify?.poster?.large,
  large: jikan?.images?.jpg?.large_image_url ?? notify?.poster?.large,
  medium: jikan?.images?.jpg?.small_image_url ?? notify?.poster?.large,
});

export const seriesTransform = (
  relation?: SeriesRelationId,
  skyhook?: SkyhookShow,
  tmdb?: TmdbShow,
  themes?: AnimeTheme[],
  notify?: NotifyAnime,
  jikan?: Jikan,
  trakt?: TraktShow,
): MediaUnion => {
  const isAnime = jikan?.type === MalType.ANIME;

  const kind: MediaKind = isAnime ? 'ANIME' : 'MANGA';

  const base = {
    kind,
    mediaId: seriesId(relation, skyhook, tmdb, notify, jikan, trakt),
    banner: tmdb?.backdrop_path ?? skyhook?.banner ?? null,
    cover: seriesCover(notify, jikan),
    fanart: skyhook?.fanart ?? null,
    format: notify?.format ?? null,
    source: notify?.source ?? null,
    status: notify?.status ?? null,
    title: seriesTitle(tmdb, notify, jikan),
    ageRating: seriesContentRating(jikan, skyhook, trakt),
    images: seriesImages(tmdb?.images),
    moreInfo: jikan?.moreinfo ?? null,
    updatedAt: trakt?.updatedAt ?? toEpotch(currentDate()),
    description: seriesDescription(skyhook, tmdb, notify, jikan, trakt),
  };

  if (!isAnime) {
    const jikanManga = jikan as JikanManga;
    const manga: MangaMetadata = {
      chapters: typeof jikanManga.chapters === 'number' ? jikanManga.chapters : null,
      volumes: typeof jikanManga.volumes === 'number' ? jikanManga.volumes : null,
      publishedFrom: jikanManga.published?.from
        ? toInstant(jikanManga.published.from)
        : null,
      publishedTo: jikanManga.published?.to ? toInstant(jikanManga.published.to) : null,
    };

    return { ...base, ...manga };
  }

  if (isAnime) {
    const jikanAnime = jikan as JikanAnime;
    const anime: AnimeMetadata = {
      themeSongs: themes ?? [],
      schedule: seriesSchedule(tmdb),
      trailers: seriesTrailers(notify),
      broadcast: jikanAnime.broadcast?.string ?? null,
      airedEpisodes: trakt?.airedEpisodes ?? null,
      networks: seriesNetworks(skyhook, trakt, tmdb),
      isAdult: tmdb?.adult ?? null,
      homepage: trakt?.homepage ?? tmdb?.homepage ?? null,
    };
    return { ...base, ...anime };
  }
  return base;
};
