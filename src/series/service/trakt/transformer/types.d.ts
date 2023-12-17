import { Instant } from '../../../../common/helpers/date.d.ts';

interface MediaId {
  trakt: number;
  slug: string;
  tvdb: number;
  imdb: string;
  tmdb: number;
  tvrage?: string;
}

interface Airs {
  day: string;
  time: string;
  timezone: string;
}

export interface Show {
  title: string;
  year: number;
  mediaId: MediaId;
  overview: string;
  firstAired: Instant;
  airs: Airs;
  runtime: number;
  certification: string;
  network: string;
  country: string;
  trailer: string;
  homepage: string;
  status: string;
  rating: number;
  updatedAt: Instant;
  language: string;
  airedEpisodes: number;
}
