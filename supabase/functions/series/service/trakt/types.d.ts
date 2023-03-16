interface Airs {
  day: string;
  time: string;
  timezone: string;
}

interface Ids {
  trakt: number;
  slug: string;
  tvdb: number;
  imdb: string;
  tmdb: number;
  tvrage: null;
}

export interface Show {
  title: string;
  year: number;
  ids: Ids;
  overview: string;
  first_aired: Date;
  airs: Airs;
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
