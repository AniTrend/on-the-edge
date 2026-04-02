import z from 'zod';
import {
  AniListGraphQLErrorSchema,
  AniListMediaSchema,
  AniListMediaTypeSchema,
  AniListResponseSchema,
  AniListTitleSchema,
} from './anilist.schema.ts';

export type AniListMediaType = z.infer<typeof AniListMediaTypeSchema>;
export type AniListTitle = z.infer<typeof AniListTitleSchema>;
export type AniListMedia = z.infer<typeof AniListMediaSchema>;
export type AniListGraphQLError = z.infer<typeof AniListGraphQLErrorSchema>;
export type AniListResponse = z.infer<typeof AniListResponseSchema>;
