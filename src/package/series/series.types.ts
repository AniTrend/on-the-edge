import { SeriesQuerySchema } from './series.schema.ts';
import { z } from 'zod';
import {
  AnimeMetadataSchema,
  MangaMetadataSchema,
  MediaKindSchema,
  MediaSchema,
  MediaUnionSchema,
  NetworkCategorySchema,
  SeriesCoverImageSchema,
  SeriesIdSchema,
  SeriesImageAttributesSchema,
  SeriesNetworkSchema,
  SeriesScheduleEpisodeSchema,
  SeriesScheduleSchema,
  SeriesTitleSchema,
  SeriesTrailerSchema,
} from './series.schema.ts';

export type SeriesQuery = z.infer<typeof SeriesQuerySchema>;
export type SeriesId = z.infer<typeof SeriesIdSchema>;
export type SeriesTitle = z.infer<typeof SeriesTitleSchema>;
export type SeriesScheduleEpisode = z.infer<typeof SeriesScheduleEpisodeSchema>;
export type SeriesSchedule = z.infer<typeof SeriesScheduleSchema>;
export type NetworkCategory = z.infer<typeof NetworkCategorySchema>;
export type SeriesNetwork = z.infer<typeof SeriesNetworkSchema>;
export type SeriesImageAttributes = z.infer<typeof SeriesImageAttributesSchema>;
export type SeriesTrailer = z.infer<typeof SeriesTrailerSchema>;
export type SeriesCoverImage = z.infer<typeof SeriesCoverImageSchema>;
export type MediaKind = z.infer<typeof MediaKindSchema>;
export type Media = z.infer<typeof MediaSchema>;
export type MangaMetadata = z.infer<typeof MangaMetadataSchema>;
export type AnimeMetadata = z.infer<typeof AnimeMetadataSchema>;
export type MediaUnion = z.infer<typeof MediaUnionSchema>;
export type Series = MediaUnion & { id: string };
