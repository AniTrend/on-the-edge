import { FuzzyDate } from '../../../../_shared/helpers/date.d.ts';

interface Episode {
  tvdbShowId: number;
  tvdbId: number;
  seasonNumber: number;
  episodeNumber: number;
  absoluteEpisodeNumber?: number;
  title?: string;
  airDate: FuzzyDate;
  airDateUtc: FuzzyDate;
  runtime?: number;
  overview?: string;
  image?: string;
}

interface Season {
  seasonNumber: number;
  poster?: string;
}

export interface Show {
  tvdbId: number;
  tvMazeId: number;
  title: string;
  overview: string;
  slug: string;
  firstAired: FuzzyDate;
  lastUpdated: FuzzyDate;
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
