import { z } from 'zod';
import {
  AnimeEpisodeSchema,
  AnimeResourceSchema,
  AnimeStaffEntrySchema,
  AnimeStatusSchema,
  AnimeTypeSchema,
  BroadcastDaySchema,
  MalEntityTypeSchema,
  MangaResourceSchema,
  MangaStatusSchema,
  MangaTypeSchema,
  MediaSourceSchema,
  PersonResourceSchema,
  ProducerResourceSchema,
  SeasonSchema,
  TitleTypeSchema,
} from './jikan.schema.ts';

export type AnimeResource = z.infer<typeof AnimeResourceSchema>;
export type MangaResource = z.infer<typeof MangaResourceSchema>;
export type AnimeEpisode = z.infer<typeof AnimeEpisodeSchema>;
export type AnimeStaffEntry = z.infer<typeof AnimeStaffEntrySchema>;
export type ProducerResource = z.infer<typeof ProducerResourceSchema>;
export type PersonResource = z.infer<typeof PersonResourceSchema>;

export type TitleType = z.infer<typeof TitleTypeSchema>;
export type MalEntityType = z.infer<typeof MalEntityTypeSchema>;
export type BroadcastDay = z.infer<typeof BroadcastDaySchema>;
export type MediaSource = z.infer<typeof MediaSourceSchema>;
export type AnimeType = z.infer<typeof AnimeTypeSchema>;
export type AnimeStatus = z.infer<typeof AnimeStatusSchema>;
export type Season = z.infer<typeof SeasonSchema>;
export type MangaType = z.infer<typeof MangaTypeSchema>;
export type MangaStatus = z.infer<typeof MangaStatusSchema>;
