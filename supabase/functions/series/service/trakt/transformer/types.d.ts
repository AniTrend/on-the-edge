import { FuzzyDate } from '../../../../_shared/helpers/date.d.ts';

interface MediaId {
  trakt: number;
  slug: string;
  tvdb: number;
  imdb: string;
  tmdb: number;
  tvrage?: string;
}

export interface Show {
  title: string;
  year: number;
  mediaId: MediaId;
  overview: string;
  firstAired: FuzzyDate;
  runtime: number;
  certification: string;
  network: string;
  trailer: string;
  homepage: string;
  status: string;
  rating: number;
  updatedAt: FuzzyDate;
  airedEpisodes: number;
}
