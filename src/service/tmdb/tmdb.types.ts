import { z } from 'zod';
import type {
  ConfigurationSchema,
  CrewSchema,
  EpisodeSchema,
  EpisodeToAirSchema,
  GenreSchema,
  ImageSchema,
  ImagesSchema,
  MovieSchema,
  NetworkSchema,
  ProductionCountrySchema,
  SeasonSchema,
  ShowSchema,
  SpokenLanguageSchema,
  TmdbSchema,
} from './tmdb.schema.ts';

export type TmdbGenre = z.infer<typeof GenreSchema>;
export type TmdbEpisodeToAir = z.infer<typeof EpisodeToAirSchema>;
export type TmdbConfiguration = z.infer<typeof ConfigurationSchema>;
export type TmdbProductionCountry = z.infer<typeof ProductionCountrySchema>;
export type TmdbNetwork = z.infer<typeof NetworkSchema>;
export type TmdbShow = z.infer<typeof ShowSchema>;
export type TmdbSeason = z.infer<typeof SeasonSchema>;
export type TmdbCrew = z.infer<typeof CrewSchema>;
export type TmdbEpisode = z.infer<typeof EpisodeSchema>;
export type TmdbMovie = z.infer<typeof MovieSchema>;
export type TmdbImage = z.infer<typeof ImageSchema>;
export type TmdbImages = z.infer<typeof ImagesSchema>;
export type TmdbSpokenLanguage = z.infer<typeof SpokenLanguageSchema>;
export type Tmdb = z.infer<typeof TmdbSchema>;
