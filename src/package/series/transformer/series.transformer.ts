import { currentDate, toInstant } from '@scope/common/utils';
import { SeriesRelationId } from '@scope/service/arm';
import { Jikan, JikanAnime, JikanManga } from '@scope/service/jikan';
import { NotifyAnime } from '@scope/service/notify';
import { SkyhookShow } from '@scope/service/skyhook';
import { AnimeTheme } from '@scope/service/theme';
import type {
  Tmdb,
  TmdbEpisodeToAir,
  TmdbImages,
  TmdbMovie,
  TmdbNetwork,
  TmdbShow,
} from '@scope/service/tmdb';
import { TraktShow } from '@scope/service/trakt';
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
} from '../series.types.ts';
import { inferMediaKind } from '../repository/helpers/qualifier.ts';

const seriesId = (
  relation?: SeriesRelationId,
  skyhook?: SkyhookShow,
  tmdb?: Tmdb,
  notify?: NotifyAnime,
  jikan?: Jikan,
  trakt?: TraktShow,
): SeriesId => ({
  anidb: relation?.anidb ?? null,
  anilist: relation?.anilist ?? null,
  animePlanet: relation?.animePlanet ?? null,
  anisearch: relation?.anisearch ?? null,
  imdb: relation?.imdb ?? skyhook?.imdbId ?? trakt?.ids?.imdb ?? null,
  kitsu: relation?.kitsu ?? null,
  livechart: relation?.livechart ?? null,
  notify: relation?.notify ?? null,
  themoviedb: relation?.themoviedb ?? tmdb?.id ?? null,
  tvdb: relation?.thetvdb ?? skyhook?.tvdbId ?? trakt?.ids?.tvdb ?? null,
  myanimelist: relation?.myanimelist ?? jikan?.mal_id ?? null,
  tvMazeId: skyhook?.tvMazeId ?? null,
  tvrage: trakt?.ids?.tvrage ?? null,
  slug: relation?.animePlanet ?? trakt?.ids?.slug ?? skyhook?.slug ?? null,
  shoboi: notify?.mediaId?.shoboi ? Number(notify.mediaId.shoboi) : null,
  trakt: trakt?.ids?.trakt ?? null,
});

// Derives a composite title set from available providers.
// Supports both Anime (Jikan anime) and Manga (Jikan manga) resources –
// Jikan's title fields are consistent across media types so we can treat them uniformly.
const seriesTitle = (
  tmdb?: Tmdb,
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
  episodeToAir: TmdbEpisodeToAir | null,
): SeriesScheduleEpisode | null => {
  if (!episodeToAir) {
    return null;
  }

  const {
    id,
    name,
    overview,
    air_date,
    episode_number,
    runtime,
    season_number,
    show_id,
    still_path,
    production_code,
  } = episodeToAir;

  return {
    id,
    name,
    overview: overview ?? null,
    airDate: air_date ? toInstant(air_date) : null,
    episodeNumber: episode_number ?? null,
    runtime: runtime ?? null,
    seasonNumber: season_number ?? null,
    tmdbId: show_id ?? null,
    image: still_path ?? null,
    productionCode: production_code ?? null,
  };
};

const seriesSchedule = (
  isMovie: boolean,
  tmdb?: Tmdb,
): SeriesSchedule | null => {
  if (!tmdb) return null;

  if (isMovie) {
    const {
      release_date,
    } = tmdb as TmdbMovie;
    return {
      firstAirDate: release_date ? toInstant(release_date) : null,
      lastAirDate: release_date ? toInstant(release_date) : null,
      lastAiredEpisode: null,
      nextEpisodeToAir: null,
    };
  }

  const {
    first_air_date,
    last_air_date,
    last_episode_to_air,
    next_episode_to_air,
  } = tmdb as TmdbShow;
  return {
    firstAirDate: first_air_date ? toInstant(first_air_date) : null,
    lastAirDate: last_air_date ? toInstant(last_air_date) : null,
    lastAiredEpisode: last_episode_to_air
      ? seriesScheduleEpisode(
        last_episode_to_air,
      )
      : null,
    nextEpisodeToAir: next_episode_to_air
      ? seriesScheduleEpisode(
        next_episode_to_air,
      )
      : null,
  };
};

const seriesNetwork = (
  network: TmdbNetwork,
  category: NetworkCategory,
  primaryNetwork?: string | null,
): SeriesNetwork | null => {
  // Return null if required fields are missing
  if (!network.name || !network.origin_country) {
    return null;
  }

  return {
    id: network.id,
    logoPath: network.logo_path,
    name: network.name,
    originCountry: network.origin_country,
    isPrimary: network.name == primaryNetwork,
    category: category,
  };
};

const seriesNetworks = (
  skyhook?: SkyhookShow,
  trakt?: TraktShow,
  tmdb?: Tmdb,
): SeriesNetwork[] => {
  const primaryNetwork = skyhook?.network ?? trakt?.network;
  const distribution: SeriesNetwork[] =
    tmdb?.networks?.map((data) =>
      seriesNetwork(data, 'DISTRIBUTION', primaryNetwork)
    ).filter((n): n is SeriesNetwork => n !== null) ?? [];

  const production: SeriesNetwork[] =
    tmdb?.production_companies?.map((data) =>
      seriesNetwork(data, 'PRODUCTION', primaryNetwork)
    ).filter((n): n is SeriesNetwork => n !== null) ?? [];

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
  tmdb?: Tmdb,
  notify?: NotifyAnime,
  jikan?: Jikan,
  trakt?: TraktShow,
): string | null => {
  return notify?.summary ?? jikan?.synopsis ?? tmdb?.overview ??
    skyhook?.overview ?? trakt?.overview ?? null;
};

const seriesImages = (images?: TmdbImages): SeriesImageAttributes[] => {
  if (!images) {
    return [];
  }

  const backdrops = images.backdrops?.map<SeriesImageAttributes>((data) => ({
    locale: data.iso_639_1,
    height: data.height,
    width: data.width,
    url: data.file_path,
    type: 'BACKDROP',
  })) ?? [];
  const posters = images.posters?.map<SeriesImageAttributes>((data) => ({
    locale: data.iso_639_1,
    height: data.height,
    width: data.width,
    url: data.file_path,
    type: 'POSTER',
  })) ?? [];
  const logos = images.logos?.map<SeriesImageAttributes>((data) => ({
    locale: data.iso_639_1,
    height: data.height,
    width: data.width,
    url: data.file_path,
    type: 'LOGO',
  })) ?? [];

  return [...posters, ...backdrops, ...logos];
};

const seriesTrailers = (notify?: NotifyAnime): SeriesTrailer[] =>
  notify?.trailers?.map((trailer) => ({
    id: trailer.id,
    site: trailer.site,
    thumbnail: trailer.thumbnail,
  })) ?? [];

/**
 * Parse Jikan duration string to minutes
 * Examples: "24 min per ep", "1 hr 30 min", "2 hr"
 */
const parseDuration = (duration: string | number | null): number | null => {
  if (typeof duration === 'number') return duration;
  if (!duration) return null;

  const hourMatch = duration.match(/(\d+)\s*hr/);
  const minMatch = duration.match(/(\d+)\s*min/);

  const hours = hourMatch ? parseInt(hourMatch[1], 10) : 0;
  const minutes = minMatch ? parseInt(minMatch[1], 10) : 0;

  return hours * 60 + minutes || null;
};

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
  tmdb?: Tmdb,
  themes?: AnimeTheme[],
  notify?: NotifyAnime,
  jikan?: Jikan,
  trakt?: TraktShow,
): MediaUnion => {
  const kind: MediaKind = inferMediaKind(jikan?.type) ??
    ((notify || skyhook || themes || trakt) ? 'ANIME' : 'MANGA');

  const base: Partial<MediaUnion> = {
    kind,
    classification: jikan?.type ?? null,
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
    updatedAt: trakt?.updated_at ?? toInstant(currentDate()),
    description: seriesDescription(skyhook, tmdb, notify, jikan, trakt),
  };

  if (kind === 'MANGA') {
    const jikanManga = jikan as JikanManga;
    const manga: MangaMetadata = {
      chapters: typeof jikanManga.chapters === 'number'
        ? jikanManga.chapters
        : null,
      volumes: typeof jikanManga.volumes === 'number'
        ? jikanManga.volumes
        : null,
      publishedFrom: jikanManga.published?.from
        ? toInstant(jikanManga.published.from)
        : null,
      publishedTo: jikanManga.published?.to
        ? toInstant(jikanManga.published.to)
        : null,
    };

    return { ...base, ...manga } as MediaUnion;
  }

  if (kind === 'ANIME') {
    const { broadcast, duration, type } = jikan as JikanAnime;
    const isMovie = type === 'Movie';
    const anime: AnimeMetadata = {
      themeSongs: themes ?? [],
      schedule: seriesSchedule(isMovie, tmdb),
      trailers: seriesTrailers(notify),
      broadcast: broadcast?.string ?? null,
      airedEpisodes: trakt?.aired_episodes ?? null,
      networks: seriesNetworks(skyhook, trakt, tmdb),
      isAdult: tmdb?.adult ?? null,
      homepage: trakt?.homepage ?? tmdb?.homepage ?? null,
      duration: duration ? parseDuration(duration) : null,
    };
    return { ...base, ...anime } as MediaUnion;
  }
  return base as MediaUnion;
};
