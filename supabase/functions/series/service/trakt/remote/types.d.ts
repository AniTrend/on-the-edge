interface AirsModel {
  day: string;
  time: string;
  timezone: string;
}

interface IdsModel {
  trakt: number;
  slug: string;
  tvdb: number;
  imdb: string;
  tmdb: number;
  tvrage?: string;
}

export interface ShowModel {
  title: string;
  year: number;
  ids: IdsModel;
  overview: string;
  first_aired: Date;
  airs: AirsModel;
  runtime: number;
  certification: string;
  network: string;
  country: string;
  trailer: string;
  homepage: string;
  status: string;
  rating: number;
  votes: number;
  comment_count: number;
  updated_at: Date;
  language: string;
  available_translations: string[];
  genres: string[];
  aired_episodes: number;
}
