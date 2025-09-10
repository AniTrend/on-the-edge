import { RCF822Date } from '../../../common/types/core.ts';
import { TmdbDepartment } from './enums.ts';
import { Image, Images, Season, SpokenLanguage } from './remote/types.ts';

export type TmdbGenre = {
  id: number;
  name: string;
};

export interface TmdbEpisodeToAir {
  id: number;
  name: string;
  overview: string;
  vote_average: number;
  vote_count: number;
  air_date: RCF822Date;
  episode_number: number;
  production_code: string;
  runtime: number;
  season_number: number;
  show_id: number;
  still_path: null | string;
}

export interface TmdbNetwork {
  id: number;
  logo_path: null | string;
  name: string;
  origin_country: string;
}

export interface TmdbProductionCountry {
  iso_3166_1: string;
  name: string;
}

export type TmdbSeason = Season;

export type TmdbSpokenLanguage = SpokenLanguage;

export type TmdbImage = Image;

export type TmdbImages = Images;

export interface TmdbCrew {
  job?: string;
  department?: TmdbDepartment | string;
  credit_id: string;
  adult: boolean;
  gender: number;
  id: number;
  known_for_department: TmdbDepartment | string;
  name: string;
  original_name: string;
  popularity: number;
  profile_path: string | null;
  character?: string;
  order?: number;
}

export interface TmdbEpisode {
  air_date: string;
  episode_number: number;
  episode_type: string | 'standard';
  id: number;
  name: string;
  overview: string;
  production_code: string;
  runtime: number;
  season_number: number;
  show_id: string;
  still_path: string;
  vote_average: number;
  vote_count: number;
  crew: TmdbCrew[];
  guest_stars: TmdbCrew[];
}

export interface TmdbShow {
  adult: boolean;
  backdrop_path: string;
  episode_run_time: number[];
  first_air_date: RCF822Date;
  genres: TmdbGenre[];
  homepage: string;
  id: number;
  in_production: boolean;
  languages: string[];
  last_air_date: RCF822Date;
  last_episode_to_air: TmdbEpisodeToAir;
  name: string;
  next_episode_to_air: TmdbEpisodeToAir;
  networks: TmdbNetwork[];
  number_of_episodes: number;
  number_of_seasons: number;
  origin_country: string[];
  original_language: string;
  original_name: string;
  overview: string;
  popularity: number;
  poster_path: string;
  production_companies: TmdbNetwork[];
  production_countries: TmdbProductionCountry[];
  seasons: TmdbSeason[];
  spoken_languages: TmdbSpokenLanguage[];
  status: string;
  tagline: string;
  type: string;
  vote_average: number;
  vote_count: number;
  images: TmdbImages;
}

export interface TmdbMovie {
  adult: boolean;
  backdrop_path: string | null;
  belongs_to_collection: unknown | null;
  budget: number;
  genres: TmdbGenre[];
  homepage: string | null;
  id: number;
  imdb_id: string | null;
  original_language: string;
  original_title: string;
  overview: string;
  popularity: number;
  poster_path: string | null;
  production_companies: TmdbNetwork[];
  production_countries: TmdbProductionCountry[];
  release_date: RCF822Date;
  revenue: number;
  runtime: number | null;
  spoken_languages: TmdbSpokenLanguage[];
  status: string;
  tagline: string | null;
  title: string;
  video: boolean;
  vote_average: number;
  vote_count: number;
}
