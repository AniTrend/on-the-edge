interface ActorModel {
  name: string;
  character: string;
}

interface EpisodeModel {
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

interface ImageModel {
  coverType: string | 'Banner' | 'Poster' | 'Fanart';
  url: string;
}

interface SeasonModel {
  seasonNumber: number;
  images: ImageModel[];
}

interface TimeOfDayModel {
  hours: number;
  minutes: number;
}

export interface SkyhookModel {
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
  timeOfDay: TimeOfDayModel;
  originalNetwork: string;
  network: string;
  imdbId: string;
  genres: string[];
  contentRating: string;
  actors: ActorModel[];
  images: ImageModel[];
  seasons: SeasonModel[];
  episodes: EpisodeModel[];
}
