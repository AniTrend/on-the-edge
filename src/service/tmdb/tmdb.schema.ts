import { z } from 'zod';

export const ConfigurationImagesSchema = z.object({
  base_url: z.string(),
  secure_base_url: z.string(),
  backdrop_sizes: z.array(z.string()),
  logo_sizes: z.array(z.string()),
  poster_sizes: z.array(z.string()),
  profile_sizes: z.array(z.string()),
  still_sizes: z.array(z.string()),
});

export const ConfigurationSchema = z.object({
  images: ConfigurationImagesSchema,
  change_keys: z.array(z.string()),
});

export const GenreSchema = z.object({
  id: z.number(),
  name: z.string(),
});

export const NetworkSchema = z.object({
  id: z.number(),
  logo_path: z.string().nullish(),
  name: z.string().nullish(),
  origin_country: z.string().nullish(),
});

export const ProductionCountrySchema = z.object({
  iso_3166_1: z.string(),
  name: z.string(),
});

export const ImageSchema = z.object({
  aspect_ratio: z.number().default(0),
  height: z.number().default(0),
  iso_639_1: z.string().nullish(),
  file_path: z.string(),
  vote_average: z.number().default(0),
  vote_count: z.number().default(0),
  width: z.number().default(0),
});

export const ImagesSchema = z.object({
  backdrops: z.array(ImageSchema).nullish().default([]),
  logos: z.array(ImageSchema).nullish().default([]),
  posters: z.array(ImageSchema).nullish().default([]),
});

export const EpisodeToAirSchema = z.object({
  id: z.number(),
  name: z.string(),
  overview: z.string().nullish(),
  vote_average: z.number().nullish(),
  vote_count: z.number().nullish(),
  air_date: z.string().nullish(),
  episode_number: z.number().nullish(),
  production_code: z.string().nullish(),
  runtime: z.number().nullish(),
  season_number: z.number().nullish(),
  show_id: z.number().nullish(),
  still_path: z.string().nullish(),
});

export const CrewSchema = z.object({
  job: z.string().nullish(),
  department: z.string().nullish(),
  credit_id: z.string(),
  adult: z.boolean().nullish(),
  gender: z.number().nullish(),
  id: z.number(),
  known_for_department: z.enum([
    'Acting',
    'Art',
    'Crew',
    'Directing',
    'Production',
    'Visual Effects',
    'Writing',
    'Editing',
    'Unknown',
  ]).catch('Unknown').nullish(),
  name: z.string(),
  original_name: z.string().nullish(),
  popularity: z.number().nullish(),
  profile_path: z.string().nullish(),
  character: z.string().nullish(),
  order: z.number().nullish(),
});

export const EpisodeSchema = z.object({
  air_date: z.string().nullish(),
  episode_number: z.number(),
  episode_type: z.string().or(z.literal('standard')).nullish(),
  id: z.number(),
  name: z.string(),
  overview: z.string().nullish(),
  production_code: z.string().nullish(),
  runtime: z.number().nullish(),
  season_number: z.number().nullish(),
  show_id: z.union([z.string(), z.number()]).nullish(),
  still_path: z.string().nullish(),
  vote_average: z.number().nullish(),
  vote_count: z.number().nullish(),
  crew: z.array(CrewSchema).nullish(),
  guest_stars: z.array(CrewSchema).nullish(),
});

export const SeasonSchema = z.object({
  air_date: z.string().nullish(),
  episode_count: z.number().nullish(),
  id: z.number(),
  name: z.string(),
  overview: z.string().nullish(),
  poster_path: z.string().nullish(),
  season_number: z.number(),
  episodes: z.array(EpisodeSchema).nullish(),
  images: ImagesSchema.nullish(),
});

export const SpokenLanguageSchema = z.object({
  english_name: z.string().nullish(),
  iso_639_1: z.string(),
  name: z.string(),
});

export const MovieCollectionSchema = z.object({
  id: z.number(),
  name: z.string(),
  poster_path: z.string().nullish(),
  backdrop_path: z.string().nullish(),
});

export const BaseSchema = z.object({
  adult: z.boolean().nullish(),
  backdrop_path: z.string().nullish(),
  genres: z.array(GenreSchema).nullish().default([]),
  homepage: z.string().nullish(),
  id: z.number(),
  languages: z.array(z.string()).nullish(),
  name: z.string(),
  networks: z.array(NetworkSchema).nullish().default([]),
  origin_country: z.array(z.string()).nullish(),
  original_language: z.string().nullish(),
  original_name: z.string().nullish(),
  overview: z.string().nullish(),
  popularity: z.number().nullish(),
  poster_path: z.string().nullish(),
  production_companies: z.array(NetworkSchema).nullish().default([]),
  production_countries: z.array(ProductionCountrySchema).nullish().default([]),
  spoken_languages: z.array(SpokenLanguageSchema).nullish().default([]),
  tagline: z.string().nullish(),
  vote_average: z.number().nullish(),
  vote_count: z.number().nullish(),
  images: ImagesSchema,
});

export const ShowSchema = BaseSchema.extend({
  episode_run_time: z.array(z.number()).nullish(),
  first_air_date: z.string().nullish(),
  in_production: z.boolean().nullish(),
  last_air_date: z.string().nullish(),
  last_episode_to_air: EpisodeToAirSchema.nullish(),
  next_episode_to_air: EpisodeToAirSchema.nullish(),
  number_of_episodes: z.number().nullish(),
  number_of_seasons: z.number().nullish(),
  seasons: z.array(SeasonSchema).nullish().default([]),
  status: z.string().nullish(),
});

export const MovieSchema = BaseSchema.extend({
  belongs_to_collection: MovieCollectionSchema.nullish(),
  budget: z.number().nullish(),
  imdb_id: z.string().nullish(),
  release_date: z.string().nullish(),
  revenue: z.number().nullish(),
  runtime: z.number().nullish(),
  title: z.string(),
  video: z.boolean().nullish(),
});

export const TmdbSchema = z.union([ShowSchema, MovieSchema]);
