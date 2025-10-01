export type MalType = 'TV' | 'Manga';

/**
 * Enumerations derived from the Jikan v4 OpenAPI schema (or stable MAL canonical vocabularies).
 * We deliberately model them as string literal union types to keep tree‑shakable zero‑runtime cost.
 * Where the upstream API occasionally returns unexpected casing, we allow a broader fallback via union (e.g. capitalised variant) only when observed.
 */

// Title variant labels (empirically observed; OpenAPI does not strictly enumerate all)
export type MalTitleType =
  | 'Default'
  | 'English'
  | 'Japanese'
  | 'Synonym'
  | 'German'
  | 'Spanish'
  | 'French'
  | 'Italian'
  | 'Korean'
  | 'Chinese';

// Entity reference type discriminator (subset used in this project)
export type MalEntityRefType =
  | 'anime'
  | 'manga'
  | 'people'
  | 'person' // sometimes "person" appears in legacy caches
  | 'producer'
  | 'licensor'
  | 'studio'
  | 'character'
  | 'magazine';

// Audience rating (anime) (see anime_search_query_rating enum)
export type MalAudienceRating = 'g' | 'pg' | 'pg13' | 'r17' | 'r' | 'rx';

// Anime status (runtime detail field distinct from search filter vocab which uses "complete")
export type MalAnimeStatus =
  | 'Finished Airing'
  | 'Currently Airing'
  | 'Not yet aired';

// Manga status
export type MalMangaStatus =
  | 'Finished'
  | 'Publishing'
  | 'On Hiatus'
  | 'Discontinued'
  | 'Not yet published';

// Anime type (maps to anime_search_query_type; camelCase vs uppercase differences are kept as lowercase API form)
export type MalAnimeType =
  | 'TV'
  | 'Movie'
  | 'OVA'
  | 'Special'
  | 'ONA'
  | 'Music'
  | 'CM'
  | 'PV'
  | 'TV Special';

// Manga type (maps to manga_search_query_type – note MAL capitalisation for canonical responses)
export type MalMangaType =
  | 'Manga'
  | 'Novel'
  | 'Light Novel'
  | 'One-shot'
  | 'Doujinshi'
  | 'Manhwa'
  | 'Manhua';

// Source field (commonly observed values; not strictly enumerated in OpenAPI schema but widely stable)
export type MalSource =
  | 'Original'
  | 'Manga'
  | 'Light novel'
  | 'Novel'
  | 'Visual novel'
  | 'Web manga'
  | 'Web novel'
  | '4-koma manga'
  | 'Game'
  | 'Card game'
  | 'Book'
  | 'Radio'
  | 'Music'
  | 'Picture book'
  | 'Other';

// Season (lowercase per API e.g. "spring")
export type MalSeason = 'winter' | 'spring' | 'summer' | 'fall';

// Broadcast day (examples; MAL returns capitalised plural forms or null)
export type MalBroadcastDay =
  | 'Mondays'
  | 'Tuesdays'
  | 'Wednesdays'
  | 'Thursdays'
  | 'Fridays'
  | 'Saturdays'
  | 'Sundays';

/**
 * Base entity reference used across many array fields (producers, licensors, studios, genres, themes, demographics, authors, serializations, etc.).
 */
export interface MalEntityRef {
  mal_id: number;
  type: MalEntityRefType; // constrained entity reference type
  name: string;
  url: string;
}

/**
 * Title variant object (v4 exposes an array of objects with type & title)
 */
export interface MalTitleVariant {
  type: MalTitleType; // enumerated title variant types
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
  to: string | null; // ISO8601 or null
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
  day: MalBroadcastDay | null; // e.g. 'Sundays'
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
  rating?: MalAudienceRating | null; // audience rating code (lowercase compact form)
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
  source: MalSource | null; // origin/source material
  episodes: number | null;
  status: MalAnimeStatus | string; // include string fallback for unforeseen future statuses
  airing: boolean;
  aired: MalPeriod;
  duration: string | null; // e.g. '24 min per ep'
  season: MalSeason | null; // e.g. 'spring'
  year: number | null;
  broadcast?: MalBroadcast | null;
  producers?: MalEntityRef[];
  licensors?: MalEntityRef[];
  studios?: MalEntityRef[];
  genres?: MalEntityRef[];
  explicit_genres?: MalEntityRef[];
  themes?: MalEntityRef[];
  demographics?: MalEntityRef[];
  /** Optional flattened episodes list fetched from `/anime/{id}/episodes` */
  episodes_list?: AnimeEpisode[];
  /** Optional related entries (subset from `/anime/{id}/relations`) */
  relations?: MalRelation[];
  /** Optional theme info (openings/endings) from `/anime/{id}/themes` */
  theme?: AnimeTheme | null;
  /** External links from `/anime/{id}/external` */
  external?: ExternalLink[];
  /** Streaming links from `/anime/{id}/streaming` */
  streaming?: ExternalLink[];
  /** Characters (from `/anime/{id}/full`) */
  characters?: AnimeCharacter[];
  /** Staff members (from `/anime/{id}/full`) */
  staff?: AnimeStaffMember[];
  /** Indicates the episodes_list was truncated due to maxEpisodes policy. */
  episodes_truncated?: boolean;
}

/**
 * Manga-specific resource fields.
 */
export interface MangaResource extends MalResourceBase {
  chapters: number | null;
  volumes: number | null;
  status: MalMangaStatus | string; // allow future extension fallback
  publishing: boolean;
  published: MalPeriod;
  authors?: MalEntityRef[]; // authors & artists, typically people refs
  serializations?: MalEntityRef[];
  genres?: MalEntityRef[];
  explicit_genres?: MalEntityRef[];
  themes?: MalEntityRef[];
  demographics?: MalEntityRef[];
  /** Optional related entries (subset from `/manga/{id}/relations`) */
  relations?: MalRelation[];
  /** External links from `/manga/{id}/external` */
  external?: ExternalLink[];
  /** Characters (from `/manga/{id}/full`) */
  characters?: MangaCharacter[];
}

/** Episode information (flattened shape from `/anime/{id}/episodes`) */
export interface AnimeEpisode {
  mal_id: number; // episode id in MAL context
  url: string;
  title: string | null;
  title_japanese: string | null;
  title_romanji: string | null; // Jikan uses 'title_romanji'
  duration: number | null; // minutes
  aired: string | null; // ISO8601 date
  filler: boolean;
  recap: boolean;
  synopsis: string | null;
  score: number | null;
  /** Derived classification (main|special|ova|ona|other) - added downstream */
  kind?: string;
}

/** Relation entry (simplified) */
export interface MalRelationEntry {
  mal_id: number;
  type: MalEntityRefType;
  name: string;
  url: string;
}

export interface MalRelation {
  relation: string; // e.g. 'Sequel', 'Prequel'
  entry: MalRelationEntry[];
}

/** Theme info for anime (openings / endings). */
export interface AnimeTheme {
  openings: string[];
  endings: string[];
}

/** External link / streaming link minimal shape */
export interface ExternalLink {
  name: string; // provider/site name
  url: string;
}

/** Character reference used in character lists */
export interface CharacterRef {
  mal_id: number;
  url: string;
  images?: MalImages;
  name: string;
}

export interface PersonRef {
  mal_id: number;
  url: string;
  images?: MalImages;
  name: string;
}

export interface AnimeCharacter {
  character: CharacterRef;
  role: string; // e.g. 'Main' or 'Supporting'
}

export interface MangaCharacter {
  character: CharacterRef;
  role: string;
}

export interface AnimeStaffMember {
  person: PersonRef;
  positions: string[]; // e.g. ['Director', 'Script']
}

// NOTE: If additional endpoint-specific models are needed (e.g., relations, statistics), they can be added incrementally.
