import { Instant } from '../../../../common/helpers/date.d.ts';

interface Episode {
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

interface Season {
  seasonNumber: number;
  poster?: string;
  banner?: string;
  fanart?: string;
}

export interface Show {
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
  seasons: Season[];
  episodes: Episode[];
}
