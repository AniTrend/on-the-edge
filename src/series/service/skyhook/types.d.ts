import { Instant } from '../../../common/helpers/date.d.ts';

interface SkyhookEpisode {
  tvdbShowId: number;
  tvdbId: number;
  seasonNumber: number;
  episodeNumber: number;
  absoluteEpisodeNumber?: number;
  airedBeforeSeasonNumber?: number;
  airedBeforeEpisodeNumber?: number;
  title?: string;
  airDate: Instant;
  runtime?: number;
  overview?: string;
  image?: string;
}

interface SkyhookSeason {
  seasonNumber: number;
  poster?: string;
  banner?: string;
  fanart?: string;
}

export interface SkyhookShow {
  tvdbId: number;
  tvMazeId: number;
  title: string;
  overview: string;
  slug: string;
  firstAired: Instant;
  lastUpdated: Instant;
  status: string;
  runtime: number;
  originalNetwork: string;
  network: string;
  imdbId: string;
  contentRating: string;
  banner?: string;
  poster?: string;
  fanart?: string;
  seasons: SkyhookSeason[];
  episodes: SkyhookEpisode[];
}
