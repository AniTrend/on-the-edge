import { Instant } from '../common/helpers/date.d.ts';
import { Format, Source, Status } from './service/notify/transformer/enums.ts';
import { AnimeTheme } from './service/theme/types.d.ts';

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

export type SeriesImageBackdrop = {
  locale: string | null;
  height: number;
  width: number;
  url: string;
};

export type SeriesImage = {
  backdrops: SeriesImageBackdrop[];
  logos: SeriesImageBackdrop[];
  posters: SeriesImageBackdrop[];
};

export interface SeriesEpisodeCrew {
  job: string | null;
  department: string | null;
  creditId: string;
  adult: boolean | null;
  id: number;
  knownFor: string;
  name: string;
  originalName: string;
  popularity: number;
  image: string | null;
  character: string | null;
  order: number | null;
}

export type SeriesEpisode = {
  tvdbShowId: number;
  tvdbId: number;
  tmdbId: number;
  seasonNumber: number;
  episodeNumber: number;
  absoluteEpisodeNumber: number | null;
  airedBeforeSeasonNumber: number | null;
  airedBeforeEpisodeNumber: number | null;
  title: string | null;
  airDate: Instant;
  runtime: number | null;
  overview: string | null;
  image: string | null;
  name: string;
  poster: string | null;
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
  cover: string | null;
  image: SeriesImage;
  episodes: SeriesEpisode[];
};

export type SeriesTrailer = {
  id: string;
  site: string;
  thumbnail: string | null;
};

export type SeriesCoverImage = {
  extraLarge: string | null;
  large: string | null;
  medium: string | null;
  color: string | null;
};

export interface Media {
  mediaId: SeriesId;
  cover: SeriesCoverImage;
  banner: string | null;
  fanart: string | null;
  format: Format | null;
  status: Status | null;
  source: Source | null;
  title: SeriesTitle;
  themeSongs: AnimeTheme[];
  schedule: SeriesSchedule | null;
  ageRating: string | null;
  isAdult: boolean | null;
  trailers: SeriesTrailer[];
  networks: SeriesNetwork[];
  image: SeriesImage;
  homepage: string | null;
  description: string | null;
  updatedAt: Instant;
  airedEpisodes: number | null;
}

export interface MediaWithSeason extends Media {
  seasons: SeriesSeason[];
}
