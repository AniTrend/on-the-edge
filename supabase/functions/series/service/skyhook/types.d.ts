interface Actor {
  name: string;
  character: string;
}

interface Episode {
  tvdbShowId: number;
  tvdbId: number;
  seasonNumber: number;
  episodeNumber: number;
  absoluteEpisodeNumber?: number;
  title?: string;
  airDate: Date;
  airDateUtc: Date;
  runtime?: number;
  overview?: string;
  image?: string;
}

interface Image {
  coverType: string;
  url: string;
}

interface Season {
  seasonNumber: number;
  images: Image[];
}

interface TimeOfDay {
  hours: number;
  minutes: number;
}

export interface Show {
  tvdbId: number;
  title: string;
  overview: string;
  slug: string;
  originalLanguage: string;
  language: string;
  firstAired: Date;
  tvMazeId: number;
  lastUpdated: Date;
  status: string;
  runtime: number;
  timeOfDay: TimeOfDay;
  originalNetwork: string;
  network: string;
  imdbId: string;
  genres: string[];
  contentRating: string;
  actors: Actor[];
  images: Image[];
  seasons: Season[];
  episodes: Episode[];
}
