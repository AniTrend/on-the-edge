import { Instant } from '../../../../_shared/helpers/date.d.ts';
import { Format, Source, Status } from './enums.ts';

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

export interface Anime {
  id: string;
  title: Title;
  format: Format;
  summary: string;
  status: Status;
  startDate: Instant;
  endDate: Instant;
  episodeCount: number;
  episodeLength: number;
  source: Source;
  poster: Poster;
  rating: Rating;
  trailers: Trailer[];
  mediaId: MediaId;
}
