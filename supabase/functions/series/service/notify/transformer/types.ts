import { FuzzyDate } from '../../../../_shared/helpers/date.d.ts';

export interface Title {
  english: string;
  romaji: string;
  native: string;
  canonical: string;
  harigana: string;
  synonyms: string[];
}

export interface Poster {
  color: string;
  large: string;
}

export interface Rating {
  overall: number;
  story: number;
  visuals: number;
  soundtrack: number;
  count: {
    overall: number;
    story: number;
    visuals: number;
    soundtrack: number;
  };
}

export interface Trailer {
  id: string;
  site: string | 'youtube';
  thumbnail?: string;
}

export interface MediaId {
  [key: string]: string;
}

export enum Format {
  TV,
  MOVIE,
  SPECIAL,
  OVA,
  ONA,
}

export enum Status {
  FINISHED,
  RELEASING,
  NOT_YET_RELEASED,
}

export enum Source {
  ORIGINAL,
  MANGA,
  LIGHT_NOVEL,
  VISUAL_NOVEL,
  VIDEO_GAME,
  OTHER,
}

export interface Anime {
  id: string;
  title: Title;
  format: Format;
  summary: string;
  status: Status;
  startDate: FuzzyDate;
  endDate: FuzzyDate;
  episodeCount: number;
  episodeLength: number;
  source: Source;
  poster: Poster;
  rating: Rating;
  trailers: Trailer[];
  mediaId: MediaId;
}
