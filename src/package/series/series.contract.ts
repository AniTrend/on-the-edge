/**
 * Public OpenAPI contract schemas for the Series domain.
 *
 * These schemas define the stable, named OpenAPI components that
 * GraphQL Mesh consumes. They replace anonymous inline schemas
 * and opaque `z.custom<T>()` types with explicit, serializable
 * contract definitions.
 *
 * z.custom<T>() has been replaced with:
 *   - Explicit z.enum() for stable Notify enums (Format, Status, Source)
 *   - z.string() for volatile external Jikan types (JikanType)
 *
 * AnimeThemes nested schemas are mirrored here as contracts to
 * ensure stable naming regardless of upstream changes.
 */

import { z } from '@scope/common/openapi';

// ─── AnimeThemes (mirrored for stable naming) ─────────────────────

const AnimeThemesAudioContract = z.object({
  id: z.number(),
  link: z.string().url(),
}).openapi({
  title: 'AnimeThemesAudio',
  description: 'Audio resource for an anime theme',
});

const AnimeThemesVideoContract = z.object({
  id: z.number(),
  link: z.string().url(),
  resolution: z.number().nullable().optional(),
  nc: z.boolean(),
  subbed: z.boolean(),
  lyrics: z.boolean(),
  uncen: z.boolean(),
  source: z.string().nullable().optional(),
  overlap: z.string().nullable().optional(),
  tags: z.string().nullable().optional(),
  audio: AnimeThemesAudioContract.nullable().optional(),
}).openapi({
  title: 'AnimeThemesVideo',
  description: 'Video resource for an anime theme entry',
});

const AnimeThemesEntryContract = z.object({
  id: z.number(),
  version: z.number().nullable().optional(),
  episodes: z.string().nullable().optional(),
  nsfw: z.boolean(),
  spoiler: z.boolean(),
  notes: z.string().nullable().optional(),
  videos: z.array(AnimeThemesVideoContract).default([]),
}).openapi({
  title: 'AnimeThemesEntry',
  description: 'A single anime theme entry with version info and videos',
});

const AnimeThemesSongContract = z.object({
  id: z.number(),
  title: z.string().nullable().optional(),
}).openapi({
  title: 'AnimeThemesSong',
  description: 'Song metadata for an anime theme',
});

export const AnimeThemesContract = z.object({
  id: z.number(),
  type: z.enum(['OP', 'ED']).openapi({
    title: 'AnimeThemeType',
    description: 'Theme type classification (opening or ending)',
  }),
  sequence: z.number().nullable().optional(),
  slug: z.string(),
  animethemeentries: z.array(AnimeThemesEntryContract).default([]),
  song: AnimeThemesSongContract.nullable().optional(),
}).openapi({
  title: 'AnimeThemes',
  description: 'Opening or ending theme with entries and song metadata',
});

// ─── Notify enums (stable, mirrored from @scope/service/notify) ───

export const FormatContract = z.enum([
  'TV',
  'MOVIE',
  'SPECIAL',
  'OVA',
  'ONA',
]).openapi({
  title: 'SeriesFormat',
  description: 'Media format classification',
});
export const StatusContract = z.enum([
  'FINISHED',
  'RELEASING',
  'NOT_YET_RELEASED',
]).openapi({
  title: 'SeriesStatus',
  description: 'Current release status of the media',
});
export const SourceContract = z.enum([
  'ORIGINAL',
  'MANGA',
  'LIGHT_NOVEL',
  'VISUAL_NOVEL',
  'VIDEO_GAME',
  'OTHER',
]).openapi({
  title: 'SeriesSource',
  description: 'Original source material for the media',
});

// ─── Series nested schemas ────────────────────────────────────────

export const SeriesIdContract = z.object({
  anidb: z.number().nullable().optional(),
  anilist: z.number().nullable().optional(),
  animePlanet: z.string().nullable().optional(),
  anisearch: z.number().nullable().optional(),
  imdb: z.string().nullable().optional(),
  kitsu: z.number().nullable().optional(),
  livechart: z.number().nullable().optional(),
  notify: z.string().nullable().optional(),
  themoviedb: z.number().nullable().optional(),
  tvdb: z.number().nullable().optional(),
  myanimelist: z.number().nullable().optional(),
  tvMazeId: z.number().nullable().optional(),
  tvrage: z.string().nullable().optional(),
  slug: z.string().nullable().optional(),
  shoboi: z.number().nullable().optional(),
  trakt: z.number().nullable().optional(),
}).openapi({
  title: 'SeriesId',
  description: 'Provider identifiers for a media entity',
});

export const SeriesTitleContract = z.object({
  english: z.string().nullable().optional(),
  canonical: z.string().nullable().optional(),
  harigana: z.string().nullable().optional(),
  japanese: z.string().nullable().optional(),
  romaji: z.string().nullable().optional(),
  synonyms: z.array(z.string()).nullable().optional(),
}).openapi({
  title: 'SeriesTitle',
  description: 'Multi-language titles for a media entity',
});

export const SeriesScheduleEpisodeContract = z.object({
  id: z.number(),
  name: z.string(),
  overview: z.string().nullable().optional(),
  airDate: z.number().nullable().optional(),
  episodeNumber: z.number().nullable().optional(),
  productionCode: z.string().nullable().optional(),
  runtime: z.number().nullable().optional(),
  seasonNumber: z.number().nullable().optional(),
  tmdbId: z.number().nullable().optional(),
  image: z.string().nullable().optional(),
}).openapi({
  title: 'SeriesScheduleEpisode',
  description: 'A scheduled episode in the series',
});

export const SeriesScheduleContract = z.object({
  firstAirDate: z.number().nullable().optional(),
  lastAirDate: z.number().nullable().optional(),
  lastAiredEpisode: SeriesScheduleEpisodeContract.nullable().optional(),
  nextEpisodeToAir: SeriesScheduleEpisodeContract.nullable().optional(),
}).openapi({
  title: 'SeriesSchedule',
  description: 'Air date schedule for the series',
});

export const NetworkCategoryContract = z.enum([
  'DISTRIBUTION',
  'PRODUCTION',
]).openapi({
  title: 'SeriesNetworkCategory',
  description: 'Network role classification',
});

export const SeriesNetworkContract = z.object({
  id: z.number(),
  logoPath: z.string().nullable().optional(),
  isPrimary: z.boolean(),
  name: z.string(),
  originCountry: z.string(),
  category: NetworkCategoryContract,
}).openapi({
  title: 'SeriesNetwork',
  description: 'Network or streaming service associated with the series',
});

export const SeriesImageAttributesContract = z.object({
  locale: z.string().nullable().optional(),
  height: z.number(),
  width: z.number(),
  url: z.string(),
  type: z.enum(['BACKDROP', 'POSTER', 'LOGO']).openapi({
    title: 'SeriesImageType',
    description: 'Image type classification (backdrop, poster, or logo)',
  }),
}).openapi({
  title: 'SeriesImageAttributes',
  description: 'Image metadata including dimensions and type',
});

export const SeriesTrailerContract = z.object({
  id: z.string(),
  site: z.string(),
  thumbnail: z.string().optional(),
}).openapi({
  title: 'SeriesTrailer',
  description: 'Trailer resource link',
});

export const SeriesCoverImageContract = z.object({
  extraLarge: z.string().optional(),
  large: z.string().optional(),
  medium: z.string().optional(),
  color: z.string().optional(),
}).openapi({
  title: 'SeriesCoverImage',
  description: 'Cover image URLs at multiple sizes with dominant color',
});

export const MediaKindContract = z.enum(['ANIME', 'MANGA']).openapi({
  title: 'SeriesKind',
  description: 'Media type classification (anime or manga)',
});

export const MediaContract = z.object({
  kind: MediaKindContract,
  classification: z.string().nullable().optional(),
  mediaId: SeriesIdContract,
  cover: SeriesCoverImageContract,
  banner: z.string().nullable().optional(),
  fanart: z.string().nullable().optional(),
  format: FormatContract.nullable().optional(),
  status: StatusContract.nullable().optional(),
  source: SourceContract.nullable().optional(),
  title: SeriesTitleContract,
  ageRating: z.string().nullable().optional(),
  images: z.array(SeriesImageAttributesContract),
  description: z.string().nullable().optional(),
  updatedAt: z.number(),
  moreInfo: z.string().nullable().optional(),
}).openapi({
  title: 'Media',
  description: 'Core media entity with identifiers, metadata, and images',
});

export const MangaMetadataContract = z.object({
  chapters: z.number().nullable().optional(),
  volumes: z.number().nullable().optional(),
  publishedFrom: z.number().nullable().optional(),
  publishedTo: z.number().nullable().optional(),
}).openapi({
  title: 'MangaMetadata',
  description: 'Manga-specific metadata including chapter/volume counts',
});

export const AnimeMetadataContract = z.object({
  animethemes: z.array(AnimeThemesContract),
  schedule: SeriesScheduleContract.nullable().optional(),
  trailers: z.array(SeriesTrailerContract),
  networks: z.array(SeriesNetworkContract),
  airedEpisodes: z.number().nullable().optional(),
  broadcast: z.string().nullable().optional(),
  isAdult: z.boolean().nullable().optional(),
  homepage: z.string().nullable().optional(),
  duration: z.number().nullable().optional(),
}).openapi({
  title: 'AnimeMetadata',
  description:
    'Anime-specific metadata including themes, schedule, and trailers',
});

// ─── Top-level Series schema ──────────────────────────────────────

export const SeriesContract = MediaContract
  .merge(AnimeMetadataContract)
  .merge(MangaMetadataContract)
  .openapi({
    title: 'Series',
    description: 'Aggregated media entity from multiple sources',
  });
