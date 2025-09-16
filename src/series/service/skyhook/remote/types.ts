interface ActorModel {
  name: string;
  character: string;
  image?: string;
}

export interface EpisodeModel {
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
  airDate: Date;
  airDateUtc: Date;
  runtime?: number;
  finaleType?: string | 'season';
  overview?: string;
  image?: string;
}

interface ImageModel {
  coverType: string | 'Banner' | 'Poster' | 'Fanart' | 'Clearlogo';
  url: string;
}

interface SeasonModel {
  seasonNumber: number;
  name?: string;
  images?: ImageModel[];
}

interface TimeOfDayModel {
  hours: number;
  minutes: number;
}

interface RatingModel {
  count: number;
  value: string;
}

interface AlternativeTitlesModel {
  title: string;
}

export type SkyhookModel = {
  tvdbId: number;
  title: string;
  overview: string;
  slug: string;
  originalCountry: string;
  originalLanguage: string;
  language: string;
  firstAired: Date;
  lastAired: Date;
  tvMazeId: number;
  tmdbId: number;
  imdbId: string;
  malIds: number[];
  aniListIds: number[];
  lastUpdated: Date;
  status: string;
  runtime: number;
  timeOfDay: TimeOfDayModel;
  originalNetwork: string;
  network: string;
  genres: string[];
  contentRating: string;
  rating?: RatingModel;
  alternativeTitles?: AlternativeTitlesModel;
  actors: ActorModel[];
  images: ImageModel[];
  seasons: SeasonModel[];
  episodes: EpisodeModel[];
};
