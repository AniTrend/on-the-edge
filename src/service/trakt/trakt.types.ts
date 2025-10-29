import { z } from 'zod';
import {
  AirsSchema,
  EpisodeSchema,
  IdsSchema,
  SeasonSchema,
  ShowModelSchema,
} from './trakt.schema.ts';

export type TraktShow = z.infer<typeof ShowModelSchema>;
export type TraktSeason = z.infer<typeof SeasonSchema>;
export type TraktEpisode = z.infer<typeof EpisodeSchema>;
export type TraktIds = z.infer<typeof IdsSchema>;
export type TraktAirs = z.infer<typeof AirsSchema>;
