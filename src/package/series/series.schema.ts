import { z } from 'zod';
import { Format, Source, Status } from '@scope/service/notify';
import { AnimeThemeSchema } from '@scope/service/theme';
import { JikanType } from '@scope/service/jikan';

const emptyToUndefined = (value: unknown) => {
  if (typeof value === 'string' && value.trim().length === 0) {
    return undefined;
  }
  return value;
};

export const SeriesQuerySchema = z.object({
  trakt: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().positive().optional(),
  ),
  slug: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
  tvdb: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().positive().optional(),
  ),
  tmdb: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().positive().optional(),
  ),
  notify: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
  anilist: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().positive().optional(),
  ),
  mal: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().positive().optional(),
  ),
});

export const SeriesIdSchema = z.object({
  anidb: z.number().nullish(),
  anilist: z.number().nullish(),
  animePlanet: z.string().nullish(),
  anisearch: z.number().nullish(),
  imdb: z.string().nullish(),
  kitsu: z.number().nullish(),
  livechart: z.number().nullish(),
  notify: z.string().nullish(),
  themoviedb: z.number().nullish(),
  tvdb: z.number().nullish(),
  myanimelist: z.number().nullish(),
  tvMazeId: z.number().nullish(),
  tvrage: z.string().nullish(),
  slug: z.string().nullish(),
  shoboi: z.number().nullish(),
  trakt: z.number().nullish(),
});

export const SeriesTitleSchema = z.object({
  english: z.string().nullish(),
  canonical: z.string().nullish(),
  harigana: z.string().nullish(),
  japanese: z.string().nullish(),
  romaji: z.string().nullish(),
  synonyms: z.array(z.string()).nullish(),
});

export const SeriesScheduleEpisodeSchema = z.object({
  id: z.number(),
  name: z.string(),
  overview: z.string().nullish(),
  airDate: z.number().nullish(),
  episodeNumber: z.number().nullish(),
  productionCode: z.string().nullish(),
  runtime: z.number().nullish(),
  seasonNumber: z.number().nullish(),
  tmdbId: z.number().nullish(),
  image: z.string().nullish(),
});

export const SeriesScheduleSchema = z.object({
  firstAirDate: z.number().nullish(),
  lastAirDate: z.number().nullish(),
  lastAiredEpisode: SeriesScheduleEpisodeSchema.nullish(),
  nextEpisodeToAir: SeriesScheduleEpisodeSchema.nullish(),
});

export const NetworkCategorySchema = z.enum(['DISTRIBUTION', 'PRODUCTION']);

export const SeriesNetworkSchema = z.object({
  id: z.number(),
  logoPath: z.string().nullish(),
  isPrimary: z.boolean(),
  name: z.string(),
  originCountry: z.string(),
  category: NetworkCategorySchema,
});

export const SeriesImageAttributesSchema = z.object({
  locale: z.string().nullish(),
  height: z.number(),
  width: z.number(),
  url: z.string(),
  type: z.enum(['BACKDROP', 'POSTER', 'LOGO']),
});

export const SeriesTrailerSchema = z.object({
  id: z.string(),
  site: z.string(),
  thumbnail: z.string().optional(),
});

export const SeriesCoverImageSchema = z.object({
  extraLarge: z.string().optional(),
  large: z.string().optional(),
  medium: z.string().optional(),
  color: z.string().optional(),
});

export const MediaKindSchema = z.enum(['ANIME', 'MANGA']);

export const MediaSchema = z.object({
  kind: MediaKindSchema,
  classification: z.custom<JikanType>().nullish(),
  mediaId: SeriesIdSchema,
  cover: SeriesCoverImageSchema,
  banner: z.string().nullish(),
  fanart: z.string().nullish(),
  format: z.custom<Format>().nullish(),
  status: z.custom<Status>().nullish(),
  source: z.custom<Source>().nullish(),
  title: SeriesTitleSchema,
  ageRating: z.string().nullish(),
  images: z.array(SeriesImageAttributesSchema),
  description: z.string().nullish(),
  updatedAt: z.number(),
  moreInfo: z.string().nullish(),
});

export const MangaMetadataSchema = z.object({
  chapters: z.number().nullish(),
  volumes: z.number().nullish(),
  publishedFrom: z.number().nullish(),
  publishedTo: z.number().nullish(),
});

export const AnimeMetadataSchema = z.object({
  themeSongs: z.array(AnimeThemeSchema),
  schedule: SeriesScheduleSchema.nullish(),
  trailers: z.array(SeriesTrailerSchema),
  networks: z.array(SeriesNetworkSchema),
  airedEpisodes: z.number().nullish(),
  broadcast: z.string().nullish(),
  isAdult: z.boolean().nullish(),
  homepage: z.string().nullish(),
  duration: z.number().nullish(),
});

export const MediaUnionSchema = MediaSchema
  .merge(AnimeMetadataSchema)
  .merge(MangaMetadataSchema);
