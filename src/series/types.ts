import { Instant } from '../common/helpers/date.ts';
import { Format, Source, Status } from './service/notify/transformer/enums.ts';
import { AnimeTheme } from './service/theme/types.ts';

export type SeriesId = {
  anidb: number | null;
  anilist: number | null;
  animePlanet: string | null;
  anisearch: number | null;
  imdb: string | null;
  kitsu: number | null;
  livechart: number | null;
  notify: string | null;
  themoviedb: number | null;
  tvdb: number | null;
  myanimelist: number | null;
  tvMazeId: number | null;
  tvrage: string | null;
  slug: string | null;
  shoboi: number;
  trakt: number | null;
};

export type SeriesTitle = {
  english: string | null;
  canonical: string | null;
  harigana: string | null;
  japanese: string | null;
  romaji: string | null;
  synonyms: string[] | null;
};

export type SeriesScheduleEpisode = {
  id: number;
  name: string;
  overview: string;
  airDate: Instant;
  episodeNumber: number;
  productionCode: string;
  runtime: number;
  seasonNumber: number;
  tmdbId: number;
  image: string | null;
};

export type SeriesSchedule = {
  firstAirDate: Instant;
  lastAirDate: Instant;
  lastAiredEpisode: SeriesScheduleEpisode | null;
  nextEpisodeToAir: SeriesScheduleEpisode | null;
};

export type NetworkCategory = 'DISTRIBUTION' | 'PRODUCTION';

export type SeriesNetwork = {
  id: number;
  logoPath: string | null;
  isPrimary: boolean;
  name: string;
  originCountry: string;
  category: NetworkCategory;
};

export type SeriesImageAttributes = {
  locale: string | null;
  height: number;
  width: number;
  url: string;
  type: 'BACKDROP' | 'POSTER' | 'LOGO';
};

// Full image sets used for top-level media image
export type SeriesImage = {
  backdrops: SeriesImageAttributes[];
  logos: SeriesImageAttributes[];
  posters: SeriesImageAttributes[];
};

export type SeriesImageSimple = {
  extraLarge?: string;
  large?: string;
  medium?: string;
  banner?: string | null;
  logo?: string | null;
};

export interface SeriesEpisodeCrew {
  job?: string;
  department?: string;
  creditId: string;
  adult?: boolean;
  id: number;
  knownFor: string;
  name: string;
  originalName: string;
  popularity: number;
  image?: string;
  character?: string;
  order?: number;
}

export type SeriesEpisode = {
  id: number;
  tvdbShowId: number;
  tvdbId: number;
  seasonNumber: number;
  episodeNumber: number;
  absoluteEpisodeNumber?: number;
  airedBeforeSeasonNumber?: number;
  airedBeforeEpisodeNumber?: number;
  airedAfterSeasonNumber?: number;
  airedAfterEpisodeNumber?: number;
  title?: string;
  airDate: Instant;
  runtime?: number;
  overview?: string;
  image?: string;
  name?: string;
  poster?: string;
  crew: SeriesEpisodeCrew[];
  guests: SeriesEpisodeCrew[];
};

export type SeriesSeason = {
  tmdbId: number;
  airDate: Instant;
  episodeCount: number;
  name: string;
  overview: string;
  number: number;
  cover?: string;
  image: SeriesImageSimple;
  episodes: SeriesEpisode[];
};

export type SeriesTrailer = {
  id: string;
  site: string;
  thumbnail?: string;
};

export type SeriesCoverImage = {
  extraLarge?: string;
  large?: string;
  medium?: string;
  color?: string;
};

export interface Media {
  kind: MediaKind;
  mediaId: SeriesId;
  cover: SeriesCoverImage;
  banner: string | null;
  fanart: string | null;
  format: Format | null;
  status: Status | null;
  source: Source | null;
  title: SeriesTitle;
  ageRating: string | null;
  images: SeriesImageAttributes[];
  description: string | null;
  updatedAt: Instant;
  moreInfo: string | null;
}

export type MediaKind = 'ANIME' | 'MANGA';

export type MangaMetadata = {
  chapters: number | null;
  volumes: number | null;
  publishedFrom: Instant | null;
  publishedTo: Instant | null;
};

export type AnimeMetadata = {
  themeSongs: AnimeTheme[];
  schedule: SeriesSchedule | null;
  trailers: SeriesTrailer[];
  networks: SeriesNetwork[];
  airedEpisodes: number | null;
  broadcast: string | null;
  isAdult: boolean | null;
  homepage: string | null;
};

export type MediaUnion =
  | Media
  | (Media & AnimeMetadata)
  | (Media & MangaMetadata);

export type MediaEntity = MediaUnion & {
  id: string;
};
