import { MalType } from './enums.ts';

/**
 * Base entity reference used across many array fields (producers, licensors, studios, genres, themes, demographics, authors, serializations, etc.).
 */
export interface MalEntityRef {
  mal_id: number;
  type: string; // e.g. 'anime', 'manga', 'people', 'producer'
  name: string;
  url: string;
}

/**
 * Title variant object (v4 exposes an array of objects with type & title)
 */
export interface MalTitleVariant {
  type: string; // e.g. 'Default', 'English', 'Japanese', 'Synonym'
  title: string;
}

/**
 * Image variant set (jpg & webp share same structural fields)
 */
export interface MalImageVariant {
  image_url: string | null;
  small_image_url: string | null;
  large_image_url: string | null;
}

export interface MalImages {
  jpg: MalImageVariant;
  webp: MalImageVariant;
}

/**
 * Period range (aired / published) with granular date components.
 */
export interface MalPeriod {
  from: string | null; // ISO8601 or null
  to: string | null;   // ISO8601 or null
  prop: {
    from: { day: number | null; month: number | null; year: number | null };
    to: { day: number | null; month: number | null; year: number | null };
    string: string | null;
  };
}

/**
 * Trailer object (some nested thumbnails may appear – modelling minimally for now)
 */
export interface MalTrailerImages {
  image_url?: string | null;
  small_image_url?: string | null;
  medium_image_url?: string | null;
  large_image_url?: string | null;
  maximum_image_url?: string | null;
}

export interface MalTrailer {
  youtube_id: string | null;
  url: string | null;
  embed_url: string | null;
  images?: MalTrailerImages | null;
}

/**
 * Broadcast information for anime (may be null if unknown)
 */
export interface MalBroadcast {
  day: string | null; // e.g. 'Sundays'
  time: string | null; // e.g. '17:00'
  timezone: string | null; // e.g. 'Asia/Tokyo'
  string: string | null; // human-readable summary
}

/**
 * Shared resource base for anime & manga responses.
 * Fields default to null or empty according to Jikan conventions; we mark them optional to be defensive.
 */
export interface MalResourceBase {
  mal_id: number;
  url: string;
  approved: boolean;
  titles: MalTitleVariant[];
  images: MalImages;
  title: string;
  title_english: string | null;
  title_japanese: string | null;
  title_synonyms?: string[] | null;
  type: MalType; // numeric enum retained for compatibility within project (TV = 0, Manga = 1)
  score: number; // 0 if unknown
  scored_by: number;
  rank: number | null;
  popularity: number | null;
  members: number | null;
  favorites: number | null;
  synopsis: string | null;
  background: string | null;
  rating?: string | null; // e.g. 'PG-13'
  /**
   * Additional information text fetched from the `/moreinfo` endpoint.
   * Not part of the base payload – aggregated client-side.
   */
  moreinfo?: string | null;
}

/**
 * Anime-specific resource fields.
 */
export interface AnimeResource extends MalResourceBase {
  trailer: MalTrailer | null;
  source: string | null; // e.g. 'Original', 'Manga'
  episodes: number | null;
  status: string | 'Finished' | 'Airing';
  airing: boolean;
  aired: MalPeriod;
  duration: string | null; // e.g. '24 min per ep'
  season: string | null; // e.g. 'spring'
  year: number | null;
  broadcast?: MalBroadcast | null;
  producers?: MalEntityRef[];
  licensors?: MalEntityRef[];
  studios?: MalEntityRef[];
  genres?: MalEntityRef[];
  explicit_genres?: MalEntityRef[];
  themes?: MalEntityRef[];
  demographics?: MalEntityRef[];
}

/**
 * Manga-specific resource fields.
 */
export interface MangaResource extends MalResourceBase {
  chapters: number | null;
  volumes: number | null;
  status: string | 'Finished';
  publishing: boolean;
  published: MalPeriod;
  authors?: MalEntityRef[]; // authors & artists, typically people refs
  serializations?: MalEntityRef[];
  genres?: MalEntityRef[];
  explicit_genres?: MalEntityRef[];
  themes?: MalEntityRef[];
  demographics?: MalEntityRef[];
}

// NOTE: If additional endpoint-specific models are needed (e.g., relations, statistics), they can be added incrementally.
